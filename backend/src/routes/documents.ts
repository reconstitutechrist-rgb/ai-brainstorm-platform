import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { FileUploadService, upload } from '../services/fileUpload';

const router = Router();
const fileUploadService = new FileUploadService();

/**
 * Create new folder
 */
router.post('/folders', async (req: Request, res: Response) => {
  try {
    const { projectId, name, userId } = req.body;

    if (!projectId || !name || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, name, userId'
      });
    }

    const { data, error } = await supabase
      .from('document_folders')
      .insert([{
        project_id: projectId,
        name,
        user_id: userId
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, folder: data });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create folder'
    });
  }
});

/**
 * Upload document
 */
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const { projectId, userId, folderId, description } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: projectId, userId'
        });
      }

      // Upload to storage (using 'documents' bucket)
      const { url, path: storagePath } = await fileUploadService.uploadToStorage(
        file,
        userId,
        projectId,
        'documents'  // Use documents bucket instead of references
      );

      // Create document record
      const { data: document, error } = await supabase
        .from('documents')
        .insert([
          {
            project_id: projectId,
            user_id: userId,
            folder_id: folderId || null,
            file_url: url,
            filename: file.originalname,
            file_size: file.size,
            file_type: file.mimetype,
            description: description || '',
            metadata: {
              storagePath: storagePath,
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
            },
          },
        ])
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, document });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      });
    }
  }
);

/**
 * Get all documents for project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, documents: data || [] });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

/**
 * Get all folders for project
 */
router.get('/folders/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('document_folders')
      .select('*, documents:documents(count)')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, folders: data || [] });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folders'
    });
  }
});

/**
 * Update folder
 */
router.patch('/folders/:folderId', async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    const { data, error } = await supabase
      .from('document_folders')
      .update({ name })
      .eq('id', folderId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, folder: data });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update folder'
    });
  }
});

/**
 * Delete folder
 */
router.delete('/folders/:folderId', async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;

    // Check if folder has documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('folder_id', folderId);

    if (documents && documents.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete folder with documents. Move or delete documents first.'
      });
    }

    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;

    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete folder'
    });
  }
});

/**
 * Update document
 */
router.patch('/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { folderId, description } = req.body;

    const updates: any = {};
    if (folderId !== undefined) updates.folder_id = folderId;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, document: data });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
});

/**
 * Delete document
 */
router.delete('/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    // Get document to find storage path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete from storage (using 'documents' bucket)
    if (document.metadata?.storagePath) {
      try {
        await fileUploadService.deleteFromStorage(document.metadata.storagePath, 'documents');
      } catch (storageError) {
        console.error('Storage deletion warning:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

/**
 * Get document by ID
 */
router.get('/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const { data, error } = await supabase
      .from('documents')
      .select('*, folder:document_folders(*)')
      .eq('id', documentId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({ success: true, document: data });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    });
  }
});

export default router;
