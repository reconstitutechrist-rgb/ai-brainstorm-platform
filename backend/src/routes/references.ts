import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { FileUploadService, upload } from '../services/fileUpload';
import { ReferenceAnalysisAgent } from '../agents/referenceAnalysis';
import { SynthesisAgent } from '../agents/synthesisAgent';
import { EmbeddingService } from '../services/embeddingService';

const router = Router();
const fileUploadService = new FileUploadService();
const referenceAnalysisAgent = new ReferenceAnalysisAgent();
const synthesisAgent = new SynthesisAgent();
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
      const { content, contentType } = await fileUploadService.extractContent(file);
      console.log(`[ReferenceUpload] Extracted content: ${contentType}, length: ${content.length}`);

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
            url: url, // Changed from file_url to match database schema
            filename: file.originalname,
            analysis_status: 'pending',
            metadata: {
              description: description || '',
              mimeType: file.mimetype,
              storagePath: storagePath,
              fileSize: file.size,
              type: fileCategory, // Moved type into metadata since column doesn't exist
              extractedContent: content, // Store extracted content
              contentType: contentType, // Store content type
            },
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      console.log(`[ReferenceUpload] Created reference ${reference.id}, starting analysis...`);

      // Start analysis in background (don't wait) - now passes extracted content
      analyzeFileInBackground(reference.id, url, fileCategory, content, contentType);

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
  upload.array('files', 20), // Allow up to 20 files at once
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
            // Validate file type
            if (!fileUploadService.isValidFileType(file.mimetype)) {
              throw new Error(`Invalid file type: ${file.mimetype}`);
            }

            console.log(`[BatchUpload] Processing: ${file.originalname}, size: ${file.size} bytes`);

            // Extract content from file
            const { content, contentType } = await fileUploadService.extractContent(file);
            console.log(`[BatchUpload] Extracted ${contentType} content, length: ${content.length}`);

            // Upload to storage
            const { url, path: storagePath } = await fileUploadService.uploadToStorage(
              file,
              userId,
              projectId
            );

            // Get file category
            const fileCategory = fileUploadService.getFileCategory(file.mimetype);

            // Create reference record
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
                  },
                },
              ])
              .select()
              .single();

            if (dbError) throw dbError;

            console.log(`[BatchUpload] Created reference ${reference.id}, starting analysis...`);

            // Start analysis in background
            analyzeFileInBackground(reference.id, url, fileCategory, content, contentType);

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

      // Format results
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
 * Analyze file in background (supports all file types)
 */
async function analyzeFileInBackground(
  referenceId: string,
  fileUrl: string,
  fileType: string,
  extractedContent?: string,
  contentType?: 'text' | 'image' | 'video'
) {
  try {
    console.log(`[ReferenceAnalysis] Starting analysis for ${fileType} reference ${referenceId}`);
    console.log(`[ReferenceAnalysis] Content type: ${contentType}, content length: ${extractedContent?.length || 0}`);

    // Update status to processing
    await supabase
      .from('references')
      .update({ analysis_status: 'processing' })
      .eq('id', referenceId);

    // Perform analysis based on file type with extracted content
    const analysis = await referenceAnalysisAgent.analyze(fileType, {
      url: fileUrl,
      type: fileType,
      extractedContent: extractedContent,
      contentType: contentType,
    });

    console.log(`[ReferenceAnalysis] Analysis completed, message length: ${analysis.message?.length || 0}`);

    // Update reference with analysis results
    // Get current metadata
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
          analysis: analysis.message, // Store analysis in metadata
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    console.log(`[ReferenceAnalysis] ✅ ${fileType} analysis completed for reference ${referenceId}`);

    // Generate embedding from extracted content or analysis (Phase 3.3)
    const contentToEmbed = extractedContent || analysis.message;
    if (contentToEmbed && contentToEmbed.trim().length > 0) {
      embeddingService.generateAndStoreReferenceEmbedding(referenceId, contentToEmbed)
        .then(() => {
          console.log(`[ReferenceAnalysis] ✅ Embedding generated for reference ${referenceId}`);
        })
        .catch((err) => {
          console.error(`[ReferenceAnalysis] ⚠️ Embedding generation failed for ${referenceId}:`, err);
          // Don't fail the whole analysis if embedding generation fails
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
 * Retrigger analysis for a reference (useful for stuck "pending" files)
 */
router.post('/:referenceId/retrigger-analysis', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;

    // Get reference
    const { data: reference, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (fetchError) throw fetchError;

    if (!reference) {
      return res.status(404).json({ success: false, error: 'Reference not found' });
    }

    // Get file type from metadata
    const fileType = reference.metadata?.type || 'unknown';
    const extractedContent = reference.metadata?.extractedContent;
    const contentType = reference.metadata?.contentType;

    // Reset status to pending
    await supabase
      .from('references')
      .update({ analysis_status: 'pending' })
      .eq('id', referenceId);

    // Retrigger analysis with extracted content if available
    analyzeFileInBackground(reference.id, reference.url, fileType, extractedContent, contentType);

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

    // Get all pending references
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

    // Retrigger analysis for each with extracted content if available
    for (const ref of pendingRefs) {
      const fileType = ref.metadata?.type || 'unknown';
      const extractedContent = ref.metadata?.extractedContent;
      const contentType = ref.metadata?.contentType;
      analyzeFileInBackground(ref.id, ref.url, fileType, extractedContent, contentType);
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

    // Get reference to find storage path
    const { data: reference, error: fetchError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (reference.metadata?.storagePath) {
      await fileUploadService.deleteFromStorage(reference.metadata.storagePath);
    }

    // Delete from database
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
 * Synthesize multiple references into a single analysis
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

    // Fetch all references
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

    // Prepare analyses for synthesis
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

    // Generate synthesis
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

    // Fetch both references
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

    // Compare references
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

/**
 * Phase 4.2: Analyze reference with project context (Mode 2)
 * Compares reference content against project decisions to find conflicts/confirmations
 */
router.post('/:referenceId/analyze-with-context', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required in request body',
      });
    }

    console.log(`[ContextAnalysis] Analyzing reference ${referenceId} against project ${projectId}`);

    // Fetch the reference
    const { data: reference, error: refError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (refError) throw refError;

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'Reference not found',
      });
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Fetch project canvas items (decided and exploring)
    const { data: canvasItems, error: canvasError } = await supabase
      .from('project_canvas')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['decided', 'exploring']);

    if (canvasError) throw canvasError;

    const decidedItems = canvasItems?.filter(item => item.status === 'decided') || [];
    const exploringItems = canvasItems?.filter(item => item.status === 'exploring') || [];

    console.log(`[ContextAnalysis] Project context: ${decidedItems.length} decided, ${exploringItems.length} exploring`);

    // Get file type and content
    const fileType = reference.metadata?.type || 'unknown';
    const extractedContent = reference.metadata?.extractedContent;
    const contentType = reference.metadata?.contentType;

    // Call the analyzeWithContext method
    const analysis = await referenceAnalysisAgent.analyzeWithContext(
      fileType,
      {
        url: reference.url,
        type: fileType,
        extractedContent: extractedContent,
        contentType: contentType,
      },
      {
        decidedItems: decidedItems,
        exploringItems: exploringItems,
        projectTitle: project?.title || 'Untitled Project',
      }
    );

    console.log(`[ContextAnalysis] Analysis completed`);

    // Parse the contextual analysis from metadata
    let parsedContext: any = null;
    try {
      if (analysis.metadata?.contextualAnalysis) {
        // Try to extract JSON from the response
        const jsonMatch = analysis.metadata.contextualAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContext = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (parseError) {
      console.warn('[ContextAnalysis] Failed to parse JSON response:', parseError);
    }

    // Update reference metadata with context analysis
    const { data: currentRef } = await supabase
      .from('references')
      .select('metadata')
      .eq('id', referenceId)
      .single();

    await supabase
      .from('references')
      .update({
        metadata: {
          ...(currentRef?.metadata || {}),
          contextAnalysis: parsedContext || {
            conflicts: [],
            confirmations: [],
            newInsights: [],
            rawResponse: analysis.metadata?.contextualAnalysis,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    console.log(`[ContextAnalysis] ✅ Context analysis completed for reference ${referenceId}`);

    res.json({
      success: true,
      contextAnalysis: parsedContext || {
        conflicts: [],
        confirmations: [],
        newInsights: [],
      },
      message: 'Context-aware analysis completed successfully',
    });
  } catch (error: any) {
    console.error('[ContextAnalysis] Error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to analyze with context: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Phase 4.2: Analyze reference with specialized template (Mode 3)
 * Uses predefined templates for structured extraction
 */
router.post('/:referenceId/analyze-with-template', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'templateId is required in request body',
      });
    }

    console.log(`[TemplateAnalysis] Analyzing reference ${referenceId} with template ${templateId}`);

    // Fetch the reference
    const { data: reference, error: refError } = await supabase
      .from('references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (refError) throw refError;

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'Reference not found',
      });
    }

    // Get file type and content
    const fileType = reference.metadata?.type || 'unknown';
    const extractedContent = reference.metadata?.extractedContent;
    const contentType = reference.metadata?.contentType;

    // Call the analyzeWithTemplate method
    const analysis = await referenceAnalysisAgent.analyzeWithTemplate(
      fileType,
      {
        url: reference.url,
        type: fileType,
        extractedContent: extractedContent,
        contentType: contentType,
      },
      templateId
    );

    console.log(`[TemplateAnalysis] Analysis completed with template ${templateId}`);

    // Update reference metadata with template analysis
    const { data: currentRef } = await supabase
      .from('references')
      .select('metadata')
      .eq('id', referenceId)
      .single();

    await supabase
      .from('references')
      .update({
        metadata: {
          ...(currentRef?.metadata || {}),
          templateAnalysis: {
            templateId: analysis.metadata?.templateUsed?.id,
            templateName: analysis.metadata?.templateUsed?.name,
            templateType: analysis.metadata?.templateUsed?.type,
            outputFormat: analysis.metadata?.outputFormat,
            structuredData: analysis.metadata?.structuredData,
            analysisResult: analysis.message,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', referenceId);

    console.log(`[TemplateAnalysis] ✅ Template analysis completed for reference ${referenceId}`);

    res.json({
      success: true,
      templateAnalysis: {
        templateInfo: analysis.metadata?.templateUsed,
        outputFormat: analysis.metadata?.outputFormat,
        structuredData: analysis.metadata?.structuredData,
        result: analysis.message,
      },
      message: 'Template-based analysis completed successfully',
    });
  } catch (error: any) {
    console.error('[TemplateAnalysis] Error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to analyze with template: ${error.message || error.toString()}`,
    });
  }
});

export default router;
