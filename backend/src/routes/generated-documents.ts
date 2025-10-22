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
 * POST /api/generated-documents/generate-from-research
 * Generate a document from research query results (Phase 3.1)
 * Body: { researchQueryId: string, documentType: string, userId?: string }
 */
router.post('/generate-from-research', async (req, res) => {
  try {
    const { researchQueryId, documentType, userId } = req.body;

    if (!researchQueryId || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Research query ID and document type are required',
      });
    }

    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    console.log(`[GeneratedDocs] Generating ${documentType} from research query ${researchQueryId}`);

    const document = await service.generateFromResearch(
      researchQueryId,
      documentType,
      userId || req.user?.id
    );

    res.json({
      success: true,
      document,
      message: 'Document generated from research successfully',
    });
  } catch (error: any) {
    console.error('Generate document from research error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate document from research',
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

// ============================================
// VERSION MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/generated-documents/:documentId/versions
 * Get version history for a document
 */
router.get('/:documentId/versions', async (req, res) => {
  try {
    const { documentId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const versions = await service.getVersionHistory(documentId);

    res.json({
      success: true,
      versions,
    });
  } catch (error: any) {
    console.error('Get version history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch version history',
    });
  }
});

/**
 * GET /api/generated-documents/:documentId/versions/:versionNumber
 * Get a specific version of a document
 */
router.get('/:documentId/versions/:versionNumber', async (req, res) => {
  try {
    const { documentId, versionNumber } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const version = await service.getVersion(documentId, parseInt(versionNumber, 10));

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    res.json({
      success: true,
      version,
    });
  } catch (error: any) {
    console.error('Get version error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch version',
    });
  }
});

/**
 * GET /api/generated-documents/:documentId/diff
 * Get diff between two versions
 * Query params: from (version number), to (version number)
 */
router.get('/:documentId/diff', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Both "from" and "to" version numbers are required',
      });
    }

    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const diff = await service.getVersionDiff(documentId, parseInt(from as string, 10), parseInt(to as string, 10));

    res.json({
      success: true,
      diff,
    });
  } catch (error: any) {
    console.error('Get diff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate diff',
    });
  }
});

/**
 * POST /api/generated-documents/:documentId/rollback
 * Rollback to a specific version
 * Body: { versionNumber: number }
 */
router.post('/:documentId/rollback', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Version number is required',
      });
    }

    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const document = await service.rollbackToVersion(documentId, versionNumber, req.user?.id);

    res.json({
      success: true,
      document,
      message: `Rolled back to version ${versionNumber}`,
    });
  } catch (error: any) {
    console.error('Rollback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to rollback document',
    });
  }
});

/**
 * POST /api/generated-documents/:documentId/change-summary
 * Generate AI summary of changes between versions
 * Body: { fromVersion: number, toVersion: number }
 */
router.post('/:documentId/change-summary', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fromVersion, toVersion } = req.body;

    if (!fromVersion || !toVersion) {
      return res.status(400).json({
        success: false,
        message: 'Both fromVersion and toVersion are required',
      });
    }

    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const summary = await service.generateChangeSummary(documentId, fromVersion, toVersion);

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Generate change summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate change summary',
    });
  }
});

// ============================================
// SMART FEATURES ENDPOINTS
// ============================================

/**
 * GET /api/generated-documents/recommendations/:projectId
 * Get AI-powered document recommendations for a project
 */
router.get('/recommendations/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const recommendations = await service.getRecommendations(projectId);

    res.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get document recommendations',
    });
  }
});

/**
 * GET /api/generated-documents/:documentId/quality-score
 * Get quality score for a specific document
 */
router.get('/:documentId/quality-score', async (req, res) => {
  try {
    const { documentId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const qualityScore = await service.calculateQualityScore(documentId);

    res.json({
      success: true,
      qualityScore,
    });
  } catch (error: any) {
    console.error('Calculate quality score error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate quality score',
    });
  }
});

// ============================================
// RE-EXAMINATION SYSTEM ENDPOINTS (Phase 3.1)
// ============================================

/**
 * GET /api/generated-documents/:documentId/check-reexamination
 * Check if a document needs re-examination based on project changes
 */
router.get('/:documentId/check-reexamination', async (req, res) => {
  try {
    const { documentId } = req.params;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const result = await service.checkIfNeedsReexamination(documentId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Check reexamination error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check if document needs re-examination',
    });
  }
});

/**
 * POST /api/generated-documents/:documentId/reexamine
 * Re-examine and regenerate a document with current project data
 * Body: { userId?: string }
 */
router.post('/:documentId/reexamine', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.body;
    const supabase = getSupabaseClient(req.user?.access_token);
    const service = new GeneratedDocumentsService(supabase);

    const result = await service.reexamineDocument(documentId, userId || req.user?.id);

    res.json({
      success: true,
      document: result.document,
      changes: result.changes,
      previousVersion: result.previousVersion,
      message: `Document re-examined successfully. Updated to version ${result.document.version}.`,
    });
  } catch (error: any) {
    console.error('Reexamine document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to re-examine document',
    });
  }
});

export default router;
