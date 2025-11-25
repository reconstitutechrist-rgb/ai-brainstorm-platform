import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import sessionReviewRoutes from '../routes/session-review';
import { SessionReviewAgent } from '../agents/SessionReviewAgent';
import { ContextGroupingService } from '../services/contextGroupingService';
import { SessionCompletionService } from '../services/sessionCompletionService';

// Mock modules
vi.mock('../agents/SessionReviewAgent');
vi.mock('../services/contextGroupingService');
vi.mock('../services/sessionCompletionService');
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Session Review API Routes - Critical Path', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/session-review', sessionReviewRoutes);
  });

  describe('POST /api/session-review/detect-end-intent', () => {
    it('should detect end session intent with high confidence', async () => {
      // Mock SessionReviewAgent
      const mockDetectEndSessionIntent = vi.fn().mockResolvedValue({
        isEndIntent: true,
        confidence: 95,
      });

      (SessionReviewAgent as any).mockImplementation(() => ({
        detectEndSessionIntent: mockDetectEndSessionIntent,
      }));

      const response = await request(app)
        .post('/api/session-review/detect-end-intent')
        .send({ userMessage: "I'm ready to end the session" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isEndIntent).toBe(true);
      expect(response.body.confidence).toBe(95);
      expect(mockDetectEndSessionIntent).toHaveBeenCalledWith("I'm ready to end the session");
    });

    it('should detect non-end intent', async () => {
      const mockDetectEndSessionIntent = vi.fn().mockResolvedValue({
        isEndIntent: false,
        confidence: 10,
      });

      (SessionReviewAgent as any).mockImplementation(() => ({
        detectEndSessionIntent: mockDetectEndSessionIntent,
      }));

      const response = await request(app)
        .post('/api/session-review/detect-end-intent')
        .send({ userMessage: 'Tell me more about authentication' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isEndIntent).toBe(false);
    });

    it('should return 400 if userMessage is missing', async () => {
      const response = await request(app)
        .post('/api/session-review/detect-end-intent')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should handle AI errors gracefully', async () => {
      const mockDetectEndSessionIntent = vi
        .fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      (SessionReviewAgent as any).mockImplementation(() => ({
        detectEndSessionIntent: mockDetectEndSessionIntent,
      }));

      const response = await request(app)
        .post('/api/session-review/detect-end-intent')
        .send({ userMessage: 'End session' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('AI service unavailable');
    });
  });

  describe('POST /api/session-review/generate-summary', () => {
    it('should generate summary with grouped ideas', async () => {
      const mockConversation = {
        id: 'conv-123',
        extracted_ideas: [
          {
            id: 'idea-1',
            idea: { title: 'OAuth' },
            conversationContext: { topic: 'Auth' },
          },
        ],
        messages: [{ id: 'msg-1', content: 'Hello' }],
      };

      const mockTopicGroups = [
        {
          topic: 'Authentication',
          icon: '🔐',
          ideas: [mockConversation.extracted_ideas[0]],
        },
      ];

      const mockSummary = {
        summaryText: 'You discussed 1 idea about Authentication',
      };

      // Mock Supabase
      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
        update: vi.fn().mockReturnThis(),
      });

      // Mock services
      (ContextGroupingService as any).mockImplementation(() => ({
        groupIdeasByContext: vi.fn().mockResolvedValue(mockTopicGroups),
      }));

      (SessionReviewAgent as any).mockImplementation(() => ({
        generateReviewSummary: vi.fn().mockResolvedValue(mockSummary),
      }));

      const response = await request(app)
        .post('/api/session-review/generate-summary')
        .send({ conversationId: 'conv-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual(mockSummary);
      expect(response.body.topicGroups).toEqual(mockTopicGroups);
    });

    it('should return 400 if conversationId is missing', async () => {
      const response = await request(app)
        .post('/api/session-review/generate-summary')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 if conversation not found', async () => {
      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const response = await request(app)
        .post('/api/session-review/generate-summary')
        .send({ conversationId: 'invalid-id' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/session-review/parse-decisions', () => {
    it('should parse natural language decisions correctly', async () => {
      const mockConversation = {
        id: 'conv-123',
        extracted_ideas: [
          { id: 'idea-1', idea: { title: 'OAuth' } },
          { id: 'idea-2', idea: { title: 'Dark Mode' } },
          { id: 'idea-3', idea: { title: 'Mobile App' } },
        ],
        messages: [],
      };

      const mockTopicGroups = [
        {
          topic: 'Features',
          ideas: mockConversation.extracted_ideas,
        },
      ];

      const mockParsedDecisions = {
        accepted: [mockConversation.extracted_ideas[0], mockConversation.extracted_ideas[1]],
        rejected: [mockConversation.extracted_ideas[2]],
        unmarked: [],
        confidence: 90,
        needsClarification: false,
      };

      // Mock Supabase
      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
      });

      // Mock services
      (ContextGroupingService as any).mockImplementation(() => ({
        groupIdeasByContext: vi.fn().mockResolvedValue(mockTopicGroups),
      }));

      (SessionReviewAgent as any).mockImplementation(() => ({
        parseDecisions: vi.fn().mockResolvedValue(mockParsedDecisions),
      }));

      const response = await request(app)
        .post('/api/session-review/parse-decisions')
        .send({
          conversationId: 'conv-123',
          userDecisions: 'I want OAuth and Dark Mode. I don\'t want Mobile App.',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.parsedDecisions.accepted).toHaveLength(2);
      expect(response.body.parsedDecisions.rejected).toHaveLength(1);
      expect(response.body.parsedDecisions.needsClarification).toBe(false);
    });

    it('should handle decisions requiring clarification', async () => {
      const mockConversation = {
        id: 'conv-123',
        extracted_ideas: [
          { id: 'idea-1', idea: { title: 'OAuth' } },
          { id: 'idea-2', idea: { title: 'Dark Mode' } },
          { id: 'idea-3', idea: { title: 'Mobile App' } },
        ],
        messages: [],
      };

      const mockParsedDecisions = {
        accepted: [mockConversation.extracted_ideas[0]],
        rejected: [],
        unmarked: [mockConversation.extracted_ideas[1], mockConversation.extracted_ideas[2]],
        confidence: 60,
        needsClarification: true,
        clarificationQuestion: 'What about Dark Mode and Mobile App?',
      };

      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
      });

      (ContextGroupingService as any).mockImplementation(() => ({
        groupIdeasByContext: vi.fn().mockResolvedValue([]),
      }));

      (SessionReviewAgent as any).mockImplementation(() => ({
        parseDecisions: vi.fn().mockResolvedValue(mockParsedDecisions),
      }));

      const response = await request(app)
        .post('/api/session-review/parse-decisions')
        .send({
          conversationId: 'conv-123',
          userDecisions: 'I want OAuth',
        })
        .expect(200);

      expect(response.body.parsedDecisions.needsClarification).toBe(true);
      expect(response.body.parsedDecisions.clarificationQuestion).toBeDefined();
    });

    it('should return 400 if parameters are missing', async () => {
      const response = await request(app)
        .post('/api/session-review/parse-decisions')
        .send({ conversationId: 'conv-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/session-review/finalize', () => {
    it('should finalize session and return summary', async () => {
      const mockFinalDecisions = {
        accepted: [{ id: 'idea-1' }],
        rejected: [{ id: 'idea-2' }],
        unmarked: [],
      };

      const mockSummary = {
        success: true,
        sessionId: 'session-123',
        sessionName: 'Completed Session - 1/1/2025',
        documentsCreated: [
          { id: 'doc-1', title: 'Accepted Ideas', type: 'accepted_ideas' },
          { id: 'doc-2', title: 'Rejected Ideas', type: 'rejected_ideas' },
        ],
        documentsUpdated: [
          { id: 'doc-3', title: 'Project Brief', type: 'project_brief', newVersion: 2 },
        ],
        projectItemsAdded: 1,
        itemsDetails: { decided: 1, exploring: 0 },
        sandboxStatus: 'completed',
      };

      (SessionCompletionService as any).mockImplementation(() => ({
        completeSession: vi.fn().mockResolvedValue(mockSummary),
      }));

      const response = await request(app)
        .post('/api/session-review/finalize')
        .send({
          conversationId: 'conv-123',
          finalDecisions: mockFinalDecisions,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionSummary).toEqual(mockSummary);
      expect(response.body.sessionSummary.documentsCreated).toHaveLength(2);
      expect(response.body.sessionSummary.documentsUpdated).toHaveLength(1);
      expect(response.body.sessionSummary.projectItemsAdded).toBe(1);
    });

    it('should return 400 if parameters are missing', async () => {
      const response = await request(app)
        .post('/api/session-review/finalize')
        .send({ conversationId: 'conv-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle finalization errors', async () => {
      (SessionCompletionService as any).mockImplementation(() => ({
        completeSession: vi.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app)
        .post('/api/session-review/finalize')
        .send({
          conversationId: 'conv-123',
          finalDecisions: { accepted: [], rejected: [] },
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database error');
    });
  });

  describe('POST /api/session-review/cancel', () => {
    it('should cancel review and reset conversation status', async () => {
      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const response = await request(app)
        .post('/api/session-review/cancel')
        .send({ conversationId: 'conv-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should return 400 if conversationId is missing', async () => {
      const response = await request(app)
        .post('/api/session-review/cancel')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors', async () => {
      const { supabase } = await import('../services/supabase');
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      });

      const response = await request(app)
        .post('/api/session-review/cancel')
        .send({ conversationId: 'conv-123' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
