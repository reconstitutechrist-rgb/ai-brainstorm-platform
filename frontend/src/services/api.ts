import axios from 'axios';
import type { Project, Message, Reference, Agent, Document, DocumentFolder, UserSession, SessionAnalytics, SessionSummary, SuggestedStep, Blocker } from '../types';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 seconds for slow AI agent responses
});

// Add authentication token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting session for API request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear session and redirect to login
      console.error('Authentication failed - session may be expired');
      // You can add additional logic here, like redirecting to login
    }
    return Promise.reject(error);
  }
);

// Projects API
export const projectsApi = {
  getAll: async (userId: string) => {
    const response = await api.get<{ success: boolean; projects: Project[] }>(
      `/projects/user/${userId}`
    );
    return response.data;
  },

  getById: async (projectId: string) => {
    const response = await api.get<{ success: boolean; project: Project }>(
      `/projects/${projectId}`
    );
    return response.data;
  },

  create: async (data: { title: string; description: string; userId: string }) => {
    const response = await api.post<{ success: boolean; project: Project }>(
      '/projects',
      data
    );
    return response.data;
  },

  update: async (projectId: string, updates: Partial<Project>) => {
    const response = await api.patch<{ success: boolean; project: Project }>(
      `/projects/${projectId}`,
      updates
    );
    return response.data;
  },

  delete: async (projectId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/projects/${projectId}`
    );
    return response.data;
  },

  getSuggestions: async (projectId: string) => {
    const response = await api.get<{
      success: boolean;
      suggestions: Array<{
        id: string;
        type: 'action' | 'decision' | 'insight' | 'question';
        title: string;
        description: string;
        reasoning: string;
        priority: 'high' | 'medium' | 'low';
        agentType: string;
        actionData?: any;
      }>;
    }>(`/projects/${projectId}/suggestions`);
    return response.data;
  },
};

// Conversations API
export const conversationsApi = {
  sendMessage: async (projectId: string, message: string, userId: string) => {
    console.log('📡 conversationsApi.sendMessage called');
    console.log('  - Full URL:', `${API_BASE_URL}/conversations/${projectId}/message`);
    console.log('  - Payload:', { message, userId });

    try {
      const response = await api.post<{
        success: boolean;
        userMessage: Message;
        agentMessages: Message[];
        updates: any;
        workflow: any;
      }>(`/conversations/${projectId}/message`, { message, userId });

      console.log('📡 conversationsApi.sendMessage success:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('📡 conversationsApi.sendMessage ERROR:', error);
      console.error('  - Error message:', error.message);
      console.error('  - Error response:', error.response?.data);
      console.error('  - Error status:', error.response?.status);
      throw error;
    }
  },

  getMessages: async (projectId: string, limit?: number) => {
    const response = await api.get<{ success: boolean; messages: Message[] }>(
      `/conversations/${projectId}/messages`,
      { params: { limit } }
    );
    return response.data;
  },

  clearMessages: async (projectId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/conversations/${projectId}/messages`
    );
    return response.data;
  },
};

// References API
export const referencesApi = {
  upload: async (projectId: string, userId: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('userId', userId);
    if (description) formData.append('description', description);

    const response = await api.post<{ success: boolean; reference: Reference; message: string }>(
      '/references/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Batch upload multiple files
  uploadBatch: async (projectId: string, userId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('projectId', projectId);
    formData.append('userId', userId);

    const response = await api.post<{
      success: boolean;
      message: string;
      results: Array<{
        success: boolean;
        filename: string;
        reference?: Reference;
        error?: string;
      }>;
      summary: {
        total: number;
        succeeded: number;
        failed: number;
      };
    }>(
      '/references/upload-batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for batch uploads
      }
    );
    return response.data;
  },

  getByProject: async (projectId: string) => {
    const response = await api.get<{ success: boolean; references: Reference[] }>(
      `/references/project/${projectId}`
    );
    return response.data;
  },

  getById: async (referenceId: string) => {
    const response = await api.get<{ success: boolean; reference: Reference }>(
      `/references/${referenceId}`
    );
    return response.data;
  },

  delete: async (referenceId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/references/${referenceId}`
    );
    return response.data;
  },

  // Retrigger analysis for a reference
  retriggerAnalysis: async (referenceId: string) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/references/${referenceId}/retrigger-analysis`
    );
    return response.data;
  },

  // Update reference tags
  updateTags: async (referenceId: string, tags: string[]) => {
    const response = await api.patch<{ success: boolean; reference: Reference }>(
      `/references/${referenceId}/tags`,
      { tags }
    );
    return response.data;
  },

  // Toggle favorite status
  toggleFavorite: async (referenceId: string, is_favorite: boolean) => {
    const response = await api.patch<{ success: boolean; reference: Reference }>(
      `/references/${referenceId}/favorite`,
      { is_favorite }
    );
    return response.data;
  },

  // Trigger reference validation workflow
  validateReference: async (referenceId: string, projectId: string) => {
    const response = await api.post<{
      success: boolean;
      validation: {
        conflicts: any[];
        confirmations: any[];
        newInsights: any[];
      };
      message: string;
    }>('/references/validate', { referenceId, projectId });
    return response.data;
  },

  // Resolve a conflict
  resolveConflict: async (data: {
    referenceId: string;
    projectId: string;
    conflictIndex: number;
    resolution: 'update' | 'keep' | 'clarify';
    userChoice?: string;
  }) => {
    const response = await api.post<{ success: boolean; updatedDecision?: any; message: string }>(
      '/references/resolve-conflict',
      data
    );
    return response.data;
  },

  // Phase 4.2: Analyze reference with project context (Mode 2)
  analyzeWithContext: async (referenceId: string, projectId: string) => {
    const response = await api.post<{
      success: boolean;
      contextAnalysis: {
        conflicts: Array<{
          decidedItem: string;
          referenceContent: string;
          severity: 'critical' | 'high' | 'medium';
        }>;
        confirmations: Array<{
          decidedItem: string;
          referenceSupport: string;
        }>;
        newInsights: Array<{
          insight: string;
          relevance: 'high' | 'medium' | 'low';
        }>;
      };
      message: string;
    }>(`/references/${referenceId}/analyze-with-context`, { projectId });
    return response.data;
  },

  // Phase 4.2: Analyze reference with template (Mode 3)
  analyzeWithTemplate: async (referenceId: string, templateId: string) => {
    const response = await api.post<{
      success: boolean;
      templateAnalysis: {
        templateInfo: {
          id: string;
          name: string;
          type: string;
        };
        outputFormat: string;
        structuredData: any;
        result: string;
      };
      message: string;
    }>(`/references/${referenceId}/analyze-with-template`, { templateId });
    return response.data;
  },

  // Get available analysis templates
  getAnalysisTemplates: async () => {
    const response = await api.get<{
      success: boolean;
      templates: Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        fields: any[];
      }>;
      count: number;
    }>('/analysis-templates');
    return response.data;
  },
};

// Agents API
export const agentsApi = {
  getList: async () => {
    const response = await api.get<{ success: boolean; agents: Agent[]; totalCount: number }>(
      '/agents/list'
    );
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<{ success: boolean; stats: any }>(
      '/agents/stats'
    );
    return response.data;
  },

  getActivity: async (projectId: string, limit?: number) => {
    const response = await api.get<{ success: boolean; activity: any[] }>(
      `/agents/activity/${projectId}`,
      { params: { limit } }
    );
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  // Folder operations
  createFolder: async (projectId: string, userId: string, name: string, description?: string) => {
    const response = await api.post<{ success: boolean; folder: DocumentFolder }>(
      '/documents/folders',
      { projectId, userId, name, description }
    );
    return response.data;
  },

  getFolders: async (projectId: string) => {
    const response = await api.get<{ success: boolean; folders: DocumentFolder[] }>(
      `/documents/folders/${projectId}`
    );
    return response.data;
  },

  updateFolder: async (folderId: string, name: string) => {
    const response = await api.patch<{ success: boolean; folder: DocumentFolder }>(
      `/documents/folders/${folderId}`,
      { name }
    );
    return response.data;
  },

  deleteFolder: async (folderId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/documents/folders/${folderId}`
    );
    return response.data;
  },

  // Document operations
  upload: async (projectId: string, userId: string, file: File, folderId?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('userId', userId);
    if (folderId) formData.append('folderId', folderId);
    if (description) formData.append('description', description);

    const response = await api.post<{ success: boolean; document: Document }>(
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getByProject: async (projectId: string) => {
    const response = await api.get<{ success: boolean; documents: Document[] }>(
      `/documents/project/${projectId}`
    );
    return response.data;
  },

  getById: async (documentId: string) => {
    const response = await api.get<{ success: boolean; document: Document }>(
      `/documents/${documentId}`
    );
    return response.data;
  },

  update: async (documentId: string, updates: { folderId?: string; description?: string }) => {
    const response = await api.patch<{ success: boolean; document: Document }>(
      `/documents/${documentId}`,
      updates
    );
    return response.data;
  },

  delete: async (documentId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/documents/${documentId}`
    );
    return response.data;
  },
};

// Sessions API
export const sessionsApi = {
  // Start a new session
  startSession: async (userId: string, projectId: string) => {
    const response = await api.post<{ success: boolean; data: UserSession }>(
      '/sessions/start',
      { userId, projectId }
    );
    return response.data;
  },

  // End the current active session
  endSession: async (userId: string, projectId: string) => {
    const response = await api.post<{ success: boolean; message: string }>(
      '/sessions/end',
      { userId, projectId }
    );
    return response.data;
  },

  // Get session summary
  getSummary: async (userId: string, projectId: string) => {
    const response = await api.get<{ success: boolean; data: SessionSummary }>(
      `/sessions/summary/${userId}/${projectId}`
    );
    return response.data;
  },

  // Get analytics
  getAnalytics: async (userId: string, projectId: string) => {
    const response = await api.get<{ success: boolean; data: SessionAnalytics }>(
      `/sessions/analytics/${userId}/${projectId}`
    );
    return response.data;
  },

  // Track user activity (fire and forget)
  trackActivity: async (userId: string, projectId: string) => {
    try {
      await api.post<{ success: boolean; message: string }>(
        '/sessions/track-activity',
        { userId, projectId }
      );
    } catch (error) {
      // Silently fail - this is a background operation
      console.debug('Activity tracking failed:', error);
    }
  },

  // Get suggested next steps
  getSuggestedSteps: async (projectId: string) => {
    const response = await api.get<{ success: boolean; data: SuggestedStep[] }>(
      `/sessions/suggested-steps/${projectId}`
    );
    return response.data;
  },

  // Get active blockers
  getBlockers: async (projectId: string) => {
    const response = await api.get<{ success: boolean; data: Blocker[] }>(
      `/sessions/blockers/${projectId}`
    );
    return response.data;
  },

  // Get session history for a project
  getHistory: async (projectId: string) => {
    const response = await api.get<{ success: boolean; sessions: UserSession[] }>(
      `/sessions/history/${projectId}`
    );
    return response.data;
  },
};

// Sandbox API
export const sandboxApi = {
  create: async (data: { projectId: string; userId: string; name: string }) => {
    const response = await api.post<{ success: boolean; sandbox: any }>(
      '/sandbox/create',
      data
    );
    return response.data;
  },

  generateIdeas: async (data: {
    sandboxId: string;
    projectContext: string;
    currentDecisions: any[];
    direction?: string;
    quantity?: number;
  }) => {
    const response = await api.post<{ success: boolean; ideas: any[] }>(
      '/sandbox/generate-ideas',
      data
    );
    return response.data;
  },

  refineIdea: async (data: { ideaId: string; idea: any; refinementDirection: string }) => {
    const response = await api.post<{ success: boolean; refinedIdea: any }>(
      '/sandbox/refine-idea',
      data
    );
    return response.data;
  },

  combineIdeas: async (data: { ideas: any[] }) => {
    const response = await api.post<{ success: boolean; combinations: any[] }>(
      '/sandbox/combine-ideas',
      data
    );
    return response.data;
  },

  extractIdeas: async (data: { sandboxId: string; selectedIdeaIds: string[] }) => {
    const response = await api.post<{ success: boolean; extractedIdeas: any[] }>(
      '/sandbox/extract-ideas',
      data
    );
    return response.data;
  },

  saveAsAlternative: async (data: { sandboxId: string; alternativeName: string }) => {
    const response = await api.post<{ success: boolean; alternative: any }>(
      '/sandbox/save-as-alternative',
      data
    );
    return response.data;
  },

  discard: async (sandboxId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/sandbox/${sandboxId}`
    );
    return response.data;
  },

  getByProject: async (projectId: string) => {
    const response = await api.get<{ success: boolean; sandboxes: any[] }>(
      `/sandbox/project/${projectId}`
    );
    return response.data;
  },

  // Conversational sandbox methods
  startConversation: async (data: { sandboxId: string; projectContext: any }) => {
    const response = await api.post<{ success: boolean; conversation: any }>(
      '/sandbox/conversation/start',
      data
    );
    return response.data;
  },

  sendMessage: async (data: { conversationId: string; userMessage: string; mode?: string }) => {
    const response = await api.post<{
      success: boolean;
      message: any;
      extractedIdeas: any[];
      suggestedActions: any[];
      modeShift?: string;
    }>('/sandbox/conversation/message', data);
    return response.data;
  },

  getConversation: async (conversationId: string) => {
    const response = await api.get<{ success: boolean; conversation: any }>(
      `/sandbox/conversation/${conversationId}`
    );
    return response.data;
  },

  updateIdeaStatus: async (data: { ideaId: string; conversationId: string; status: string }) => {
    const response = await api.patch<{ success: boolean; idea: any }>(
      `/sandbox/conversation/idea/${data.ideaId}/status`,
      { conversationId: data.conversationId, status: data.status }
    );
    return response.data;
  },

  extractFromConversation: async (data: { conversationId: string; selectedIdeaIds: string[] }) => {
    const response = await api.post<{ success: boolean; extractedIdeas: any[] }>(
      '/sandbox/conversation/extract',
      data
    );
    return response.data;
  },
};

// Generated Documents API (AI-generated project documentation)
export const generatedDocumentsApi = {
  // Get all generated documents for a project
  getByProject: async (projectId: string) => {
    const response = await api.get<{ success: boolean; documents: any[] }>(
      `/generated-documents/project/${projectId}`
    );
    return response.data;
  },

  // Get a specific generated document by ID
  getById: async (documentId: string) => {
    const response = await api.get<{ success: boolean; document: any }>(
      `/generated-documents/${documentId}`
    );
    return response.data;
  },

  // Generate or regenerate all documents for a project
  generate: async (projectId: string) => {
    const response = await api.post<{ success: boolean; documents: any[]; message: string }>(
      '/generated-documents/generate',
      { projectId }
    );
    return response.data;
  },

  // Generate a document from research query results (Phase 3.1)
  generateFromResearch: async (researchQueryId: string, documentType: string, userId?: string) => {
    const response = await api.post<{ success: boolean; document: any; message: string }>(
      '/generated-documents/generate-from-research',
      { researchQueryId, documentType, userId }
    );
    return response.data;
  },

  // Delete a generated document
  delete: async (documentId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/generated-documents/${documentId}`
    );
    return response.data;
  },

  // VERSION MANAGEMENT

  // Get version history for a document
  getVersionHistory: async (documentId: string) => {
    const response = await api.get<{ success: boolean; versions: any[] }>(
      `/generated-documents/${documentId}/versions`
    );
    return response.data;
  },

  // Get a specific version of a document
  getVersion: async (documentId: string, versionNumber: number) => {
    const response = await api.get<{ success: boolean; version: any }>(
      `/generated-documents/${documentId}/versions/${versionNumber}`
    );
    return response.data;
  },

  // Get diff between two versions
  getDiff: async (documentId: string, fromVersion: number, toVersion: number) => {
    const response = await api.get<{ success: boolean; diff: any }>(
      `/generated-documents/${documentId}/diff?from=${fromVersion}&to=${toVersion}`
    );
    return response.data;
  },

  // Rollback to a specific version
  rollback: async (documentId: string, versionNumber: number) => {
    const response = await api.post<{ success: boolean; document: any; message: string }>(
      `/generated-documents/${documentId}/rollback`,
      { versionNumber }
    );
    return response.data;
  },

  // Generate AI summary of changes between versions
  generateChangeSummary: async (documentId: string, fromVersion: number, toVersion: number) => {
    const response = await api.post<{ success: boolean; summary: string }>(
      `/generated-documents/${documentId}/change-summary`,
      { fromVersion, toVersion }
    );
    return response.data;
  },

  // SMART FEATURES

  // Get AI-powered document recommendations for a project
  getRecommendations: async (projectId: string) => {
    const response = await api.get<{ success: boolean; recommendations: any[] }>(
      `/generated-documents/recommendations/${projectId}`
    );
    return response.data;
  },

  // Get quality score for a document
  getQualityScore: async (documentId: string) => {
    const response = await api.get<{ success: boolean; qualityScore: any }>(
      `/generated-documents/${documentId}/quality-score`
    );
    return response.data;
  },

  // Save a document preview to the project
  savePreview: async (data: {
    projectId: string;
    title: string;
    content: string;
    format: string;
    metadata?: any;
  }) => {
    const response = await api.post<{
      success: boolean;
      document: any;
      message: string;
    }>('/generated-documents/save-preview', data);
    return response.data;
  },
};

// Canvas API
export const canvasApi = {
  // Apply clustering to canvas
  applyClustering: async (projectId: string, clusters: any[]) => {
    const response = await api.post<{ success: boolean; project: Project; message: string }>(
      `/canvas/${projectId}/cluster`,
      { clusters }
    );
    return response.data;
  },

  // Archive cards
  archiveCards: async (projectId: string, cardIds: string[]) => {
    const response = await api.post<{ success: boolean; project: Project; message: string }>(
      `/canvas/${projectId}/archive`,
      { cardIds }
    );
    return response.data;
  },

  // Optimize layout
  optimizeLayout: async (projectId: string, layout: 'grid' | 'flow' | 'circular' = 'grid') => {
    const response = await api.post<{ success: boolean; project: Project; message: string }>(
      `/canvas/${projectId}/optimize-layout`,
      { layout }
    );
    return response.data;
  },
};

// Research API
export const researchApi = {
  submitQuery: async (data: {
    query: string;
    projectId: string;
    userId: string;
    maxSources?: number;
    saveResults?: boolean;
  }) => {
    const response = await api.post<{
      success: boolean;
      queryId: string;
      message: string;
    }>('/research/query', data);
    return response.data;
  },

  getQuery: async (queryId: string) => {
    const response = await api.get<{
      success: boolean;
      query: any;
      documents: any[];
    }>(`/research/query/${queryId}`);
    return response.data;
  },

  getProjectQueries: async (projectId: string) => {
    const response = await api.get<{
      success: boolean;
      queries: any[];
    }>(`/research/project/${projectId}/queries`);
    return response.data;
  },

  deleteQuery: async (queryId: string) => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/research/query/${queryId}`);
    return response.data;
  },
};

/**
 * Unified Research API (Phase 3.3)
 */
export const unifiedResearchApi = {
  /**
   * Start a unified research query
   * Searches across web + documents with intelligent source selection
   */
  submitQuery: async (data: {
    query: string;
    projectId: string;
    userId: string;
    sources?: 'web' | 'documents' | 'all' | 'auto';
    intent?: 'research' | 'document_discovery' | 'gap_analysis';
    maxWebSources?: number;
    maxDocumentSources?: number;
    saveResults?: boolean;
  }) => {
    const response = await api.post<{
      success: boolean;
      queryId: string;
      message: string;
    }>('/research/unified', data);
    return response.data;
  },

  /**
   * Get unified research query status and results
   */
  getQuery: async (queryId: string) => {
    const response = await api.get<{
      success: boolean;
      query: any;
      documents: any[];
    }>(`/research/query/${queryId}`);
    return response.data;
  },

  /**
   * Get all unified research queries for a project
   */
  getProjectQueries: async (projectId: string) => {
    const response = await api.get<{
      success: boolean;
      queries: any[];
    }>(`/research/project/${projectId}/queries`);
    return response.data;
  },

  /**
   * Delete a unified research query
   */
  deleteQuery: async (queryId: string) => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/research/query/${queryId}`);
    return response.data;
  },
};

// Session Review API (for sandbox session completion)
export const sessionReviewApi = {
  /**
   * Detect if user wants to end the brainstorm session
   */
  detectEndIntent: async (userMessage: string) => {
    const response = await api.post<{
      success: boolean;
      isEndIntent: boolean;
      confidence: number;
    }>('/session-review/detect-end-intent', { userMessage });
    return response.data;
  },

  /**
   * Generate review summary with grouped ideas
   */
  generateSummary: async (conversationId: string) => {
    const response = await api.post<{
      success: boolean;
      summary: any;
      topicGroups: any[];
    }>('/session-review/generate-summary', { conversationId });
    return response.data;
  },

  /**
   * Parse user's natural language decisions
   */
  parseDecisions: async (conversationId: string, userDecisions: string) => {
    const response = await api.post<{
      success: boolean;
      parsedDecisions: {
        accepted: any[];
        rejected: any[];
        unmarked: any[];
        confidence: number;
        needsClarification: boolean;
        clarificationQuestion?: string;
      };
    }>('/session-review/parse-decisions', { conversationId, userDecisions });
    return response.data;
  },

  /**
   * Generate final confirmation message
   */
  generateConfirmation: async (parsedDecisions: any) => {
    const response = await api.post<{
      success: boolean;
      confirmation: string;
    }>('/session-review/generate-confirmation', { parsedDecisions });
    return response.data;
  },

  /**
   * Finalize session and trigger document generation
   */
  finalizeSession: async (conversationId: string, finalDecisions: any) => {
    const response = await api.post<{
      success: boolean;
      sessionSummary: {
        success: boolean;
        sessionId: string;
        sessionName: string;
        documentsCreated: any[];
        documentsUpdated: any[];
        projectItemsAdded: number;
        itemsDetails: {
          decided: number;
          exploring: number;
        };
        sandboxStatus: string;
      };
    }>('/session-review/finalize', { conversationId, finalDecisions });
    return response.data;
  },

  /**
   * Cancel session review and return to active conversation
   */
  cancelReview: async (conversationId: string) => {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>('/session-review/cancel', { conversationId });
    return response.data;
  },
};

// Brainstorm Sessions API
export const brainstormSessionsApi = {
  /**
   * Get all brainstorm sessions for a project
   */
  getProjectSessions: async (projectId: string) => {
    const response = await api.get<{
      success: boolean;
      sessions: any[];
    }>(`/brainstorm-sessions/project/${projectId}`);
    return response.data;
  },

  /**
   * Get detailed information about a specific session
   */
  getSession: async (sessionId: string) => {
    const response = await api.get<{
      success: boolean;
      session: any;
    }>(`/brainstorm-sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get all documents created/updated by a specific session
   */
  getSessionDocuments: async (sessionId: string) => {
    const response = await api.get<{
      success: boolean;
      documents: {
        generated: any[];
        updated: any[];
      };
    }>(`/brainstorm-sessions/${sessionId}/documents`);
    return response.data;
  },

  /**
   * Archive a brainstorm session
   */
  archiveSession: async (sessionId: string) => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/brainstorm-sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get statistics about brainstorm sessions for a project
   */
  getStats: async (projectId: string) => {
    const response = await api.get<{
      success: boolean;
      stats: {
        totalSessions: number;
        totalAcceptedIdeas: number;
        totalRejectedIdeas: number;
        totalUnmarkedIdeas: number;
        mostRecentSession: any;
      };
    }>(`/brainstorm-sessions/stats/${projectId}`);
    return response.data;
  },
};

export default api;
