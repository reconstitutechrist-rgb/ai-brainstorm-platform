import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { FileUploadService, upload } from '../services/fileUpload';
import { ReferenceAnalysisAgent } from '../agents/referenceAnalysis';
import { AdvancedSynthesisAgent } from '../agents/advancedSynthesisAgent';
import { EmbeddingService } from '../services/embeddingService';
import { isReferenceAnalysisResponse } from '../types';

const router = Router();
const fileUploadService = new FileUploadService();
const referenceAnalysisAgent = new ReferenceAnalysisAgent();
const synthesisAgent = new AdvancedSynthesisAgent();
const embeddingService = new EmbeddingService(supabase);

/**
 * Upload and analyze reference file
 */
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const { projectId, userId, description } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
      }

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and User ID required',
        });
      }

      // Validate file type
      if (!fileUploadService.isValidFileType(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
        });
      }

      console.log(`[ReferenceUpload] Processing file: ${file.originalname}, size: ${file.size} bytes`);

      // Extract content from file BEFORE uploading
      const { content, contentType, mediaType } = await fileUploadService.extractContent(file);
      console.log(`[ReferenceUpload] Extracted content: ${contentType}, length: ${content.length}${mediaType ? `, mediaType: ${mediaType}` : ''}`);

      // Upload to storage
      const { url, path: storagePath } = await fileUploadService.uploadToStorage(
        file,
        userId,
        projectId
      );

      // Get file category
      const fileCategory = fileUploadService.getFileCategory(file.mimetype);

      // Create reference record with extracted content
      const { data: reference, error: dbError } = await supabase
        .from('references')
        .insert([
          {
            project_id: projectId,
            user_id: userId,
            url: url,
            filename: file.originalname,
            analysis_status: 'pending',
            metadata: {
              description: description || '',
              mimeType: file.mimetype,
              storagePath: storagePath,
              fileSize: file.size,
              type: fileCategory,
              extractedContent: content,
              contentType: contentType,
              mediaType: mediaType,
            },
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      console.log(`[ReferenceUpload] Created reference ${reference.id}, starting analysis...`);

      // Start analysis in background
      analyzeFileInBackground(reference.id, url, fileCategory, content, contentType, mediaType);

      res.json({
        success: true,
        reference: reference,
        message: 'File uploaded successfully. Analysis in progress...',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || error.toString();
      console.error('Error details:', errorMessage);
      res.status(500).json({
        success: false,
        error: `Failed to upload file: ${errorMessage}`
      });
    }
  }
);

/**
 * Batch upload and analyze multiple reference files
 */
router.post(
  '/upload-batch',
  upload.array('files', 20),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { projectId, userId } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files provided' });
      }

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and User ID required',
        });
      }

      console.log(`[BatchUpload] Processing ${files.length} files for project ${projectId}`);

      const results = await Promise.allSettled(
        files.map(async (file) => {
          try {
            if (!fileUploadService.isValidFileType(file.mimetype)) {
              throw new Error(`Invalid file type: ${file.mimetype}`);
            }

            console.log(`[BatchUpload] Processing: ${file.originalname}, size: ${file.size} bytes`);

            const { content, contentType, mediaType } = await fileUploadService.extractContent(file);
            console.log(`[BatchUpload] Extracted ${contentType} content, length: ${content.length}${mediaType ? `, mediaType: ${mediaType}` : ''}`);

            const { url, path: storagePath } = await fileUploadService.uploadToStorage(
              file,
              userId,
              projectId
            );

            const fileCategory = fileUploadService.getFileCategory(file.mimetype);

            const { data: reference, error: dbError } = await supabase
              .from('references')
              .insert([
                {
                  project_id: projectId,
                  user_id: userId,
                  url: url,
                  filename: file.originalname,
                  analysis_status: 'pending',
                  metadata: {
                    description: '',
                    mimeType: file.mimetype,
                    storagePath: storagePath,
                    fileSize: file.size,
                    type: fileCategory,
                    extractedContent: content,
                    contentType: contentType,
                    mediaType: mediaType,
                  },
                },
              ])
              .select()
              .single();

            if (dbError) throw dbError;

            console.log(`[BatchUpload] Created reference ${reference.id}, starting analysis...`);

            analyzeFileInBackground(reference.id, url, fileCategory, content, contentType, mediaType);

            return {
              success: true,
              filename: file.originalname,
              reference: reference,
            };
          } catch (error: any) {
            console.error(`[BatchUpload] Error processing ${file.originalname}:`, error);
            return {
              success: false,
              filename: file.originalname,
              error: error.message || 'Unknown error',
            };
          }
        })
      );

      const uploadResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            filename: files[index].originalname,
            error: result.reason?.message || 'Upload failed',
          };
        }
      });

      const successCount = uploadResults.filter(r => r.success).length;
      const failureCount = uploadResults.filter(r => !r.success).length;

      console.log(`[BatchUpload] Completed: ${successCount} succeeded, ${failureCount} failed`);

      res.json({
        success: true,
        message: `Uploaded ${successCount}/${files.length} files successfully`,
        results: uploadResults,
        summary: {
          total: files.length,
          succeeded: successCount,
          failed: failureCount,
        },
      });
    } catch (error: any) {
      console.error('Batch upload error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to process batch upload: ${error.message || error.toString()}`,
      });
    }
  }
);

/**
 * Analyze file in background
 */
async function analyzeFileInBackground(
  referenceId: string,
  fileUrl: string,
  fileType: string,
  extractedContent?: string,
  contentType?: 'text' | 'image' | 'video',
  mediaType?: string
) {
  try {
    console.log(`[ReferenceAnalysis] Starting analysis for ${fileType} reference ${referenceId}`);
    console.log(`[ReferenceAnalysis] Content type: ${contentType}, content length: ${extractedContent?.length || 0}${mediaType ? `, mediaType: ${mediaType}` : ''}`);

    await supabase
      .from('references')
      .update({ analysis_status: 'processing' })
      .eq('id', referenceId);

    const analysis = await referenceAnalysisAgent.analyze(fileType, {
      url: fileUrl,
      type: fileType,
      extractedContent: extractedContent,
      contentType: contentType,
      mediaType: mediaType,
    });

    console.log(`[ReferenceAnalysis] Analysis completed, message length: ${analysis.message?.length || 0}`);

    let structuredAnalysis = null;
    if (contentType === 'image' && extractedContent) {
      try {
        console.log(`[ReferenceAnalysis] Generating structured analysis for selective recording`);
        const structuredResult = await referenceAnalysisAgent.analyzeImageStructured({
          extractedContent,
          contentType,
          mediaType,
        });
        if (isReferenceAnalysisResponse(structuredResult)) {
          structuredAnalysis = structuredResult.metadata.structuredAnalysis;
        }
        console.log(`[ReferenceAnalysis] Structured analysis generated`);
      } catch (error) {
        console.error(`[ReferenceAnalysis] Failed to generate structured analysis:`, error);
      }
    }

    const { data: currentRef } = await supabase
      .from('references')
      .select('metadata')
      .eq('id', referenceId)
      .single();

    await supabase
      .from('references')
      .update({
        analysis_status: 'completed',
        metadata: {
          ...(currentRef?.metadata || {}),
          analysis: analysis.message,
          structuredAnalysis,
          imageUrl: contentType === 'image' ? fileUrl : undefined,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    console.log(`[ReferenceAnalysis] ✅ ${fileType} analysis completed for reference ${referenceId}`);

    // Generate embedding from extracted content or analysis
    const contentToEmbed = extractedContent || analysis.message;
    if (contentToEmbed && contentToEmbed.trim().length > 0) {
      embeddingService.generateAndStoreReferenceEmbedding(referenceId, contentToEmbed)
        .then(() => {
          console.log(`[ReferenceAnalysis] ✅ Embedding generated for reference ${referenceId}`);
        })
        .catch((err: any) => {
          console.error(`[ReferenceAnalysis] ⚠️ Embedding generation failed for ${referenceId}:`, err);
        });
    } else {
      console.log(`[ReferenceAnalysis] ⏭️ Skipping embedding for ${referenceId} - no content`);
    }
  } catch (error) {
    console.error(`[ReferenceAnalysis] ❌ ${fileType} analysis error for ${referenceId}:`, error);
    await supabase
      .from('references')
      .update({ analysis_status: 'failed' })
      .eq('id', referenceId);
  }
}

/**
 * Get all references for a project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('references')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, references: data });
  } catch (error) {
    console.error('Get references error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch references' });
  }
});

/**
 * Get single reference with analysis
 */
router.get('/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;

    const { data, error } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (error) throw error;

    res.json({ success: true, reference: data });
  } catch (error) {
    console.error('Get reference error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reference' });
  }
});

/**
 * Phase 2.1: Find similar references using semantic search
 */
router.get('/:referenceId/find-similar', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { limit = 5, projectId } = req.query;

    console.log(`[FindSimilar] Finding similar references for ${referenceId}`);

    // Get the reference embedding
    const { data: refEmbedding, error: embError } = await supabase
      .from('reference_embeddings')
      .select('embedding, content_preview')
      .eq('reference_id', referenceId)
      .single();

    if (embError || !refEmbedding) {
      return res.status(404).json({
        success: false,
        error: 'Embedding not found for this reference. It may not have been analyzed yet.',
      });
    }

    console.log(`[FindSimilar] Found embedding for reference ${referenceId}`);

    // Get all embeddings (optionally filtered by project)
    let query = supabase
      .from('reference_embeddings')
      .select('reference_id, embedding, content_preview')
      .neq('reference_id', referenceId); // Exclude the query reference itself

    if (projectId) {
      // Join with references table to filter by project
      const { data: projectRefs } = await supabase
        .from('references')
        .select('id')
        .eq('project_id', projectId as string);

      if (projectRefs && projectRefs.length > 0) {
        const refIds = projectRefs.map(r => r.id);
        query = query.in('reference_id', refIds);
      }
    }

    const { data: allEmbeddings, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!allEmbeddings || allEmbeddings.length === 0) {
      return res.json({
        success: true,
        similar: [],
        message: 'No other references found to compare',
      });
    }

    console.log(`[FindSimilar] Comparing against ${allEmbeddings.length} embeddings`);

    // Calculate similarities
    const similarities = embeddingService.findMostSimilar(
      refEmbedding.embedding,
      allEmbeddings.map(e => ({
        id: e.reference_id,
        embedding: e.embedding,
        metadata: { contentPreview: e.content_preview },
      })),
      parseInt(limit as string)
    );

    // Fetch full reference details
    const referenceIds = similarities.map(s => s.id);
    const { data: references, error: refsError } = await supabase
      .from('references')
      .select('*')
      .in('id', referenceIds);

    if (refsError) throw refsError;

    // Merge similarities with reference data
    const results = similarities.map(sim => {
      const ref = references?.find(r => r.id === sim.id);
      return {
        reference: ref,
        similarity: sim.similarity,
        similarityPercentage: Math.round(sim.similarity * 100),
      };
    });

    console.log(`[FindSimilar] Found ${results.length} similar references`);

    res.json({
      success: true,
      similar: results,
      query: {
        referenceId,
        contentPreview: refEmbedding.content_preview,
      },
    });
  } catch (error: any) {
    console.error('[FindSimilar] Error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to find similar references: ${error.message}`,
    });
  }
});

/**
 * Phase 2.1: Semantic search across references
 */
router.post('/semantic-search', async (req: Request, res: Response) => {
  try {
    const { query, projectId, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    console.log(`[SemanticSearch] Searching for: "${query}"`);

    // Generate embedding for the search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get all embeddings (optionally filtered by project)
    let embQuery = supabase
      .from('reference_embeddings')
      .select('reference_id, embedding, content_preview');

    if (projectId) {
      const { data: projectRefs } = await supabase
        .from('references')
        .select('id')
        .eq('project_id', projectId);

      if (projectRefs && projectRefs.length > 0) {
        const refIds = projectRefs.map(r => r.id);
        embQuery = embQuery.in('reference_id', refIds);
      }
    }

    const { data: allEmbeddings, error: fetchError } = await embQuery;

    if (fetchError) throw fetchError;

    if (!allEmbeddings || allEmbeddings.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: 'No references found',
      });
    }

    console.log(`[SemanticSearch] Searching across ${allEmbeddings.length} embeddings`);

    // Find most similar
    const similarities = embeddingService.findMostSimilar(
      queryEmbedding,
      allEmbeddings.map(e => ({
        id: e.reference_id,
        embedding: e.embedding,
        metadata: { contentPreview: e.content_preview },
      })),
      parseInt(limit)
    );

    // Fetch full reference details
    const referenceIds = similarities.map(s => s.id);
    const { data: references, error: refsError } = await supabase
      .from('references')
      .select('*')
      .in('id', referenceIds);

    if (refsError) throw refsError;

    // Merge similarities with reference data
    const results = similarities.map(sim => {
      const ref = references?.find(r => r.id === sim.id);
      return {
        reference: ref,
        similarity: sim.similarity,
        similarityPercentage: Math.round(sim.similarity * 100),
        relevanceScore: sim.similarity > 0.8 ? 'high' : sim.similarity > 0.6 ? 'medium' : 'low',
      };
    });

    console.log(`[SemanticSearch] Found ${results.length} relevant references`);

    res.json({
      success: true,
      results,
      query,
    });
  } catch (error: any) {
    console.error('[SemanticSearch] Error:', error);
    res.status(500).json({
      success: false,
      error: `Semantic search failed: ${error.message}`,
    });
  }
});

/**
 * Retrigger analysis for a reference
 */
router.post('/:referenceId/retrigger-analysis', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;

    const { data: reference, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (fetchError) throw fetchError;

    if (!reference) {
      return res.status(404).json({ success: false, error: 'Reference not found' });
    }

    const fileType = reference.metadata?.type || 'unknown';
    const extractedContent = reference.metadata?.extractedContent;
    const contentType = reference.metadata?.contentType;
    const mediaType = reference.metadata?.mediaType;

    await supabase
      .from('references')
      .update({ analysis_status: 'pending' })
      .eq('id', referenceId);

    analyzeFileInBackground(reference.id, reference.url, fileType, extractedContent, contentType, mediaType);

    res.json({
      success: true,
      message: 'Analysis retriggered successfully',
    });
  } catch (error) {
    console.error('Retrigger analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrigger analysis' });
  }
});

/**
 * Retrigger analysis for ALL pending references in a project
 */
router.post('/project/:projectId/retrigger-all-pending', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data: pendingRefs, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .eq('project_id', projectId)
      .eq('analysis_status', 'pending');

    if (fetchError) throw fetchError;

    if (!pendingRefs || pendingRefs.length === 0) {
      return res.json({
        success: true,
        message: 'No pending references to retrigger',
        retriggered: 0,
      });
    }

    for (const ref of pendingRefs) {
      const fileType = ref.metadata?.type || 'unknown';
      const extractedContent = ref.metadata?.extractedContent;
      const contentType = ref.metadata?.contentType;
      const mediaType = ref.metadata?.mediaType;
      analyzeFileInBackground(ref.id, ref.url, fileType, extractedContent, contentType, mediaType);
    }

    res.json({
      success: true,
      message: `Retriggered analysis for ${pendingRefs.length} references`,
      retriggered: pendingRefs.length,
    });
  } catch (error) {
    console.error('Retrigger all pending error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrigger pending analyses' });
  }
});

/**
 * Delete reference
 */
router.delete('/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;

    const { data: reference, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (fetchError) throw fetchError;

    if (reference.metadata?.storagePath) {
      await fileUploadService.deleteFromStorage(reference.metadata.storagePath);
    }

    const { error: deleteError } = await supabase
      .from('references')
      .delete()
      .eq('id', referenceId);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Reference deleted successfully' });
  } catch (error) {
    console.error('Delete reference error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reference' });
  }
});

/**
 * Update reference tags
 */
router.patch('/:referenceId/tags', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Tags must be an array of strings',
      });
    }

    const { data, error } = await supabase
      .from('references')
      .update({ tags })
      .eq('id', referenceId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, reference: data });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ success: false, error: 'Failed to update tags' });
  }
});

/**
 * Toggle favorite status
 */
router.patch('/:referenceId/favorite', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { is_favorite } = req.body;

    if (typeof is_favorite !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_favorite must be a boolean',
      });
    }

    const { data, error } = await supabase
      .from('references')
      .update({ is_favorite })
      .eq('id', referenceId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, reference: data });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle favorite' });
  }
});

/**
 * Synthesize multiple references
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { referenceIds, projectId } = req.body;

    if (!referenceIds || !Array.isArray(referenceIds) || referenceIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 reference IDs are required',
      });
    }

    console.log(`[Synthesize] Processing ${referenceIds.length} references`);

    const { data: references, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .in('id', referenceIds);

    if (fetchError) throw fetchError;

    if (!references || references.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No references found',
      });
    }

    const analyses = references
      .filter(ref => ref.analysis_status === 'completed' && ref.metadata?.analysis)
      .map(ref => ({
        filename: ref.filename,
        analysis: ref.metadata.analysis,
        type: ref.metadata?.type,
      }));

    if (analyses.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 completed analyses are required',
      });
    }

    const result = await synthesisAgent.synthesize(analyses);

    console.log(`[Synthesize] ✅ Synthesis complete`);

    res.json({
      success: true,
      synthesis: result.synthesis,
      conflicts: result.conflicts,
      keyThemes: result.keyThemes,
    });
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to synthesize references: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Compare two references
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { referenceId1, referenceId2 } = req.body;

    if (!referenceId1 || !referenceId2) {
      return res.status(400).json({
        success: false,
        error: 'Two reference IDs are required',
      });
    }

    const { data: references, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .in('id', [referenceId1, referenceId2]);

    if (fetchError) throw fetchError;

    if (!references || references.length !== 2) {
      return res.status(404).json({
        success: false,
        error: 'Could not find both references',
      });
    }

    const [ref1, ref2] = references;

    if (!ref1.metadata?.analysis || !ref2.metadata?.analysis) {
      return res.status(400).json({
        success: false,
        error: 'Both references must have completed analyses',
      });
    }

    const result = await synthesisAgent.compare(
      {
        filename: ref1.filename,
        analysis: ref1.metadata.analysis,
      },
      {
        filename: ref2.filename,
        analysis: ref2.metadata.analysis,
      }
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Compare error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to compare references: ${error.message || error.toString()}`,
    });
  }
});

export default router;
