import { Router } from 'express';
import { GeneratedDocumentsService } from '../services/generatedDocumentsService';
import { getSupabaseClient } from '../config/supabase';
import '../types'; // Import type extensions

const router = Router();

/**
 * GET /api/generated-documents/project/:projectId
 * Get all generated documents for a project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const documents = await service.getByProject(projectId);

    res.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error('Get generated documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch generated documents',
    });
  }
});

/**
 * GET /api/generated-documents/:documentId
 * Get a specific generated document by ID
 */
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const document = await service.getById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Get generated document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch generated document',
    });
  }
});

/**
 * POST /api/generated-documents/generate
 * Generate or regenerate all documents for a project
 */
router.post('/generate', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      });
    }

    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const documents = await service.generateDocuments(projectId);

    res.json({
      success: true,
      documents,
      message: 'Documents generated successfully',
    });
  } catch (error: any) {
    console.error('Generate documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate documents',
    });
  }
});

/**
 * DELETE /api/generated-documents/:documentId
 * Delete a generated document
 */
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    await service.delete(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete generated document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document',
    });
  }
});

export default router;
