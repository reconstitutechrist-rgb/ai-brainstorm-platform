// ============================================================================
// BRANDED TYPES FOR TYPE SAFETY
// ============================================================================

/**
 * Branded type for UUIDs - provides compile-time type safety
 * without runtime overhead
 */
export type UUID = string & { readonly __brand: 'UUID' };

/**
 * Branded type for ISO date strings
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Helper to create a UUID (compile-time only, no runtime validation)
 */
export const asUUID = (id: string): UUID => id as UUID;

/**
 * Helper to create an ISO date string
 */
export const asISODateString = (date: string): ISODateString => date as ISODateString;

// ============================================================================
// TYPE GUARDS AND ASSERTION FUNCTIONS
// ============================================================================

/**
 * Exhaustive check helper - ensures all cases are handled in switch statements
 * This provides compile-time safety for discriminated unions
 */
export function assertNever(x: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${JSON.stringify(x)}`);
}

/**
 * Type guard to check if a value is a valid UUID format
 */
export function isUUID(value: unknown): value is UUID {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard to check if a value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is ISODateString {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

/**
 * Assertion function for non-null values
 */
export function assertDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * Assertion function for UUIDs
 */
export function assertUUID(value: unknown, message?: string): asserts value is UUID {
  if (!isUUID(value)) {
    throw new Error(message || `Invalid UUID: ${value}`);
  }
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

// Project types
export interface Project {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string;
  status: 'decided' | 'exploring' | 'parked' | 'rejected';
  items: ProjectItem[];
  clusters?: ClusterMetadata[]; // Canvas cluster metadata
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ClusterMetadata {
  id: string;
  name: string;
  color: string;
  description?: string;
  position: { x: number; y: number };
}

/**
 * Type guard for position object
 */
export function isPosition(value: unknown): value is { x: number; y: number } {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.x === 'number' && typeof obj.y === 'number';
}

/**
 * Type guard for ClusterMetadata
 */
export function isClusterMetadata(value: unknown): value is ClusterMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.color === 'string' &&
    isPosition(obj.position)
  );
}

export interface ProjectItem {
  id: string;
  text: string;
  state: 'decided' | 'exploring' | 'parked' | 'rejected';
  created_at: string;
  citation?: {
    userQuote: string;
    timestamp: string;
    confidence: number;
  };
  // Canvas-specific fields (optional for backward compatibility)
  position?: { x: number; y: number };  // Canvas position
  tags?: string[];                       // For filtering/search
  confidence?: number;                   // 0-100, from AI
  clusterId?: string;                    // For grouping
  isArchived?: boolean;                  // Archive flag
  archivedAt?: string;                   // Archive timestamp (ISO string)
}

/**
 * Type guard for ProjectItem state
 */
export function isProjectItemState(value: unknown): value is ProjectItem['state'] {
  return value === 'decided' || value === 'exploring' || value === 'parked' || value === 'rejected';
}

/**
 * Type guard for ProjectItem
 */
export function isProjectItem(value: unknown): value is ProjectItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    isProjectItemState(obj.state) &&
    typeof obj.created_at === 'string' &&
    (obj.position === undefined || isPosition(obj.position)) &&
    (obj.tags === undefined || (Array.isArray(obj.tags) && obj.tags.every(t => typeof t === 'string'))) &&
    (obj.confidence === undefined || typeof obj.confidence === 'number') &&
    (obj.clusterId === undefined || typeof obj.clusterId === 'string') &&
    (obj.isArchived === undefined || typeof obj.isArchived === 'boolean')
  );
}

/**
 * Assertion function for ProjectItem
 */
export function assertProjectItem(value: unknown, message?: string): asserts value is ProjectItem {
  if (!isProjectItem(value)) {
    throw new Error(message || 'Invalid ProjectItem object');
  }
}

/**
 * Type guard for array of ProjectItems
 */
export function isProjectItemArray(value: unknown): value is ProjectItem[] {
  return Array.isArray(value) && value.every(isProjectItem);
}

// ============================================================================
// AGENT QUESTION TYPES
// ============================================================================

/**
 * Agent question importance levels
 */
export type AgentQuestionImportance = 'critical' | 'high' | 'medium' | 'low';

/**
 * Agent question interface - shared across components
 */
export interface AgentQuestion {
  id: string;
  question: string;
  importance: AgentQuestionImportance;
  category: string;
  showInBubble: boolean;
  answered?: boolean;
  timestamp?: ISODateString;
  messageId?: string;
}

/**
 * Type guard for AgentQuestion
 */
export function isAgentQuestion(value: unknown): value is AgentQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.question === 'string' &&
    (obj.importance === 'critical' || obj.importance === 'high' ||
     obj.importance === 'medium' || obj.importance === 'low') &&
    typeof obj.category === 'string' &&
    typeof obj.showInBubble === 'boolean'
  );
}

/**
 * Type guard for array of AgentQuestions
 */
export function isAgentQuestionArray(value: unknown): value is AgentQuestion[] {
  return Array.isArray(value) && value.every(isAgentQuestion);
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Strict metadata interface for Message - no index signature
 */
export interface MessageMetadata {
  agent?: string;
  fallback?: boolean;
  agentQuestions?: AgentQuestion[];
  isQuestion?: boolean;
  questionType?: 'gap_clarification' | 'exploration' | 'clarification' | 'deepening';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  showAgentBubble?: boolean;
  inputAnalysis?: {
    detailLevel: 'high' | 'medium' | 'low';
    wordCount: number;
    specificsDetected: number;
    mentionedTech?: string[];
  };
}

/**
 * Type guard for MessageMetadata
 */
export function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check optional fields have correct types if present
  if (obj.agent !== undefined && typeof obj.agent !== 'string') return false;
  if (obj.fallback !== undefined && typeof obj.fallback !== 'boolean') return false;
  if (obj.agentQuestions !== undefined && !isAgentQuestionArray(obj.agentQuestions)) return false;
  if (obj.isQuestion !== undefined && typeof obj.isQuestion !== 'boolean') return false;
  if (obj.showAgentBubble !== undefined && typeof obj.showAgentBubble !== 'boolean') return false;

  return true;
}

// Message types
export interface Message {
  id: string;
  project_id: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
  created_at: string;
}

/**
 * Type guard for Message
 */
export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.project_id === 'string' &&
    (obj.role === 'user' || obj.role === 'assistant' || obj.role === 'system') &&
    typeof obj.content === 'string' &&
    typeof obj.created_at === 'string' &&
    (obj.metadata === undefined || isMessageMetadata(obj.metadata))
  );
}

/**
 * Assertion function for Message
 */
export function assertMessage(value: unknown, message?: string): asserts value is Message {
  if (!isMessage(value)) {
    throw new Error(message || 'Invalid Message object');
  }
}

// Reference types
export interface Reference {
  id: string; // UUID format
  project_id: string; // UUID format
  user_id: string; // UUID format from auth.users
  url: string; // URL to file in Supabase Storage (column name is 'url' not 'file_url')
  filename: string;
  type?: string; // Type of reference (image, video, document, etc.)
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  tags?: string[]; // Tags for organizing references (e.g., 'competitor', 'requirement', 'design')
  is_favorite?: boolean; // Whether this reference is pinned/favorited
  metadata?: {
    type?: 'image' | 'video' | 'document' | 'product';
    analysis?: string; // AI-generated analysis
    description?: string;
    mimeType?: string;
    storagePath?: string;
    fileSize?: number;
    contextualAnalysis?: any;
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
  // Add current counts for live display (not delta from last session)
  currentDecided: number;
  currentExploring: number;
  currentParked: number;
  totalItems: number;
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
