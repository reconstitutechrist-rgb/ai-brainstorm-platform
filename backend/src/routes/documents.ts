import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { FileUploadService, upload } from '../services/fileUpload';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

      console.log(`[DocumentUpload] Processing file: ${file.originalname}, size: ${file.size} bytes`);

      // Extract content from file BEFORE uploading
      const { content, contentType } = await fileUploadService.extractContent(file);
      console.log(`[DocumentUpload] Extracted content: ${contentType}, length: ${content.length}`);

      // Upload to storage (using 'documents' bucket)
      const { url, path: storagePath } = await fileUploadService.uploadToStorage(
        file,
        userId,
        projectId,
        'documents'  // Use documents bucket instead of references
      );

      // Create document record with extracted content
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
              extractedContent: content,  // Store extracted content
              contentType: contentType,   // Store content type
              content: content,            // Also store as 'content' for consistency with conversational service
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

/**
 * Re-extract content for a document (useful for backfilling existing documents)
 */
router.post('/:documentId/extract-content', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    console.log(`[DocumentBackfill] Starting content extraction for document ${documentId}`);

    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check if content already extracted
    if (document.metadata?.content || document.metadata?.extractedContent) {
      console.log(`[DocumentBackfill] Document ${documentId} already has extracted content`);
      return res.json({
        success: true,
        message: 'Content already extracted',
        document: document
      });
    }

    // Download file from storage
    const storagePath = document.metadata?.storagePath;
    if (!storagePath) {
      return res.status(400).json({
        success: false,
        error: 'Document has no storage path'
      });
    }

    console.log(`[DocumentBackfill] Downloading file from storage: ${storagePath}`);

    // Download from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError) {
      console.error(`[DocumentBackfill] Download error:`, downloadError);
      throw downloadError;
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write buffer to temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `backfill-${Date.now()}-${document.filename}`);
    await fs.writeFile(tempFilePath, buffer);

    console.log(`[DocumentBackfill] Wrote ${buffer.length} bytes to temp file: ${tempFilePath}`);

    // Create a temporary file object for extraction
    const tempFile = {
      path: tempFilePath,
      originalname: document.filename,
      mimetype: document.file_type,
      size: buffer.length
    } as Express.Multer.File;

    console.log(`[DocumentBackfill] Extracting content from ${document.filename}`);

    try {
      // Extract content
      const { content, contentType } = await fileUploadService.extractContent(tempFile);

      console.log(`[DocumentBackfill] Extracted ${content.length} characters of ${contentType} content`);

      // Update document metadata with extracted content
      const { data: updatedDocument, error: updateError } = await supabase
        .from('documents')
        .update({
          metadata: {
            ...document.metadata,
            extractedContent: content,
            contentType: contentType,
            content: content,  // Also store as 'content' for consistency
            contentExtractedAt: new Date().toISOString()
          }
        })
        .eq('id', documentId)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log(`[DocumentBackfill] Successfully extracted content for document ${documentId}`);

      res.json({
        success: true,
        message: 'Content extracted successfully',
        document: updatedDocument,
        contentLength: content.length,
        contentType: contentType
      });
    } finally {
      // Always clean up temp file
      try {
        await fs.unlink(tempFilePath);
        console.log(`[DocumentBackfill] Cleaned up temp file: ${tempFilePath}`);
      } catch (unlinkError) {
        console.warn(`[DocumentBackfill] Failed to cleanup temp file: ${tempFilePath}`, unlinkError);
      }
    }
  } catch (error) {
    console.error('[DocumentBackfill] Extract content error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract content'
    });
  }
});

/**
 * Batch re-extract content for all documents in a project
 */
router.post('/project/:projectId/extract-all-content', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`[DocumentBackfill] Starting batch content extraction for project ${projectId}`);

    // Get all documents for project
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) throw fetchError;

    if (!documents || documents.length === 0) {
      return res.json({
        success: true,
        message: 'No documents found for this project',
        results: []
      });
    }

    console.log(`[DocumentBackfill] Found ${documents.length} documents to process`);

    const results = [];

    // Process each document
    for (const document of documents) {
      try {
        // Skip if already has content
        if (document.metadata?.content || document.metadata?.extractedContent) {
          console.log(`[DocumentBackfill] Skipping ${document.filename} - already has content`);
          results.push({
            documentId: document.id,
            filename: document.filename,
            status: 'skipped',
            message: 'Already has extracted content'
          });
          continue;
        }

        const storagePath = document.metadata?.storagePath;
        if (!storagePath) {
          console.log(`[DocumentBackfill] Skipping ${document.filename} - no storage path`);
          results.push({
            documentId: document.id,
            filename: document.filename,
            status: 'error',
            message: 'No storage path'
          });
          continue;
        }

        // Download from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(storagePath);

        if (downloadError) {
          console.error(`[DocumentBackfill] Download error for ${document.filename}:`, downloadError);
          results.push({
            documentId: document.id,
            filename: document.filename,
            status: 'error',
            message: `Download failed: ${downloadError.message}`
          });
          continue;
        }

        // Convert to buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Write buffer to temporary file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `backfill-batch-${Date.now()}-${document.filename}`);
        await fs.writeFile(tempFilePath, buffer);

        // Create temp file object
        const tempFile = {
          path: tempFilePath,
          originalname: document.filename,
          mimetype: document.file_type,
          size: buffer.length
        } as Express.Multer.File;

        try {
          // Extract content
          const { content, contentType } = await fileUploadService.extractContent(tempFile);

          // Update document
          await supabase
            .from('documents')
            .update({
              metadata: {
                ...document.metadata,
                extractedContent: content,
                contentType: contentType,
                content: content,
                contentExtractedAt: new Date().toISOString()
              }
            })
            .eq('id', document.id);

          console.log(`[DocumentBackfill] Successfully extracted ${content.length} characters from ${document.filename}`);

          results.push({
            documentId: document.id,
            filename: document.filename,
            status: 'success',
            contentLength: content.length,
            contentType: contentType
          });
        } finally {
          // Always clean up temp file
          try {
            await fs.unlink(tempFilePath);
          } catch (unlinkError) {
            console.warn(`[DocumentBackfill] Failed to cleanup temp file: ${tempFilePath}`);
          }
        }
      } catch (error) {
        console.error(`[DocumentBackfill] Error processing ${document.filename}:`, error);
        results.push({
          documentId: document.id,
          filename: document.filename,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`[DocumentBackfill] Batch complete: ${successCount} successful, ${errorCount} errors, ${skippedCount} skipped`);

    res.json({
      success: true,
      message: `Batch extraction complete: ${successCount} successful, ${errorCount} errors, ${skippedCount} skipped`,
      results: results,
      summary: {
        total: documents.length,
        successful: successCount,
        errors: errorCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('[DocumentBackfill] Batch extract error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to batch extract content'
    });
  }
});

export default router;
