import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { FileUploadService, upload } from '../services/fileUpload';
import { ReferenceAnalysisAgent } from '../agents/referenceAnalysis';

const router = Router();
const fileUploadService = new FileUploadService();
const referenceAnalysisAgent = new ReferenceAnalysisAgent();

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
            url: url, // Changed from file_url to match database schema
            filename: file.originalname,
            analysis_status: 'pending',
            metadata: {
              description: description || '',
              mimeType: file.mimetype,
              storagePath: storagePath,
              fileSize: file.size,
              type: fileCategory, // Moved type into metadata since column doesn't exist
            },
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Start analysis in background (don't wait) - now supports all file types
      analyzeFileInBackground(reference.id, url, fileCategory);

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
 * Analyze file in background (supports all file types)
 */
async function analyzeFileInBackground(
  referenceId: string,
  fileUrl: string,
  fileType: string
) {
  try {
    console.log(`[ReferenceAnalysis] Starting analysis for ${fileType} reference ${referenceId}`);

    // Update status to processing
    await supabase
      .from('references')
      .update({ analysis_status: 'processing' })
      .eq('id', referenceId);

    // Perform analysis based on file type
    const analysis = await referenceAnalysisAgent.analyze(fileType, {
      url: fileUrl,
      type: fileType,
    });

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

    console.log(`[ReferenceAnalysis] ${fileType} analysis completed for reference ${referenceId}`);
  } catch (error) {
    console.error(`[ReferenceAnalysis] ${fileType} analysis error:`, error);
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

    // Reset status to pending
    await supabase
      .from('references')
      .update({ analysis_status: 'pending' })
      .eq('id', referenceId);

    // Retrigger analysis
    analyzeFileInBackground(reference.id, reference.url, fileType);

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

    // Retrigger analysis for each
    for (const ref of pendingRefs) {
      const fileType = ref.metadata?.type || 'unknown';
      analyzeFileInBackground(ref.id, ref.url, fileType);
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

export default router;
