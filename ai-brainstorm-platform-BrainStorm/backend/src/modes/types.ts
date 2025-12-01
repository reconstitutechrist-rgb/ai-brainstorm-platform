/**
 * Simplified Mode System - Types
 *
 * This replaces the complex 9-agent orchestration with 3 simple modes.
 * Each mode is just a different prompt strategy for the same Claude API.
 */

export type Mode = 'brainstorm' | 'decide' | 'export';

export type ExportFormat = 'summary' | 'prd' | 'tasks' | 'roadmap';

export interface Item {
  id: string;
  text: string;
  type: 'idea' | 'decision';
  tags?: string[];
  createdAt: string;
}

export interface ConversationContext {
  projectId: string;
  projectTitle: string;
  ideas: Item[];
  decisions: Item[];
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ModeResponse {
  message: string;
  extractedItems: Item[];
  mode: Mode;
  metadata?: {
    conflictWarning?: string;
    exportFormat?: ExportFormat;
  };
}

export interface SimpleChatRequest {
  message: string;
  projectId: string;
  userId: string;
}

export interface SimpleChatResponse {
  success: boolean;
  data?: ModeResponse;
  error?: string;
}
