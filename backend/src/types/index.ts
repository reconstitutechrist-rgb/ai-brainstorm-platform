// Project types
export interface Project {
  id: string; // UUID format
  user_id: string; // UUID format from auth.users (stored as TEXT for compatibility)
  title: string;
  description: string;
  status: 'decided' | 'exploring' | 'parked';
  items?: ProjectItem[]; // Added items field for three-column state
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  text: string;
  state: 'decided' | 'exploring' | 'parked';
  created_at: string;
  metadata?: Record<string, any>;
}

// Message types
export interface Message {
  id: string; // UUID format
  project_id: string; // UUID format (NOT NULL in database)
  user_id?: string; // UUID format, nullable for system messages
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_type?: string; // Name of AI agent that generated the message
  metadata?: Record<string, any>;
  created_at: string;
}

// Conversation types (deprecated - using project_id directly in messages)
export interface Conversation {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format
  created_at: string;
  updated_at: string;
}

// Project State types
export interface ProjectState {
  decided: StateItem[];
  exploring: StateItem[];
  parked: StateItem[];
}

export interface StateItem {
  id: string;
  text: string;
  created_at: string;
  metadata?: any;
}

// Reference types
export interface Reference {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format from auth.users
  url: string; // URL to file in Supabase Storage (column name is 'url' not 'file_url')
  filename?: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  tags?: string[]; // Tags for organizing references (e.g., 'competitor', 'requirement', 'design')
  is_favorite?: boolean; // Whether this reference is pinned/favorited
  metadata?: Record<string, any>; // Contains: type, analysis, description, mimeType, storagePath, fileSize
  created_at: string;
  updated_at: string;
}

// Agent types
export interface AgentResponse {
  agent: string;
  message: string;
  showToUser: boolean;
  metadata?: any;
}

export interface IntentClassification {
  type: 'brainstorming' | 'deciding' | 'modifying' | 'questioning' | 'exploring' | 'parking' | 'reviewing' | 'development' | 'document_research' | 'general';
  confidence: number;
  stateChange?: StateChange;
  conflicts?: string[];
  needsClarification: boolean;
  reasoning: string;
}

export interface StateChange {
  type: 'move' | 'add' | 'delete';
  from?: 'decided' | 'exploring' | 'parked';
  to?: 'decided' | 'exploring' | 'parked';
  item: string;
}

// Agent workflow types
export interface WorkflowStep {
  agentName: string;
  action: string;
  context?: any;
  condition?: string;
  parallel?: boolean; // If true, can execute in parallel with next steps in same group
}

export interface Workflow {
  intent: string;
  sequence: WorkflowStep[];
  timestamp: string;
  confidence: number;
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

export interface SuggestedStep {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  reason?: string;
  blocksOthers?: boolean;
  blockedCount?: number;
}

export interface Blocker {
  id: string;
  text: string;
  type: 'decision' | 'information' | 'clarification';
  blockedItems: string[];
}

export interface SessionSummary {
  lastSession: string; // Human-readable time
  itemsDecided: number; // New items decided since last session
  itemsExploring: number; // Current exploring items
  itemsParked: number; // Current parked items
  totalDecided: number; // Total decided items
  // Add current counts for live display (not delta from last session)
  currentDecided: number; // Total decided items in project right now
  currentExploring: number; // Total exploring items in project right now
  currentParked: number; // Total parked items in project right now
  totalItems: number; // Total items across all states
  pendingQuestions: number;
  suggestedNextSteps: SuggestedStep[];
  activeBlockers: Blocker[];
}

// Express Request extension for authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        access_token?: string;
        email?: string;
      };
    }
  }
}
