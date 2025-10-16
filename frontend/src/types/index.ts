// Project types
export interface Project {
  id: string; // UUID format
  user_id: string; // UUID format from auth.users
  title: string;
  description: string;
  status: 'decided' | 'exploring' | 'parked';
  items: ProjectItem[];
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  text: string;
  state: 'decided' | 'exploring' | 'parked';
  created_at: string;
  citation?: {
    userQuote: string;
    timestamp: string;
    confidence: number;
  };
}

// Message types
export interface Message {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id?: string; // UUID format, nullable for system messages
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    agent?: string; // Name of AI agent that generated the message (stored in metadata, not separate column)
    fallback?: boolean;
    [key: string]: any;
  };
  created_at: string;
}

// Reference types
export interface Reference {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format from auth.users
  url: string; // URL to file in Supabase Storage (column name is 'url' not 'file_url')
  filename?: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    type?: 'image' | 'video' | 'document' | 'product';
    analysis?: string; // AI-generated analysis
    description?: string;
    mimeType?: string;
    storagePath?: string;
    fileSize?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'quality' | 'support' | 'meta';
  status: 'active' | 'inactive';
}

export interface AgentActivity {
  id: string; // UUID format
  project_id: string; // UUID format
  agent_type: string;
  action: string;
  details: any;
  created_at: string;
}

// Document types
export interface DocumentFolder {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format from auth.users
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format from auth.users
  folder_id?: string; // UUID format, nullable
  file_url: string; // URL to file in Supabase Storage
  filename: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  metadata?: {
    storagePath?: string;
    originalName?: string;
    uploadedAt?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  folder?: DocumentFolder; // Joined data when requested
}

// Session types
export interface UserSession {
  id: string; // UUID format
  user_id: string;
  project_id: string; // UUID format
  session_start: string;
  session_end?: string;
  is_active: boolean;
  snapshot_at_start: ProjectState;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SessionAnalytics {
  id: string; // UUID format
  user_id: string;
  project_id: string; // UUID format
  last_activity: string;
  previous_activity?: string;
  items_decided_since_last: number;
  items_exploring: number;
  items_parked: number;
  pending_questions: number;
  suggested_next_steps: SuggestedStep[];
  active_blockers: Blocker[];
  analytics_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  lastSession: string;
  itemsDecided: number;
  itemsExploring: number;
  itemsParked: number;
  totalDecided: number;
  pendingQuestions: number;
  suggestedNextSteps: SuggestedStep[];
  activeBlockers: Blocker[];
}

export interface SuggestedStep {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  blocksOthers: boolean;
}

export interface Blocker {
  id: string;
  text: string;
  type: 'information' | 'decision' | 'clarification';
  blockedItems: string[];
}

export interface ProjectState {
  decided: Array<{
    id: string;
    text: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
  exploring: Array<{
    id: string;
    text: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
  parked: Array<{
    id: string;
    text: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
