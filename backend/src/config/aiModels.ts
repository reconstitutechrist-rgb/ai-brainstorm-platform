/**
 * AI Model Configuration
 *
 * Centralized configuration for AI models used across the application.
 * This allows for flexible model selection based on task complexity and performance requirements.
 */

/**
 * Available Claude models
 */
export const AI_MODELS = {
  /**
   * Claude Haiku 3.5 - Fast and cost-effective
   * Best for: Simple classifications, validations, structured outputs
   * Speed: 3-5x faster than Sonnet
   * Cost: $0.80 per 1M input tokens (73% cheaper than Sonnet)
   */
  HAIKU: 'claude-3-5-haiku-20241022',

  /**
   * Claude Sonnet 4 - Balanced performance and quality
   * Best for: Complex reasoning, document generation, conversations
   * Speed: Standard
   * Cost: $3.00 per 1M input tokens
   */
  SONNET: 'claude-sonnet-4-20250514',

  /**
   * Claude Opus 3 - Highest quality (currently not used)
   * Best for: Critical tasks requiring maximum reasoning capability
   * Speed: Slower than Sonnet
   * Cost: $15.00 per 1M input tokens
   */
  OPUS: 'claude-3-opus-20240229'
} as const;

/**
 * Operation types mapped to appropriate models
 * This allows granular control over which model is used for specific operations
 */
export const OPERATION_MODEL_CONFIG = {
  // Fast operations - Use Haiku for speed and cost efficiency
  'intent-classification': AI_MODELS.HAIKU,
  'gap-detection': AI_MODELS.HAIKU,
  'assumption-scanning': AI_MODELS.HAIKU,
  'simple-validation': AI_MODELS.HAIKU,
  'structure-parsing': AI_MODELS.HAIKU,
  'relevance-check': AI_MODELS.HAIKU,

  // Standard operations - Use Sonnet for quality
  'conversation': AI_MODELS.SONNET,
  'brainstorming': AI_MODELS.SONNET,
  'idea-generation': AI_MODELS.SONNET,
  'clarification': AI_MODELS.SONNET,
  'reflection': AI_MODELS.SONNET,

  // Complex operations - Use Sonnet for reasoning
  'document-generation': AI_MODELS.SONNET,
  'synthesis': AI_MODELS.SONNET,
  'strategic-planning': AI_MODELS.SONNET,
  'research': AI_MODELS.SONNET,
  'analysis': AI_MODELS.SONNET,
  'quality-audit': AI_MODELS.SONNET,

  // Default fallback
  'default': AI_MODELS.SONNET
} as const;

/**
 * Agent-specific model configuration
 * Maps agent names to their default models
 */
export const AGENT_MODEL_CONFIG = {
  // Core agents
  'contextManager': AI_MODELS.HAIKU,          // Intent classification - runs on EVERY message
  'conversation': AI_MODELS.SONNET,            // Main conversation handling
  'persistenceManager': AI_MODELS.SONNET,      // Data persistence and versioning
  'qualityAuditor': AI_MODELS.SONNET,          // Quality checks (mixed - some operations could use Haiku)
  'strategicPlanner': AI_MODELS.SONNET,        // Strategic planning and research

  // Support agents
  'referenceAnalysis': AI_MODELS.SONNET,       // File and document analysis
  'reviewer': AI_MODELS.SONNET,                // Conversation and document review
  'resourceManager': AI_MODELS.SONNET,         // Resource organization
  'unifiedResearch': AI_MODELS.SONNET,         // Web and document research

  // Specialized agents
  'ideaGenerator': AI_MODELS.SONNET,           // Idea generation
  'conversationalIdea': AI_MODELS.SONNET,      // Conversational idea refinement
  'synthesis': AI_MODELS.SONNET,               // Cross-source synthesis

  // Default for any unlisted agent
  'default': AI_MODELS.SONNET
} as const;

/**
 * Get the appropriate model for an operation type
 */
export function getModelForOperation(operationType: keyof typeof OPERATION_MODEL_CONFIG | 'default'): string {
  return OPERATION_MODEL_CONFIG[operationType] || OPERATION_MODEL_CONFIG.default;
}

/**
 * Get the appropriate model for an agent
 */
export function getModelForAgent(agentName: string): string {
  // Normalize agent name (remove 'Agent' suffix if present)
  const normalizedName = agentName.replace(/Agent$/, '');

  // Try exact match first
  if (normalizedName in AGENT_MODEL_CONFIG) {
    return AGENT_MODEL_CONFIG[normalizedName as keyof typeof AGENT_MODEL_CONFIG];
  }

  // Try case-insensitive match
  const lowerName = normalizedName.toLowerCase();
  for (const [key, value] of Object.entries(AGENT_MODEL_CONFIG)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // Return default if no match
  return AGENT_MODEL_CONFIG.default;
}

/**
 * Override model based on environment variable
 * Useful for testing or temporary configuration changes
 */
export function getModelWithEnvOverride(
  defaultModel: string,
  envVarName?: string
): string {
  if (envVarName && process.env[envVarName]) {
    return process.env[envVarName]!;
  }
  return defaultModel;
}

/**
 * Model performance characteristics
 * Useful for logging and monitoring
 */
export const MODEL_CHARACTERISTICS = {
  [AI_MODELS.HAIKU]: {
    name: 'Claude Haiku 3.5',
    speed: 'fast',
    cost: 'low',
    quality: 'good',
    bestFor: ['classification', 'validation', 'structured-output'],
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00
  },
  [AI_MODELS.SONNET]: {
    name: 'Claude Sonnet 4',
    speed: 'medium',
    cost: 'medium',
    quality: 'excellent',
    bestFor: ['reasoning', 'generation', 'analysis'],
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00
  },
  [AI_MODELS.OPUS]: {
    name: 'Claude Opus 3',
    speed: 'slow',
    cost: 'high',
    quality: 'outstanding',
    bestFor: ['critical-tasks', 'complex-reasoning'],
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00
  }
} as const;

/**
 * Get estimated cost for a model call
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const characteristics = MODEL_CHARACTERISTICS[model as keyof typeof MODEL_CHARACTERISTICS];
  if (!characteristics) {
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * characteristics.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * characteristics.outputCostPer1M;

  return inputCost + outputCost;
}
