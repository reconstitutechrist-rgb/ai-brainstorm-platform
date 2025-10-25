import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionCompletionService } from '../services/sessionCompletionService';
import { BrainstormDocumentService } from '../services/brainstormDocumentService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

// Mock data
const mockConversation = {
  id: 'conv-123',
  sandbox_id: 'sandbox-123',
  messages: [],
  extracted_ideas: [],
  session_status: 'active',
};

const mockSandbox = {
  id: 'sandbox-123',
  project_id: 'project-123',
  status: 'active',
  name: 'Test Sandbox',
};

const mockProject = {
  id: 'project-123',
  title: 'Test Project',
  items: [],
};

const mockAcceptedIdeas = [
  {
    id: 'idea-1',
    idea: {
      title: 'OAuth Authentication',
      description: 'Add OAuth login support',
      reasoning: 'Improves security',
      userIntent: 'secure authentication',
    },
    source: 'user_mention',
    tags: ['auth', 'security'],
    innovationLevel: 'practical',
    conversationContext: {
      messageId: 'msg-1',
      timestamp: '2025-01-01T00:00:00Z',
      leadingQuestions: [],
      topic: 'Authentication',
    },
  },
  {
    id: 'idea-2',
    idea: {
      title: 'Dark Mode',
      description: 'Add dark theme support',
      reasoning: 'Better UX',
      userIntent: 'visual customization',
    },
    source: 'ai_suggestion',
    tags: ['ui', 'theme'],
    innovationLevel: 'moderate',
    conversationContext: {
      messageId: 'msg-2',
      timestamp: '2025-01-01T00:01:00Z',
      leadingQuestions: [],
      topic: 'UI Design',
    },
  },
];

const mockRejectedIdeas = [
  {
    id: 'idea-3',
    idea: {
      title: 'Mobile App',
      description: 'Create native mobile app',
      reasoning: 'Expand platform reach',
      userIntent: 'mobile support',
    },
    source: 'collaborative',
    tags: ['mobile'],
    innovationLevel: 'experimental',
    conversationContext: {
      messageId: 'msg-3',
      timestamp: '2025-01-01T00:02:00Z',
      leadingQuestions: [],
      topic: 'Mobile',
    },
  },
];

const mockGeneratedDocs = {
  acceptedDoc: {
    id: 'doc-accepted',
    title: 'Accepted Ideas - Completed Session',
    document_type: 'accepted_ideas',
    content: 'OAuth, Dark Mode',
  },
  rejectedDoc: {
    id: 'doc-rejected',
    title: 'Rejected Ideas - Completed Session',
    document_type: 'rejected_ideas',
    content: 'Mobile App',
  },
  updatedDocs: [
    {
      id: 'doc-brief',
      title: 'Project Brief',
      document_type: 'project_brief',
      version: 2,
    },
  ],
};

describe('SessionCompletionService - Critical Path', () => {
  let service: SessionCompletionService;
  let mockBrainstormDocService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock BrainstormDocumentService
    mockBrainstormDocService = {
      generateSessionDocuments: vi.fn().mockResolvedValue(mockGeneratedDocs),
    };

    // Create service instance
    service = new SessionCompletionService(mockSupabase as any);
    (service as any).brainstormDocService = mockBrainstormDocService;
  });

  describe('completeSession - Happy Path', () => {
    it('should successfully complete a session with all steps', async () => {
      // Mock database responses
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();

      // Setup conversation query
      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null }) // conversation
        .mockResolvedValueOnce({ data: mockSandbox, error: null }) // sandbox
        .mockResolvedValueOnce({ data: { id: 'session-123' }, error: null }) // session insert
        .mockResolvedValueOnce({ data: mockProject, error: null }); // project fetch

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Execute
      const result = await service.completeSession('conv-123', {
        accepted: mockAcceptedIdeas,
        rejected: mockRejectedIdeas,
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.sessionName).toContain('Completed Session');
      expect(result.documentsCreated).toHaveLength(2);
      expect(result.documentsUpdated).toHaveLength(1);
      expect(result.projectItemsAdded).toBe(2);
      expect(result.itemsDetails.decided).toBe(2);
      expect(result.sandboxStatus).toBe('completed');

      // Verify document generation was called
      expect(mockBrainstormDocService.generateSessionDocuments).toHaveBeenCalledWith(
        'project-123',
        'session-123',
        expect.stringContaining('Completed Session'),
        mockAcceptedIdeas,
        mockRejectedIdeas
      );
    });

    it('should add accepted ideas to project with correct state', async () => {
      // Setup mocks
      const mockProjectItems = [
        { id: 'existing-1', text: 'Existing item', state: 'decided' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn().mockReturnThis();

      let projectUpdateCalled = false;
      const mockUpdate = vi.fn().mockImplementation((updates) => {
        // Check if this is the project update (has items array)
        if (updates.items) {
          projectUpdateCalled = true;
          expect(updates.items).toBeDefined();
          expect(updates.items.length).toBe(3); // 1 existing + 2 new
          expect(updates.items[1].state).toBe('decided'); // New items default to decided
          expect(updates.items[1].metadata.fromBrainstorm).toBe(true);
          expect(updates.items[1].metadata.sessionId).toBe('session-123');
        }

        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: mockSandbox, error: null })
        .mockResolvedValueOnce({ data: { id: 'session-123' }, error: null })
        .mockResolvedValueOnce({ data: { ...mockProject, items: mockProjectItems }, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });

      // Execute
      const result = await service.completeSession('conv-123', {
        accepted: mockAcceptedIdeas,
        rejected: mockRejectedIdeas,
      });

      // Verify
      expect(result.projectItemsAdded).toBe(2);
      expect(projectUpdateCalled).toBe(true);
    });

    it('should update conversation and sandbox status correctly', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn();

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: mockSandbox, error: null })
        .mockResolvedValueOnce({ data: { id: 'session-123' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null });

      let sandboxUpdateCalled = false;
      let conversationUpdateCalled = false;

      mockUpdate.mockImplementation((updates) => {
        // Check if this is sandbox or conversation update
        if (updates.status === 'saved_as_alternative') {
          sandboxUpdateCalled = true;
          expect(updates.name).toContain('Completed Session');
        }
        if (updates.session_status === 'completed') {
          conversationUpdateCalled = true;
          expect(updates.final_decisions).toBeDefined();
          expect(updates.completed_at).toBeDefined();
        }

        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });

      // Execute
      await service.completeSession('conv-123', {
        accepted: mockAcceptedIdeas,
        rejected: mockRejectedIdeas,
      });

      // Verify both updates were called
      expect(sandboxUpdateCalled).toBe(true);
      expect(conversationUpdateCalled).toBe(true);
    });
  });

  describe('completeSession - Error Handling', () => {
    it('should throw error if conversation not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });

      // Execute and verify error
      await expect(
        service.completeSession('invalid-conv', {
          accepted: mockAcceptedIdeas,
          rejected: mockRejectedIdeas,
        })
      ).rejects.toThrow('Conversation not found');
    });

    it('should throw error if sandbox not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });

      // Execute and verify error
      await expect(
        service.completeSession('conv-123', {
          accepted: mockAcceptedIdeas,
          rejected: mockRejectedIdeas,
        })
      ).rejects.toThrow('Sandbox not found');
    });

    it('should handle document generation failures gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn().mockReturnThis();

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: mockSandbox, error: null })
        .mockResolvedValueOnce({ data: { id: 'session-123' }, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });

      // Mock document generation failure
      mockBrainstormDocService.generateSessionDocuments.mockRejectedValue(
        new Error('Document generation failed')
      );

      // Execute and verify error
      await expect(
        service.completeSession('conv-123', {
          accepted: mockAcceptedIdeas,
          rejected: mockRejectedIdeas,
        })
      ).rejects.toThrow('Document generation failed');
    });
  });

  describe('completeSession - Edge Cases', () => {
    it('should handle session with no accepted ideas', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: mockSandbox, error: null })
        .mockResolvedValueOnce({ data: { id: 'session-123' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Execute with no accepted ideas
      const result = await service.completeSession('conv-123', {
        accepted: [],
        rejected: mockRejectedIdeas,
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.projectItemsAdded).toBe(0);
      expect(result.itemsDetails.decided).toBe(0);
    });

    it('should handle session with unmarked ideas', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockInsert = vi.fn();
      const mockUpdate = vi.fn().mockReturnThis();

      mockSingle
        .mockResolvedValueOnce({ data: mockConversation, error: null })
        .mockResolvedValueOnce({ data: mockSandbox, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null });

      let sessionRecord: any = null;

      mockInsert.mockImplementation((data) => {
        sessionRecord = data;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'session-123', ...data }, error: null }),
          }),
        };
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockEq.mockReturnValue({ single: mockSingle });
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const unmarkedIdeas = [mockAcceptedIdeas[0]];

      // Execute with unmarked ideas
      const result = await service.completeSession('conv-123', {
        accepted: mockAcceptedIdeas.slice(1),
        rejected: mockRejectedIdeas,
        unmarked: unmarkedIdeas,
      });

      // Verify unmarked ideas are stored
      expect(sessionRecord.unmarked_ideas).toEqual(unmarkedIdeas);
      expect(result.success).toBe(true);
    });
  });
});

describe('SessionCompletionService - Session Retrieval', () => {
  let service: SessionCompletionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionCompletionService(mockSupabase as any);
  });

  describe('getSessionSummary', () => {
    it('should retrieve session with associated documents', async () => {
      const mockSession = {
        id: 'session-123',
        session_name: 'Test Session',
        generated_document_ids: ['doc-1', 'doc-2'],
        updated_document_ids: ['doc-3'],
      };

      const mockGeneratedDocs = [
        { id: 'doc-1', title: 'Accepted Ideas', document_type: 'accepted_ideas' },
        { id: 'doc-2', title: 'Rejected Ideas', document_type: 'rejected_ideas' },
      ];

      const mockUpdatedDocs = [
        { id: 'doc-3', title: 'Project Brief', document_type: 'project_brief', version: 2 },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockSession, error: null });

      mockSelect
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle })
        .mockReturnValueOnce({ in: mockIn })
        .mockReturnValueOnce({ in: mockIn });

      mockIn
        .mockResolvedValueOnce({ data: mockGeneratedDocs, error: null })
        .mockResolvedValueOnce({ data: mockUpdatedDocs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        single: mockSingle,
      });

      // Execute
      const result = await service.getSessionSummary('session-123');

      // Verify
      expect(result.id).toBe('session-123');
      expect(result.generatedDocuments).toHaveLength(2);
      expect(result.updatedDocuments).toHaveLength(1);
    });
  });

  describe('getProjectSessions', () => {
    it('should retrieve all sessions for a project ordered by date', async () => {
      const mockSessions = [
        { id: 'session-2', created_at: '2025-01-02T00:00:00Z' },
        { id: 'session-1', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockSessions, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
      mockEq.mockReturnValue({ order: mockOrder });

      // Execute
      const result = await service.getProjectSessions('project-123');

      // Verify
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-2'); // Most recent first
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
});
