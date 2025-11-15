/**
 * Analysis Templates Routes - Phase 4.2
 *
 * Manage analysis templates and custom field configurations
 */

import { Router } from 'express';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByType,
  createCustomTemplate,
  type TemplateField,
} from '../config/analysis-templates';

const router = Router();

/**
 * GET /api/analysis-templates
 * Get all available analysis templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = getAllTemplates();

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch templates',
    });
  }
});

/**
 * GET /api/analysis-templates/:templateId
 * Get a specific template by ID
 */
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch template',
    });
  }
});

/**
 * GET /api/analysis-templates/type/:type
 * Get templates by type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;

    if (!['competitor', 'technical', 'user_research', 'market', 'custom'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template type',
      });
    }

    const templates = getTemplatesByType(type as any);

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('Get templates by type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch templates',
    });
  }
});

/**
 * POST /api/analysis-templates/custom
 * Create a custom template with user-defined fields
 */
router.post('/custom', async (req, res) => {
  try {
    const { name, description, fields } = req.body;

    if (!name || !description || !fields || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, fields (array)',
      });
    }

    // Validate fields
    for (const field of fields) {
      if (!field.id || !field.label || !field.type) {
        return res.status(400).json({
          success: false,
          error: 'Each field must have id, label, and type',
        });
      }
    }

    const customTemplate = createCustomTemplate(name, description, fields as TemplateField[]);

    // NOTE: Custom templates are currently stored in-memory only
    // Future enhancement: Persist custom templates to database for cross-session availability

    res.json({
      success: true,
      template: customTemplate,
      message: 'Custom template created successfully',
    });
  } catch (error: any) {
    console.error('Create custom template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create custom template',
    });
  }
});

export default router;
