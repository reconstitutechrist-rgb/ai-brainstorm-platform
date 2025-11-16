/**
 * Agent Type Definitions
 *
 * This file provides type-safe interfaces for all AI agents in the system.
 * Uses discriminated unions to enable TypeScript to infer metadata types
 * based on the agent name.
 */

// ============================================================================
// PERSISTENCE MANAGER AGENT
// ============================================================================

export interface RecordInput {
  userId: string;
  projectId: string;
  decision: string;
  context?: string;
  tags?: string[];
}

export interface RecordFromReviewInput {
  userId: string;
  projectId: string;
  review: string;
  originalItems: any[];
}

export interface TrackChangeInput {
  userId: string;
  projectId: string;
  changeDescription: string;
  affectedItems?: string[];
}

export interface VerifyPersistenceInput {
  userId: string;
  projectId: string;
  itemId?: string;
}

export interface PersistenceMetadata {
  recorded?: boolean;
  itemId?: string;
  itemIds?: string[];
  state?: 'decided' | 'exploring' | 'parked';
  verificationStatus?: 'verified' | 'pending' | 'failed';
  changes?: Array<{
    itemId: string;
    changeType: string;
    description: string;
  }>;

  // Multi-item recording fields
  itemsToRecord?: Array<{
    item: string;
    state: 'decided' | 'exploring' | 'parked' | 'rejected';
    userQuote: string;
    confidence: number;
    reasoning: string;
    verified: boolean;
    versionInfo: {
      versionNumber: number;
      changeType: string;
      reasoning: string;
    };
  }>;
  recordedCount?: number;
  recordingSummary?: string;

  // Single-item recording fields (backward compatibility)
  verified?: boolean;
  shouldRecord?: boolean;
  item?: string;
  confidence?: number;
  reasoning?: string;
  versionInfo?: {
    versionNumber: number;
    changeType: string;
    reasoning: string;
  };

  // Tracking fields
  tracked?: boolean;
  versionRecord?: {
    itemId: string;
    versionNumber: number;
    content: string;
    timestamp: string;
    changeType: string;
    reasoning: string;
    triggeredBy: string;
    previousVersion: number | null;
  };

  // Verification fields
  approved?: boolean;
  issues?: string[];
  recommendation?: string;
}

export interface PersistenceManagerResponse {
  agent: 'PersistenceManager';
  message: string;
  showToUser: boolean;
  metadata: PersistenceMetadata;
}

// ============================================================================
// CONVERSATION AGENT
// ============================================================================

export interface ConversationInput {
  userId: string;
  projectId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AnalyzeInput {
  userId: string;
  projectId: string;
  topic: string;
  context?: string;
}

export interface ReflectInput {
  userId: string;
  projectId: string;
  sessionSummary: string;
}

export interface GenerateQuestionInput {
  userId: string;
  projectId: string;
  topic: string;
  questionType?: 'clarification' | 'exploration' | 'deepening';
}

export interface ConversationMetadata {
  mode?: 'exploration' | 'clarification' | 'generation' | 'refinement';
  confidence?: number;
  extractedIdeas?: Array<{
    text: string;
    confidence: number;
    category?: string;
  }>;
  suggestedFollowUps?: string[];
  isQuestion?: boolean;
  requiresUserInput?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'curious';

  // Response characteristics
  hasQuestion?: boolean;
  isSimpleApproval?: boolean;
  isCorrection?: boolean;
  isGenerative?: boolean;
  wasRetried?: boolean;
  originalViolation?: string;
  questionType?: 'gap_clarification' | 'exploration' | 'clarification' | 'deepening';
  priority?: 'critical' | 'high' | 'medium' | 'low';

  // Gap analysis fields
  gaps?: Array<{
    category: string;
    description: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    question: string;
  }>;
  summary?: string;
  criticalCount?: number;
  hasGaps?: boolean;
  hasCriticalGaps?: boolean;
  agentQuestions?: Array<{
    question: string;
    importance: string;
    category: string;
    showInBubble: boolean;
  }>;
  showAgentBubble?: boolean;
  // Input analysis for adaptive responses
  inputAnalysis?: {
    detailLevel: 'high' | 'medium' | 'low';
    wordCount: number;
    specificsDetected: number;
    mentionedTech?: string[];
  };
}

export interface ConversationAgentResponse {
  agent: 'ConversationAgent';
  message: string;
  showToUser: boolean;
  metadata: ConversationMetadata;
}

// ============================================================================
// CONTEXT MANAGER AGENT
// ============================================================================

export interface ClassifyIntentInput {
  userId: string;
  projectId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ContextManagerMetadata is the same as IntentClassification for backward compatibility
export interface ContextManagerMetadata {
  type: 'brainstorming' | 'deciding' | 'modifying' | 'questioning' | 'exploring' | 'parking' | 'reviewing' | 'development' | 'document_research' | 'general';
  confidence: number;
  stateChange?: {
    type: 'move' | 'add' | 'delete';
    from?: 'decided' | 'exploring' | 'parked';
    to?: 'decided' | 'exploring' | 'parked';
    item: string;
  } | null;
  conflicts?: string[];
  needsClarification: boolean;
  reasoning: string;
}

export interface ContextManagerResponse {
  agent: 'ContextManager';
  message: string;
  showToUser: boolean;
  metadata: ContextManagerMetadata;
}

// ============================================================================
// QUALITY AUDITOR AGENT
// ============================================================================

export interface VerifyQualityInput {
  userId: string;
  projectId: string;
  itemId?: string;
  checkType?: 'completeness' | 'consistency' | 'clarity' | 'all';
}

export interface ScanInput {
  userId: string;
  projectId: string;
  scanDepth?: 'quick' | 'thorough';
}

export interface AuditInput {
  userId: string;
  projectId: string;
  auditScope?: 'recent' | 'all' | 'flagged';
}

export interface QualityAuditorMetadata {
  qualityScore?: number;
  issues?: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    itemId?: string;
  }>;
  recommendations?: string[];
  auditComplete?: boolean;

  // Verification fields
  approved?: boolean;
  confidence?: number;
  reasoning?: string;
  recommendation?: string;

  // Assumption scanning fields
  assumptionsDetected?: boolean;
  assumptions?: Array<{
    detail: string;
    explicitStatement?: string;
    severity: 'critical' | 'high' | 'medium';
    recommendation?: string;
  }>;

  // Audit fields
  overallStatus?: 'accurate' | 'needs_review' | 'has_errors';
  auditTimestamp?: string;
  recordsAudited?: number;

  // Consistency check fields
  conflictDetected?: boolean;
  conflicts?: Array<{
    type: string;
    description: string;
    severity?: string;
    newItem?: string;
    conflictsWith?: string;
    source?: string;
    referenceFile?: string;
    explanation?: string;
    resolutionOptions?: string[];
  }>;

  // Reference integration fields
  referenceIntegration?: {
    confirmations?: any[];
    conflicts?: any[];
    newInsights?: any[];
    conflictDetected?: boolean;
  };
  referenceName?: string;
  hasConflicts?: boolean;
  hasConfirmations?: boolean;
  hasNewInsights?: boolean;
}

export interface QualityAuditorResponse {
  agent: 'QualityAuditor';
  message: string;
  showToUser: boolean;
  metadata: QualityAuditorMetadata;
}

// ============================================================================
// STRATEGIC PLANNER AGENT
// ============================================================================

export interface TranslateInput {
  userId: string;
  projectId: string;
  userRequest: string;
}

export interface ResearchInput {
  userId: string;
  projectId: string;
  topic: string;
  depth?: 'overview' | 'detailed' | 'comprehensive';
}

export interface GenerateRFPInput {
  userId: string;
  projectId: string;
  projectScope: string;
}

export interface PrioritizeInput {
  userId: string;
  projectId: string;
  items: string[];
  criteria?: string;
}

export interface StrategicPlannerMetadata {
  plan?: {
    steps: Array<{
      order: number;
      action: string;
      agent: string;
      estimatedDuration?: string;
    }>;
    goals?: string[];
    risks?: string[];
  };
  priorities?: Array<{
    item: string;
    priority: number;
    rationale: string;
  }>;
  researchFindings?: {
    summary: string;
    sources?: string[];
    confidence: number;
  };

  // Translation fields
  translationComplete?: boolean;
  translatedRequirements?: any[];
  documentType?: string;

  // Research fields
  researchCompleted?: boolean;
  researchSummary?: string;
  documentGeneration?: string;

  // Comprehensive plan fields
  comprehensivePlan?: {
    translation?: any;
    research?: any;
    rfp?: any;
    prioritization?: any;
    nextRecommended?: string;
    criticalPath?: string[];
    quickWins?: string[];
    blockers?: string[];
  };
  nextRecommended?: string;
  criticalPath?: string[];
  quickWins?: string[];
  blockers?: string[];
}

export interface StrategicPlannerResponse {
  agent: 'StrategicPlanner';
  message: string;
  showToUser: boolean;
  metadata: StrategicPlannerMetadata;
}

// ============================================================================
// REFERENCE ANALYSIS AGENT
// ============================================================================

export interface AnalyzeReferencesInput {
  userId: string;
  projectId: string;
  documentId?: string;
  analysisType?: 'connections' | 'gaps' | 'quality';
}

export interface ReferenceAnalysisMetadata {
  connections?: Array<{
    sourceId: string;
    targetId: string;
    relationshipType: string;
    strength: number;
  }>;
  gaps?: Array<{
    area: string;
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  quality?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
  };

  // Reference analysis fields
  analysisCompleted?: boolean;
  referenceType?: string;
  referenceData?: any;
  referenceName?: string;
  contextualAnalysis?: string;
  hadExtractedContent?: boolean;
  contentType?: string;
  templateUsed?: {
    id: string;
    name: string;
    type?: string;
  };
  hasConflicts?: boolean;
  hasConfirmations?: boolean;
  hasNewInsights?: boolean;
  usedVision?: boolean;
  structuredAnalysis?: any;
  outputFormat?: string;
  analysisType?: string;
  structuredData?: any;
}

export interface ReferenceAnalysisResponse {
  agent: 'ReferenceAnalysis';
  message: string;
  showToUser: boolean;
  metadata: ReferenceAnalysisMetadata;
}

// ============================================================================
// REVIEWER AGENT
// ============================================================================

export interface ReviewInput {
  userId: string;
  projectId: string;
  content: string;
  reviewType?: 'technical' | 'creative' | 'comprehensive';
}

export interface ReviewerMetadata {
  reviewScore?: number;
  findings?: Array<{
    category: string;
    observation: string;
    suggestion?: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  overallAssessment?: string;
  actionItems?: string[];
}

export interface ReviewerResponse {
  agent: 'Reviewer';
  message: string;
  showToUser: boolean;
  metadata: ReviewerMetadata;
}

// ============================================================================
// RESOURCE MANAGER AGENT
// ============================================================================

export interface ManageResourcesInput {
  userId: string;
  projectId: string;
  action: 'allocate' | 'deallocate' | 'optimize' | 'report';
  resourceType?: string;
}

export interface ResourceManagerMetadata {
  resources?: Array<{
    type: string;
    allocated: number;
    available: number;
    unit: string;
  }>;
  recommendations?: Array<{
    action: string;
    reason: string;
    expectedBenefit: string;
  }>;
  utilizationScore?: number;
}

export interface ResourceManagerResponse {
  agent: 'ResourceManager';
  message: string;
  showToUser: boolean;
  metadata: ResourceManagerMetadata;
}

// ============================================================================
// UNIFIED RESEARCH AGENT
// ============================================================================

export interface UnifiedResearchInput {
  userId: string;
  projectId: string;
  query: string;
  sources?: string[];
  depth?: 'quick' | 'standard' | 'comprehensive';
}

export interface UnifiedResearchMetadata {
  findings?: Array<{
    source: string;
    content: string;
    confidence: number;
    relevance: number;
  }>;
  synthesis?: string;
  contradictions?: Array<{
    sources: string[];
    description: string;
  }>;
  gaps?: string[];
  confidence?: number;

  // Document suggestion fields (for document_discovery intent)
  suggestedDocuments?: Array<{
    templateId: string;
    templateName: string;
    category: string;
    relevance: number;
    reasoning: string;
  }>;

  // Gap identification fields (for gap_analysis intent)
  identifiedGaps?: Array<{
    area: string;
    severity: string;
    description: string;
  }>;
}

export interface UnifiedResearchResponse {
  agent: 'UnifiedResearch';
  message: string;
  showToUser: boolean;
  metadata: UnifiedResearchMetadata;
}

// ============================================================================
// DISCRIMINATED UNION TYPE
// ============================================================================

/**
 * Discriminated union of all agent responses.
 * TypeScript can narrow the type based on the `agent` field,
 * providing type-safe access to agent-specific metadata.
 */
export type AgentResponse =
  | PersistenceManagerResponse
  | ConversationAgentResponse
  | ContextManagerResponse
  | QualityAuditorResponse
  | StrategicPlannerResponse
  | ReferenceAnalysisResponse
  | ReviewerResponse
  | ResourceManagerResponse
  | UnifiedResearchResponse;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard utilities for safe metadata access
 */

export function isPersistenceManagerResponse(
  response: AgentResponse
): response is PersistenceManagerResponse {
  return response.agent === 'PersistenceManager';
}

export function isConversationAgentResponse(
  response: AgentResponse
): response is ConversationAgentResponse {
  return response.agent === 'ConversationAgent';
}

export function isContextManagerResponse(
  response: AgentResponse
): response is ContextManagerResponse {
  return response.agent === 'ContextManager';
}

export function isQualityAuditorResponse(
  response: AgentResponse
): response is QualityAuditorResponse {
  return response.agent === 'QualityAuditor';
}

export function isStrategicPlannerResponse(
  response: AgentResponse
): response is StrategicPlannerResponse {
  return response.agent === 'StrategicPlanner';
}

export function isReferenceAnalysisResponse(
  response: AgentResponse
): response is ReferenceAnalysisResponse {
  return response.agent === 'ReferenceAnalysis';
}

export function isReviewerResponse(
  response: AgentResponse
): response is ReviewerResponse {
  return response.agent === 'Reviewer';
}

export function isResourceManagerResponse(
  response: AgentResponse
): response is ResourceManagerResponse {
  return response.agent === 'ResourceManager';
}

export function isUnifiedResearchResponse(
  response: AgentResponse
): response is UnifiedResearchResponse {
  return response.agent === 'UnifiedResearch';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract the metadata type for a specific agent
 */
export type MetadataForAgent<T extends AgentResponse['agent']> = Extract<
  AgentResponse,
  { agent: T }
>['metadata'];

/**
 * Extract the full response type for a specific agent
 */
export type ResponseForAgent<T extends AgentResponse['agent']> = Extract<
  AgentResponse,
  { agent: T }
>;

/**
 * All possible agent names
 */
export type AgentName = AgentResponse['agent'];
