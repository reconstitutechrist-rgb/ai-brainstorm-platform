/**
 * Integration tests for analysis-templates routes
 * Tests template management endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import analysisTemplatesRoutes from './analysis-templates';

describe('Analysis Templates Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analysis-templates', analysisTemplatesRoutes);
  });

  describe('GET /api/analysis-templates', () => {
    it('should return all templates with 200 status', async () => {
      const response = await request(app).get('/api/analysis-templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.count).toBe(4); // 4 built-in templates
    });

    it('should return templates with correct structure', async () => {
      const response = await request(app).get('/api/analysis-templates');

      const templates = response.body.templates;
      templates.forEach((template: any) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('fields');
        expect(template).toHaveProperty('outputFormat');
        expect(template).toHaveProperty('systemPrompt');
      });
    });

    it('should include all template types', async () => {
      const response = await request(app).get('/api/analysis-templates');

      const types = response.body.templates.map((t: any) => t.type);
      expect(types).toContain('competitor');
      expect(types).toContain('technical');
      expect(types).toContain('user_research');
      expect(types).toContain('market');
    });
  });

  describe('GET /api/analysis-templates/:templateId', () => {
    it('should return specific template for valid ID', async () => {
      const response = await request(app).get('/api/analysis-templates/competitor_analysis');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.template).toBeDefined();
      expect(response.body.template.id).toBe('competitor_analysis');
      expect(response.body.template.name).toBe('Competitor Analysis');
    });

    it('should return 404 for non-existent template ID', async () => {
      const response = await request(app).get('/api/analysis-templates/non_existent_template');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });

    it('should return template with all fields', async () => {
      const response = await request(app).get('/api/analysis-templates/technical_documentation');

      expect(response.status).toBe(200);
      expect(response.body.template.fields).toBeDefined();
      expect(Array.isArray(response.body.template.fields)).toBe(true);
      expect(response.body.template.fields.length).toBeGreaterThan(0);
    });

    it('should handle each built-in template ID correctly', async () => {
      const templateIds = [
        'competitor_analysis',
        'technical_documentation',
        'user_research',
        'market_research',
      ];

      for (const id of templateIds) {
        const response = await request(app).get(`/api/analysis-templates/${id}`);
        expect(response.status).toBe(200);
        expect(response.body.template.id).toBe(id);
      }
    });
  });

  describe('GET /api/analysis-templates/type/:type', () => {
    it('should return templates of specified type', async () => {
      const response = await request(app).get('/api/analysis-templates/type/competitor');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);

      response.body.templates.forEach((template: any) => {
        expect(template.type).toBe('competitor');
      });
    });

    it('should return empty array for custom type (no built-in customs)', async () => {
      const response = await request(app).get('/api/analysis-templates/type/custom');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.templates).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return 400 for invalid template type', async () => {
      const response = await request(app).get('/api/analysis-templates/type/invalid_type');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid template type');
    });

    it('should handle all valid template types', async () => {
      const validTypes = ['competitor', 'technical', 'user_research', 'market', 'custom'];

      for (const type of validTypes) {
        const response = await request(app).get(`/api/analysis-templates/type/${type}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('POST /api/analysis-templates/custom', () => {
    const validCustomTemplate = {
      name: 'My Custom Template',
      description: 'A custom template for specific needs',
      fields: [
        {
          id: 'custom_field_1',
          label: 'Custom Field 1',
          description: 'First custom field',
          type: 'text',
          required: true,
          extractionHint: 'Extract custom data',
        },
        {
          id: 'custom_field_2',
          label: 'Custom Field 2',
          description: 'Second custom field',
          type: 'list',
          required: false,
        },
      ],
    };

    it('should create custom template with valid data', async () => {
      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(validCustomTemplate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.template).toBeDefined();
      expect(response.body.template.name).toBe('My Custom Template');
      expect(response.body.template.type).toBe('custom');
      expect(response.body.template.fields).toHaveLength(2);
      expect(response.body.message).toBe('Custom template created successfully');
    });

    it('should generate unique ID for custom template', async () => {
      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(validCustomTemplate);

      expect(response.status).toBe(200);
      expect(response.body.template.id).toMatch(/^custom_\d+$/);
    });

    it('should return 400 for missing name', async () => {
      const invalidTemplate = { ...validCustomTemplate };
      delete (invalidTemplate as any).name;

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for missing description', async () => {
      const invalidTemplate = { ...validCustomTemplate };
      delete (invalidTemplate as any).description;

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing fields array', async () => {
      const invalidTemplate = { ...validCustomTemplate };
      delete (invalidTemplate as any).fields;

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-array fields', async () => {
      const invalidTemplate = {
        ...validCustomTemplate,
        fields: 'not an array',
      };

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid field structure', async () => {
      const invalidTemplate = {
        ...validCustomTemplate,
        fields: [
          {
            id: 'field1',
            label: 'Field 1',
            // Missing 'type'
          },
        ],
      };

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must have id, label, and type');
    });

    it('should handle empty fields array', async () => {
      const templateWithNoFields = {
        name: 'Empty Template',
        description: 'Template with no fields',
        fields: [],
      };

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(templateWithNoFields);

      expect(response.status).toBe(200);
      expect(response.body.template.fields).toEqual([]);
    });

    it('should create templates with different field types', async () => {
      const templateWithVariousTypes = {
        name: 'Multi-Type Template',
        description: 'Template with various field types',
        fields: [
          { id: 'text_field', label: 'Text', description: 'Text field', type: 'text', required: true },
          { id: 'list_field', label: 'List', description: 'List field', type: 'list', required: false },
          { id: 'table_field', label: 'Table', description: 'Table field', type: 'table', required: false },
          { id: 'rating_field', label: 'Rating', description: 'Rating field', type: 'rating', required: false },
        ],
      };

      const response = await request(app)
        .post('/api/analysis-templates/custom')
        .send(templateWithVariousTypes);

      expect(response.status).toBe(200);
      expect(response.body.template.fields).toHaveLength(4);
    });
  });
});
