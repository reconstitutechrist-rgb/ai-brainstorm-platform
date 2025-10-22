/**
 * Integration tests for analysis-chat routes
 * Tests all interactive analysis endpoints
 */

import { describe, it, expect, beforeEach, vi, Mock, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

// Mock Anthropic SDK before importing routes
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

import analysisChatRoutes from './analysis-chat';
import Anthropic from '@anthropic-ai/sdk';

describe('Analysis Chat Routes', () => {
  let app: Express;
  let mockAnthropicCreate: Mock;

  beforeAll(() => {
    // Get the mock instance
    const AnthropicInstance = new Anthropic({ apiKey: 'test-key' });
    mockAnthropicCreate = AnthropicInstance.messages.create as Mock;
  });

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/analysis', analysisChatRoutes);

    // Clear mock history
    vi.clearAllMocks();
  });

  describe('POST /api/analysis/chat', () => {
    const validRequest = {
      referenceId: 'ref_123',
      projectId: 'proj_456',
      analysisContent: 'This is a sample analysis about React framework...',
      messages: [],
      question: 'What technologies are mentioned?',
    };

    it('should return 200 with AI response for valid request', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'React is mentioned in the analysis.' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.answer).toBe('React is mentioned in the analysis.');
      expect(response.body.suggestedQuestions).toBeDefined();
      expect(Array.isArray(response.body.suggestedQuestions)).toBe(true);
    });

    it('should return 400 for missing referenceId', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).referenceId;

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for missing question', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).question;

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing analysisContent', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).analysisContent;

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle Anthropic API errors', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should include usage metrics in response', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Answer' }],
        usage: { input_tokens: 150, output_tokens: 75 },
      });

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(validRequest);

      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.input_tokens).toBe(150);
      expect(response.body.usage.output_tokens).toBe(75);
    });

    it('should pass conversation history to Claude', async () => {
      const requestWithHistory = {
        ...validRequest,
        messages: [
          { role: 'user', content: 'Previous question', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Previous answer', timestamp: new Date().toISOString() },
        ],
      };

      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Answer with context' }],
        usage: { input_tokens: 200, output_tokens: 100 },
      });

      const response = await request(app)
        .post('/api/analysis/chat')
        .send(requestWithHistory);

      expect(response.status).toBe(200);
      expect(mockAnthropicCreate).toHaveBeenCalled();

      // Check that conversation history was passed
      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      expect(callArgs.messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/analysis/deep-dive', () => {
    const validRequest = {
      referenceId: 'ref_123',
      projectId: 'proj_456',
      analysisContent: `
## Key Features
React, TypeScript, Vite

## Technical Details
Modern tooling setup
      `,
      sectionTitle: 'Key Features',
    };

    it('should return 200 with expanded content for valid request', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Expanded analysis of key features...' }],
        usage: { input_tokens: 150, output_tokens: 300 },
      });

      const response = await request(app)
        .post('/api/analysis/deep-dive')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.expandedContent).toBe('Expanded analysis of key features...');
      expect(response.body.researchSuggestions).toBeDefined();
      expect(Array.isArray(response.body.researchSuggestions)).toBe(true);
    });

    it('should return 400 for missing sectionTitle', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).sectionTitle;

      const response = await request(app)
        .post('/api/analysis/deep-dive')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if section not found in analysis', async () => {
      const notFoundRequest = {
        ...validRequest,
        sectionTitle: 'Non-existent Section',
      };

      const response = await request(app)
        .post('/api/analysis/deep-dive')
        .send(notFoundRequest);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Section not found');
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('Deep dive error'));

      const response = await request(app)
        .post('/api/analysis/deep-dive')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/analysis/extract-insights', () => {
    const validRequest = {
      referenceId: 'ref_123',
      projectId: 'proj_456',
      analysisContent: 'Analysis with various insights and requirements...',
    };

    it('should return 200 with extracted insights', async () => {
      const mockInsights = [
        {
          text: 'Implement user authentication',
          category: 'feature',
          priority: 'high',
          reasoning: 'Security requirement',
        },
        {
          text: 'Add dark mode support',
          category: 'feature',
          priority: 'medium',
          reasoning: 'User experience enhancement',
        },
      ];

      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockInsights) }],
        usage: { input_tokens: 100, output_tokens: 150 },
      });

      const response = await request(app)
        .post('/api/analysis/extract-insights')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should handle selected text parameter', async () => {
      const requestWithSelection = {
        ...validRequest,
        selectedText: 'Specific section to extract from',
      };

      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
        usage: { input_tokens: 120, output_tokens: 50 },
      });

      const response = await request(app)
        .post('/api/analysis/extract-insights')
        .send(requestWithSelection);

      expect(response.status).toBe(200);
      expect(mockAnthropicCreate).toHaveBeenCalled();
    });

    it('should return 400 for missing analysisContent', async () => {
      const invalidRequest = { referenceId: 'ref_123', projectId: 'proj_456' };

      const response = await request(app)
        .post('/api/analysis/extract-insights')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON from Claude', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const response = await request(app)
        .post('/api/analysis/extract-insights')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.insights).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/analysis/suggest-research', () => {
    const validRequest = {
      referenceId: 'ref_123',
      projectId: 'proj_456',
      analysisContent: 'Analysis mentioning React, TypeScript, and API design...',
    };

    it('should return 200 with research suggestions', async () => {
      const mockSuggestions = [
        {
          topic: 'React Performance Optimization',
          query: 'React performance best practices',
          reasoning: 'To improve application speed',
          category: 'technical',
        },
        {
          topic: 'TypeScript Advanced Types',
          query: 'TypeScript utility types',
          reasoning: 'To enhance type safety',
          category: 'technical',
        },
      ];

      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSuggestions) }],
        usage: { input_tokens: 150, output_tokens: 200 },
      });

      const response = await request(app)
        .post('/api/analysis/suggest-research')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = { referenceId: 'ref_123' };

      const response = await request(app)
        .post('/api/analysis/suggest-research')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty suggestions gracefully', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const response = await request(app)
        .post('/api/analysis/suggest-research')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });
});
