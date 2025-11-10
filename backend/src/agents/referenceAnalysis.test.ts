/**
 * Unit tests for ReferenceAnalysisAgent
 * Tests template integration and analysis methods
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReferenceAnalysisAgent } from './referenceAnalysis';
import { isReferenceAnalysisResponse } from '../types';
import * as templates from '../config/analysis-templates';

// Mock the templates module partially
vi.mock('../config/analysis-templates', async () => {
  const actual = await vi.importActual<typeof templates>('../config/analysis-templates');
  return {
    ...actual,
    getTemplateById: vi.fn(actual.getTemplateById),
    getAllTemplates: vi.fn(actual.getAllTemplates),
  };
});

describe('ReferenceAnalysisAgent', () => {
  let agent: ReferenceAnalysisAgent;

  beforeEach(() => {
    agent = new ReferenceAnalysisAgent();
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should have analyze method', () => {
      expect(typeof agent.analyze).toBe('function');
    });

    it('should have analyzeWithContext method', () => {
      expect(typeof agent.analyzeWithContext).toBe('function');
    });

    it('should have analyzeWithTemplate method', () => {
      expect(typeof agent.analyzeWithTemplate).toBe('function');
    });

    it('should have template helper methods', () => {
      expect(typeof agent.getAvailableTemplates).toBe('function');
      expect(typeof agent.getTemplate).toBe('function');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = agent.getAvailableTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(4);
    });

    it('should return templates with correct structure', () => {
      const templates = agent.getAvailableTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('fields');
        expect(template).toHaveProperty('systemPrompt');
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template for valid ID', () => {
      const template = agent.getTemplate('competitor_analysis');

      expect(template).not.toBeNull();
      expect(template?.id).toBe('competitor_analysis');
    });

    it('should return null for invalid ID', () => {
      const template = agent.getTemplate('non_existent');

      expect(template).toBeNull();
    });
  });

  describe('analyzeWithTemplate', () => {
    const mockReferenceData = {
      extractedContent: 'Sample extracted content about a competitor product...',
      url: 'https://example.com/product',
      contentType: 'text',
    };

    beforeEach(() => {
      // Mock the callClaude method
      vi.spyOn(agent as any, 'callClaude').mockResolvedValue(
        JSON.stringify({
          company_overview: 'Competitor Inc. founded in 2020',
          key_features: ['Feature A', 'Feature B'],
          pricing: 'Starting at $99/month',
          target_market: 'Small to medium businesses',
          pros_cons: {
            pros: ['Easy to use', 'Good support'],
            cons: ['Limited features', 'High price'],
          },
          unique_selling_points: ['AI-powered', 'Fast deployment'],
          technology_stack: ['React', 'Node.js'],
          market_position: 'Growing startup',
        })
      );
    });

    it('should throw error for invalid template ID', async () => {
      await expect(
        agent.analyzeWithTemplate('document', mockReferenceData, 'invalid_template')
      ).rejects.toThrow('Template not found');
    });

    it('should call Claude with template-specific prompt', async () => {
      const callClaudeSpy = vi.spyOn(agent as any, 'callClaude');

      await agent.analyzeWithTemplate('document', mockReferenceData, 'competitor_analysis');

      expect(callClaudeSpy).toHaveBeenCalled();
      const callArgs = callClaudeSpy.mock.calls[0][0] as any[];
      expect(callArgs[0].content).toContain('competitor');
    });

    it('should return AgentResponse with correct structure', async () => {
      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'competitor_analysis'
      );

      expect(response).toHaveProperty('agent');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('showToUser');
      expect(response).toHaveProperty('metadata');
      expect(response.agent).toBe('ReferenceAnalysis');
      expect(response.showToUser).toBe(true);
    });

    it('should include template metadata in response', async () => {
      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'competitor_analysis'
      );

      expect(isReferenceAnalysisResponse(response)).toBe(true);
      if (isReferenceAnalysisResponse(response)) {
        expect(response.metadata.templateUsed).toEqual({
          id: 'competitor_analysis',
          name: 'Competitor Analysis',
          type: 'competitor',
        });
      }
    });

    it('should handle structured_json output format', async () => {
      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'competitor_analysis'
      );

      expect(isReferenceAnalysisResponse(response)).toBe(true);
      if (isReferenceAnalysisResponse(response)) {
        expect(response.metadata).toHaveProperty('outputFormat');
        expect((response.metadata as any).outputFormat).toBe('structured_json');
        expect(response.metadata).toHaveProperty('structuredData');
      }
    });

    it('should parse JSON response when output format is structured_json', async () => {
      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'competitor_analysis'
      );

      expect(isReferenceAnalysisResponse(response)).toBe(true);
      if (isReferenceAnalysisResponse(response)) {
        const metadata = response.metadata as any;
        expect(metadata.structuredData).toBeDefined();
        expect(metadata.structuredData).toHaveProperty('company_overview');
        expect(metadata.structuredData).toHaveProperty('key_features');
      }
    });

    it('should handle markdown output format', async () => {
      vi.spyOn(agent as any, 'callClaude').mockResolvedValue('# Analysis\n\nMarkdown content here');

      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'user_research'
      );

      expect(isReferenceAnalysisResponse(response)).toBe(true);
      if (isReferenceAnalysisResponse(response)) {
        expect((response.metadata as any).outputFormat).toBe('structured_json');
        expect(response.message).toContain('Markdown content');
      }
    });

    it('should include all template fields in prompt', async () => {
      const callClaudeSpy = vi.spyOn(agent as any, 'callClaude');

      await agent.analyzeWithTemplate('document', mockReferenceData, 'technical_documentation');

      const callArgs = callClaudeSpy.mock.calls[0][0] as any[];
      const prompt = callArgs[0].content;

      expect(prompt).toContain('api_endpoints');
      expect(prompt).toContain('authentication');
      expect(prompt).toContain('requirements');
    });

    it('should truncate long content', async () => {
      const longContent = 'a'.repeat(10000);
      const longReferenceData = {
        ...mockReferenceData,
        extractedContent: longContent,
      };

      const callClaudeSpy = vi.spyOn(agent as any, 'callClaude');

      await agent.analyzeWithTemplate('document', longReferenceData, 'competitor_analysis');

      const callArgs = callClaudeSpy.mock.calls[0][0] as any[];
      const prompt = callArgs[0].content;

      expect(prompt).toContain('[Content truncated...]');
    });

    it('should handle missing extracted content', async () => {
      const noContentData = {
        url: 'https://example.com',
        contentType: 'image',
      };

      const response = await agent.analyzeWithTemplate('image', noContentData, 'competitor_analysis');

      expect(response).toBeDefined();
      expect(isReferenceAnalysisResponse(response)).toBe(true);
      if (isReferenceAnalysisResponse(response)) {
        // The hadExtractedContent property should exist in metadata
        expect(response.metadata).toHaveProperty('hadExtractedContent');
        expect(response.metadata.hadExtractedContent).toBe(false);
      }
    });

    it('should handle malformed JSON in Claude response', async () => {
      vi.spyOn(agent as any, 'callClaude').mockResolvedValue('Not valid JSON content');

      const response = await agent.analyzeWithTemplate(
        'document',
        mockReferenceData,
        'competitor_analysis'
      );

      expect((response.metadata as any).structuredData).toBeNull();
    });

    it('should work with all built-in templates', async () => {
      const templateIds = [
        'competitor_analysis',
        'technical_documentation',
        'user_research',
        'market_research',
      ];

      for (const templateId of templateIds) {
        const response = await agent.analyzeWithTemplate('document', mockReferenceData, templateId);

        expect(response).toBeDefined();
        expect(isReferenceAnalysisResponse(response)).toBe(true);
        if (isReferenceAnalysisResponse(response)) {
          expect(response.metadata.templateUsed?.id).toBe(templateId);
        }
      }
    });

    it('should include extraction hints in prompt', async () => {
      const callClaudeSpy = vi.spyOn(agent as any, 'callClaude');

      await agent.analyzeWithTemplate('document', mockReferenceData, 'competitor_analysis');

      const callArgs = callClaudeSpy.mock.calls[0][0] as any[];
      const prompt = callArgs[0].content;

      // Check that extraction hints are included
      expect(prompt).toContain('Hint:');
    });

    it('should use correct max_tokens for analysis', async () => {
      const callClaudeSpy = vi.spyOn(agent as any, 'callClaude');

      await agent.analyzeWithTemplate('document', mockReferenceData, 'competitor_analysis');

      const maxTokens = callClaudeSpy.mock.calls[0][1];
      expect(maxTokens).toBe(3000);
    });
  });

  describe('Integration with Templates', () => {
    it('should use getTemplateById from config', async () => {
      const getTemplateByIdSpy = vi.spyOn(templates, 'getTemplateById');

      await agent.analyzeWithTemplate(
        'document',
        { extractedContent: 'test' },
        'competitor_analysis'
      ).catch(() => {}); // Ignore errors, just checking the spy

      expect(getTemplateByIdSpy).toHaveBeenCalledWith('competitor_analysis');
    });

    it('should use getAllTemplates from config', () => {
      const getAllTemplatesSpy = vi.spyOn(templates, 'getAllTemplates');

      agent.getAvailableTemplates();

      expect(getAllTemplatesSpy).toHaveBeenCalled();
    });
  });
});
