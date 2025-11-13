/**
 * Unit tests for analysis-templates.ts
 * Tests template utilities and custom template creation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByType,
  createCustomTemplate,
  competitorAnalysisTemplate,
  technicalDocumentationTemplate,
  userResearchTemplate,
  marketResearchTemplate,
  type TemplateField,
  type AnalysisTemplateType,
} from './analysis-templates';

describe('Analysis Templates', () => {
  describe('getAllTemplates', () => {
    it('should return all 4 built-in templates', () => {
      const templates = getAllTemplates();
      expect(templates).toHaveLength(4);
    });

    it('should return templates with correct structure', () => {
      const templates = getAllTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('fields');
        expect(template).toHaveProperty('outputFormat');
        expect(template).toHaveProperty('systemPrompt');
        expect(Array.isArray(template.fields)).toBe(true);
      });
    });

    it('should include all expected template types', () => {
      const templates = getAllTemplates();
      const types = templates.map(t => t.type);
      expect(types).toContain('competitor');
      expect(types).toContain('technical');
      expect(types).toContain('user_research');
      expect(types).toContain('market');
    });
  });

  describe('getTemplateById', () => {
    it('should return correct template for valid ID', () => {
      const template = getTemplateById('competitor_analysis');
      expect(template).not.toBeNull();
      expect(template?.id).toBe('competitor_analysis');
      expect(template?.name).toBe('Competitor Analysis');
      expect(template?.type).toBe('competitor');
    });

    it('should return null for invalid ID', () => {
      const template = getTemplateById('non_existent_template');
      expect(template).toBeNull();
    });

    it('should return template with all required fields', () => {
      const template = getTemplateById('technical_documentation');
      expect(template).not.toBeNull();
      expect(template?.fields.length).toBeGreaterThan(0);
      expect(template?.systemPrompt).toBeTruthy();
    });
  });

  describe('getTemplatesByType', () => {
    it('should return templates matching the specified type', () => {
      const competitorTemplates = getTemplatesByType('competitor');
      expect(competitorTemplates.length).toBeGreaterThan(0);
      competitorTemplates.forEach(template => {
        expect(template.type).toBe('competitor');
      });
    });

    it('should return empty array for custom type (no built-in customs)', () => {
      const customTemplates = getTemplatesByType('custom');
      expect(customTemplates).toEqual([]);
    });

    it('should handle all template types', () => {
      const types: AnalysisTemplateType[] = ['competitor', 'technical', 'user_research', 'market'];
      types.forEach(type => {
        const templates = getTemplatesByType(type);
        expect(Array.isArray(templates)).toBe(true);
      });
    });
  });

  describe('createCustomTemplate', () => {
    const sampleFields: TemplateField[] = [
      {
        id: 'field1',
        label: 'Test Field 1',
        description: 'Description 1',
        type: 'text',
        required: true,
        extractionHint: 'Extract test data',
      },
      {
        id: 'field2',
        label: 'Test Field 2',
        description: 'Description 2',
        type: 'list',
        required: false,
      },
    ];

    it('should create custom template with correct properties', () => {
      const template = createCustomTemplate('My Custom Template', 'Custom description', sampleFields);

      expect(template.name).toBe('My Custom Template');
      expect(template.description).toBe('Custom description');
      expect(template.type).toBe('custom');
      expect(template.icon).toBe('edit');
      expect(template.outputFormat).toBe('structured_json');
      expect(template.fields).toEqual(sampleFields);
    });

    it('should generate unique IDs for each custom template', async () => {
      const template1 = createCustomTemplate('Template 1', 'Desc 1', sampleFields);
      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      const template2 = createCustomTemplate('Template 2', 'Desc 2', sampleFields);

      expect(template1.id).not.toBe(template2.id);
      expect(template1.id).toMatch(/^custom_\d+$/);
      expect(template2.id).toMatch(/^custom_\d+$/);
    });

    it('should include fields in system prompt', () => {
      const template = createCustomTemplate('Test', 'Test desc', sampleFields);

      expect(template.systemPrompt).toContain('Test Field 1');
      expect(template.systemPrompt).toContain('Description 1');
      expect(template.systemPrompt).toContain('Test Field 2');
    });

    it('should handle empty fields array', () => {
      const template = createCustomTemplate('Empty Template', 'No fields', []);

      expect(template.fields).toEqual([]);
      expect(template.systemPrompt).toBeTruthy();
    });
  });

  describe('Built-in Templates', () => {
    describe('Competitor Analysis Template', () => {
      it('should have correct structure', () => {
        expect(competitorAnalysisTemplate.id).toBe('competitor_analysis');
        expect(competitorAnalysisTemplate.type).toBe('competitor');
        expect(competitorAnalysisTemplate.outputFormat).toBe('structured_json');
      });

      it('should have all required fields', () => {
        const requiredFieldIds = ['company_overview', 'key_features', 'target_market', 'pros_cons', 'unique_selling_points'];
        const templateFieldIds = competitorAnalysisTemplate.fields.filter(f => f.required).map(f => f.id);

        requiredFieldIds.forEach(id => {
          expect(templateFieldIds).toContain(id);
        });
      });

      it('should have at least 6 fields', () => {
        expect(competitorAnalysisTemplate.fields.length).toBeGreaterThanOrEqual(6);
      });
    });

    describe('Technical Documentation Template', () => {
      it('should have correct structure', () => {
        expect(technicalDocumentationTemplate.id).toBe('technical_documentation');
        expect(technicalDocumentationTemplate.type).toBe('technical');
      });

      it('should include technical-specific fields', () => {
        const fieldIds = technicalDocumentationTemplate.fields.map(f => f.id);
        expect(fieldIds).toContain('api_endpoints');
        expect(fieldIds).toContain('authentication');
        expect(fieldIds).toContain('requirements');
      });
    });

    describe('User Research Template', () => {
      it('should have correct structure', () => {
        expect(userResearchTemplate.id).toBe('user_research');
        expect(userResearchTemplate.type).toBe('user_research');
      });

      it('should include user-focused fields', () => {
        const fieldIds = userResearchTemplate.fields.map(f => f.id);
        expect(fieldIds).toContain('pain_points');
        expect(fieldIds).toContain('needs');
        expect(fieldIds).toContain('sentiment');
      });
    });

    describe('Market Research Template', () => {
      it('should have correct structure', () => {
        expect(marketResearchTemplate.id).toBe('market_research');
        expect(marketResearchTemplate.type).toBe('market');
      });

      it('should include market-specific fields', () => {
        const fieldIds = marketResearchTemplate.fields.map(f => f.id);
        expect(fieldIds).toContain('market_overview');
        expect(fieldIds).toContain('trends');
        expect(fieldIds).toContain('opportunities');
      });
    });
  });

  describe('Template Field Types', () => {
    it('should support all field types', () => {
      const allFields = getAllTemplates().flatMap(t => t.fields);
      const fieldTypes = [...new Set(allFields.map(f => f.type))];

      expect(fieldTypes.length).toBeGreaterThan(0);
      expect(fieldTypes).toContain('text');
      expect(fieldTypes).toContain('list');
    });

    it('should have extraction hints for most fields', () => {
      const allFields = getAllTemplates().flatMap(t => t.fields);
      const fieldsWithHints = allFields.filter(f => f.extractionHint);

      // Most fields should have extraction hints
      expect(fieldsWithHints.length).toBeGreaterThan(allFields.length * 0.7);
    });
  });
});
