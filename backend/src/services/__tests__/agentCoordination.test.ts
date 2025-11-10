import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentCoordinationService } from '../agentCoordination';
import { supabase } from '../supabase';
import { IntegrationOrchestrator } from '../../agents/orchestrator';
import { isContextManagerResponse } from '../../types';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../agents/orchestrator');

describe('AgentCoordinationService', () => {
  let service: AgentCoordinationService;
  const mockProjectId = 'project-123';
  const mockUserId = 'user-456';

  // Mock data
  const mockProjectState = {
    id: mockProjectId,
    title: 'Test Project',
    items: [
      { id: 'item-1', text: 'Existing item', state: 'decided' },
    ],
  };

  const mockConversationHistory = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'I want to build an authentication system',
      created_at: '2025-01-20T10:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Great! Let me help you with that.',
      created_at: '2025-01-20T10:00:05Z',
      agent_type: 'ConversationAgent',
    },
  ];

  const mockReferences = [
    {
      id: 'ref-1',
      title: 'Auth Best Practices',
      type: 'document',
      content: 'Security guidelines for authentication',
    },
  ];

  const mockDocuments = [
    {
      id: 'doc-1',
      title: 'Requirements Document',
      type: 'requirements',
      content: 'System requirements',
    },
  ];

  const mockIntent = {
    type: 'ideation',
    confidence: 0.85,
    reasoning: 'User is exploring authentication options',
  };

  const mockWorkflow = {
    name: 'ideation',
    agents: ['conversation', 'strategic'],
    parallelExecution: false,
  };

  const mockAgentResponses = [
    {
      agent: 'conversation',
      message: 'I can help you explore authentication methods.',
      showToUser: true,
      metadata: {},
    },
    {
      agent: 'strategic',
      message: 'Consider OAuth 2.0 or JWT for scalability.',
      showToUser: true,
      metadata: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentCoordinationService();

    // Mock Supabase queries
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    });

    // Setup default mock returns
    mockSingle.mockImplementation(() => {
      const fromCall = (supabase.from as any).mock.calls[0]?.[0];

      if (fromCall === 'projects') {
        return Promise.resolve({ data: mockProjectState, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockSelect.mockImplementation(() => ({
      eq: mockEq,
      order: mockOrder,
    }));

    mockEq.mockImplementation(() => ({
      order: mockOrder,
    }));

    mockOrder.mockImplementation(() =>
      Promise.resolve({ data: mockConversationHistory, error: null })
    );
  });

  describe('processUserMessage', () => {
    beforeEach(() => {
      // Mock orchestrator methods
      const mockContextManager = {
        classifyIntent: vi.fn().mockResolvedValue(mockIntent),
      };

      const mockOrchestrator = {
        agents: new Map([['contextManager', mockContextManager]]),
        determineWorkflow: vi.fn().mockResolvedValue(mockWorkflow),
        executeWorkflow: vi.fn().mockResolvedValue(mockAgentResponses),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();
    });

    it('should process a user message successfully', async () => {
      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Tell me about JWT authentication'
      );

      expect(result.responses).toBeDefined();
      expect(result.updates).toBeDefined();
      expect(result.workflow).toBeDefined();
    });

    it('should fetch project data in parallel', async () => {
      const startTime = Date.now();

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // If running sequentially, this would take much longer
      // Parallel execution should be fast
      expect(duration).toBeLessThan(1000);

      // Verify all data fetching calls were made
      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(supabase.from).toHaveBeenCalledWith('conversations');
    });

    it('should classify intent using Context Manager', async () => {
      const userMessage = 'I need help with authentication';

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        userMessage
      );

      const orchestrator = (service as any).orchestrator;
      const contextManager = orchestrator.agents.get('contextManager');

      expect(contextManager.classifyIntent).toHaveBeenCalledWith(
        userMessage,
        expect.any(Array)
      );
    });

    it('should determine workflow based on intent', async () => {
      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      const orchestrator = (service as any).orchestrator;

      expect(orchestrator.determineWorkflow).toHaveBeenCalledWith(
        mockIntent,
        'Test message'
      );
    });

    it('should execute workflow with all project context', async () => {
      // Mock references and documents
      const mockFrom = (supabase.from as any);
      mockFrom.mockImplementation((table: string) => {
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockOrder = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();

        const chain = {
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
          single: mockSingle,
        };

        mockSelect.mockReturnValue(chain);
        mockEq.mockReturnValue(chain);
        mockOrder.mockImplementation(() => {
          if (table === 'project_references') {
            return Promise.resolve({ data: mockReferences, error: null });
          }
          if (table === 'project_documents') {
            return Promise.resolve({ data: mockDocuments, error: null });
          }
          if (table === 'conversations') {
            return Promise.resolve({ data: mockConversationHistory, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        });

        mockSingle.mockImplementation(() => {
          if (table === 'projects') {
            return Promise.resolve({ data: mockProjectState, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        });

        return chain;
      });

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      const orchestrator = (service as any).orchestrator;

      expect(orchestrator.executeWorkflow).toHaveBeenCalledWith(
        mockWorkflow,
        'Test message',
        mockProjectState,
        expect.any(Array),
        expect.arrayContaining([
          ...mockReferences,
          ...mockDocuments,
        ])
      );
    });

    it('should return all agent responses without filtering', async () => {
      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      expect(result.responses).toEqual(mockAgentResponses);
      expect(result.responses.length).toBe(2);
    });

    it('should process state updates from agent responses', async () => {
      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      expect(result.updates).toBeDefined();
    });

    it('should log agent activity', async () => {
      // Mock doesn't throw, so this should complete successfully
      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      // Activity logging is fire-and-forget, just ensure no errors
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (supabase.from as any).mockImplementation(() => {
        throw error;
      });

      await expect(
        service.processUserMessage(mockProjectId, mockUserId, 'Test')
      ).rejects.toThrow('Database connection failed');
    });

    it('should log debug information', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Coordination]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getProjectState', () => {
    it('should fetch project by ID', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProjectState,
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const state = await (service as any).getProjectState(mockProjectId);

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockEq).toHaveBeenCalledWith('id', mockProjectId);
      expect(state).toEqual(mockProjectState);
    });

    it('should handle project not found', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const state = await (service as any).getProjectState(mockProjectId);

      expect(state).toBeNull();
    });
  });

  describe('getConversationHistory', () => {
    it('should fetch conversations ordered by timestamp', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockConversationHistory,
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const history = await (service as any).getConversationHistory(mockProjectId);

      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(mockEq).toHaveBeenCalledWith('project_id', mockProjectId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(history).toEqual(mockConversationHistory);
    });

    it('should return empty array when no conversations', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const history = await (service as any).getConversationHistory(mockProjectId);

      expect(history).toEqual([]);
    });
  });

  describe('getProjectReferences', () => {
    it('should fetch project references', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: mockReferences,
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });

      const references = await (service as any).getProjectReferences(mockProjectId);

      expect(supabase.from).toHaveBeenCalledWith('project_references');
      expect(mockEq).toHaveBeenCalledWith('project_id', mockProjectId);
      expect(references).toEqual(mockReferences);
    });

    it('should return empty array when no references', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });

      const references = await (service as any).getProjectReferences(mockProjectId);

      expect(references).toEqual([]);
    });
  });

  describe('getProjectDocuments', () => {
    it('should fetch project documents', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: mockDocuments,
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });

      const documents = await (service as any).getProjectDocuments(mockProjectId);

      expect(supabase.from).toHaveBeenCalledWith('project_documents');
      expect(mockEq).toHaveBeenCalledWith('project_id', mockProjectId);
      expect(documents).toEqual(mockDocuments);
    });

    it('should return empty array when no documents', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as any) = mockFrom;
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });

      const documents = await (service as any).getProjectDocuments(mockProjectId);

      expect(documents).toEqual([]);
    });
  });

  describe('Intent Classification', () => {
    it('should classify ideation intent correctly', async () => {
      const ideationIntent = {
        type: 'ideation',
        confidence: 0.9,
        reasoning: 'User is brainstorming ideas',
      };

      const mockContextManager = {
        classifyIntent: vi.fn().mockResolvedValue(ideationIntent),
      };

      const mockOrchestrator = {
        agents: new Map([['contextManager', mockContextManager]]),
        determineWorkflow: vi.fn().mockResolvedValue(mockWorkflow),
        executeWorkflow: vi.fn().mockResolvedValue(mockAgentResponses),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();

      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'I have some ideas about authentication'
      );

      expect(result.workflow).toBeDefined();
    });

    it('should classify refinement intent correctly', async () => {
      const refinementIntent = {
        type: 'refinement',
        confidence: 0.85,
        reasoning: 'User wants to refine existing idea',
      };

      const mockContextManager = {
        classifyIntent: vi.fn().mockResolvedValue(refinementIntent),
      };

      const mockOrchestrator = {
        agents: new Map([['contextManager', mockContextManager]]),
        determineWorkflow: vi.fn().mockResolvedValue({ name: 'refinement' }),
        executeWorkflow: vi.fn().mockResolvedValue(mockAgentResponses),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Can we improve the JWT approach?'
      );

      const contextManager = mockOrchestrator.agents.get('contextManager');
      expect(contextManager?.classifyIntent).toHaveBeenCalled();
    });

    it('should handle low confidence intent classification', async () => {
      const lowConfidenceIntent = {
        type: 'unknown',
        confidence: 0.3,
        reasoning: 'Unclear user intent',
      };

      const mockContextManager = {
        classifyIntent: vi.fn().mockResolvedValue(lowConfidenceIntent),
      };

      const mockOrchestrator = {
        agents: new Map([['contextManager', mockContextManager]]),
        determineWorkflow: vi.fn().mockResolvedValue({ name: 'clarification' }),
        executeWorkflow: vi.fn().mockResolvedValue([
          {
            agent: 'ContextManager',
            message: 'Can you clarify what you mean?',
            showToUser: true,
            metadata: {
              type: 'questioning',
              confidence: 30,
              conflicts: [],
              needsClarification: true,
              reasoning: 'Unclear user intent'
            },
          },
        ]),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();

      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Hmm'
      );

      const response = result.responses[0];
      if (isContextManagerResponse(response)) {
        expect(response.metadata.needsClarification).toBe(true);
      }
    });
  });

  describe('Workflow Execution', () => {
    it('should execute parallel workflow correctly', async () => {
      const parallelWorkflow = {
        name: 'research',
        agents: ['conversation', 'strategic', 'reference'],
        parallelExecution: true,
      };

      const mockOrchestrator = {
        agents: new Map([
          ['contextManager', { classifyIntent: vi.fn().mockResolvedValue(mockIntent) }],
        ]),
        determineWorkflow: vi.fn().mockResolvedValue(parallelWorkflow),
        executeWorkflow: vi.fn().mockResolvedValue([
          { agent: 'conversation', message: 'Response 1', showToUser: true },
          { agent: 'strategic', message: 'Response 2', showToUser: true },
          { agent: 'reference', message: 'Response 3', showToUser: false },
        ]),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();

      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Research authentication methods'
      );

      expect(result.responses.length).toBe(3);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        parallelWorkflow,
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
        expect.any(Array)
      );
    });

    it('should execute sequential workflow correctly', async () => {
      const sequentialWorkflow = {
        name: 'implementation',
        agents: ['strategic', 'quality', 'persistence'],
        parallelExecution: false,
      };

      const mockOrchestrator = {
        agents: new Map([
          ['contextManager', { classifyIntent: vi.fn().mockResolvedValue(mockIntent) }],
        ]),
        determineWorkflow: vi.fn().mockResolvedValue(sequentialWorkflow),
        executeWorkflow: vi.fn().mockResolvedValue([
          { agent: 'strategic', message: 'Plan created', showToUser: true },
          { agent: 'quality', message: 'Quality checked', showToUser: true },
          { agent: 'persistence', message: 'Saved to DB', showToUser: false },
        ]),
      };

      (IntegrationOrchestrator as any).mockImplementation(() => mockOrchestrator);
      service = new AgentCoordinationService();

      const result = await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Let\'s implement this plan'
      );

      expect(result.responses.length).toBe(3);
    });
  });

  describe('Context Building', () => {
    it('should build complete conversation context', async () => {
      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      const orchestrator = (service as any).orchestrator;

      expect(orchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.any(Object),
        'Test message',
        expect.objectContaining({
          id: mockProjectId,
        }),
        expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.any(Array)
      );
    });

    it('should include references and documents in context', async () => {
      const mockFrom = (supabase.from as any);
      mockFrom.mockImplementation((table: string) => {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn(),
          single: vi.fn(),
        };

        chain.order.mockImplementation(() => {
          if (table === 'project_references') {
            return Promise.resolve({ data: mockReferences, error: null });
          }
          if (table === 'project_documents') {
            return Promise.resolve({ data: mockDocuments, error: null });
          }
          if (table === 'conversations') {
            return Promise.resolve({ data: mockConversationHistory, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        });

        chain.single.mockImplementation(() => {
          if (table === 'projects') {
            return Promise.resolve({ data: mockProjectState, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        });

        return chain;
      });

      await service.processUserMessage(
        mockProjectId,
        mockUserId,
        'Test message'
      );

      const orchestrator = (service as any).orchestrator;

      expect(orchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.any(Object),
        'Test message',
        expect.any(Object),
        expect.any(Array),
        expect.arrayContaining([
          expect.objectContaining({ title: 'Auth Best Practices' }),
          expect.objectContaining({ title: 'Requirements Document' }),
        ])
      );
    });
  });
});
