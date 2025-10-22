/**
 * Phase 3 Configuration
 * Configurable thresholds for Document Research and Research Suggestions
 *
 * These values can be overridden via environment variables.
 */

export interface Phase3Config {
  // Document Re-examination Thresholds
  reexamination: {
    significantChangeThreshold: number; // Number of items changed to trigger re-examination
    contentTruncationLength: number; // Max chars for AI diff analysis
  };

  // Research Coverage Scoring
  coverageScoring: {
    highPriorityPenalty: number; // Penalty points for each high-priority gap
    mediumPriorityPenalty: number; // Penalty points for each medium-priority gap
    baseScoreWeight: number; // Max base score from research/item ratio (0-70)
    qualityBonus: number; // Bonus points for good coverage (0-30)
  };

  // API Request Timeouts (milliseconds)
  timeouts: {
    documentGeneration: number; // Timeout for Claude document generation
    gapAnalysis: number; // Timeout for gap detection
    changeIdentification: number; // Timeout for diff analysis
  };
}

const defaultConfig: Phase3Config = {
  reexamination: {
    significantChangeThreshold: parseInt(
      process.env.REEXAM_CHANGE_THRESHOLD || '3',
      10
    ),
    contentTruncationLength: parseInt(
      process.env.REEXAM_CONTENT_TRUNCATION || '3000',
      10
    ),
  },

  coverageScoring: {
    highPriorityPenalty: parseInt(
      process.env.COVERAGE_HIGH_PENALTY || '15',
      10
    ),
    mediumPriorityPenalty: parseInt(
      process.env.COVERAGE_MEDIUM_PENALTY || '5',
      10
    ),
    baseScoreWeight: parseInt(
      process.env.COVERAGE_BASE_WEIGHT || '70',
      10
    ),
    qualityBonus: parseInt(
      process.env.COVERAGE_QUALITY_BONUS || '30',
      10
    ),
  },

  timeouts: {
    documentGeneration: parseInt(
      process.env.TIMEOUT_DOC_GEN || '60000',
      10
    ),
    gapAnalysis: parseInt(
      process.env.TIMEOUT_GAP_ANALYSIS || '30000',
      10
    ),
    changeIdentification: parseInt(
      process.env.TIMEOUT_CHANGE_ID || '15000',
      10
    ),
  },
};

/**
 * Get Phase 3 configuration with environment variable overrides
 */
export const getPhase3Config = (): Phase3Config => {
  return defaultConfig;
};

/**
 * Validate configuration values
 */
export const validatePhase3Config = (config: Phase3Config): boolean => {
  // Ensure thresholds are positive
  if (config.reexamination.significantChangeThreshold < 1) {
    console.warn('⚠️ significantChangeThreshold must be >= 1, using default: 3');
    return false;
  }

  if (config.reexamination.contentTruncationLength < 100) {
    console.warn('⚠️ contentTruncationLength must be >= 100, using default: 3000');
    return false;
  }

  // Ensure scoring values are reasonable
  if (
    config.coverageScoring.highPriorityPenalty < 0 ||
    config.coverageScoring.mediumPriorityPenalty < 0
  ) {
    console.warn('⚠️ Penalty values must be >= 0');
    return false;
  }

  // Ensure timeouts are reasonable (min 5 seconds, max 5 minutes)
  const timeouts = Object.values(config.timeouts);
  if (timeouts.some((t) => t < 5000 || t > 300000)) {
    console.warn('⚠️ Timeouts must be between 5000ms and 300000ms');
    return false;
  }

  return true;
};

// Export singleton instance
export const phase3Config = getPhase3Config();

// Validate on startup
if (!validatePhase3Config(phase3Config)) {
  console.error('❌ Phase 3 configuration validation failed, using defaults');
}

console.log('✅ Phase 3 Configuration Loaded:');
console.log('  - Re-examination threshold:', phase3Config.reexamination.significantChangeThreshold, 'items');
console.log('  - Content truncation:', phase3Config.reexamination.contentTruncationLength, 'chars');
console.log('  - High priority penalty:', phase3Config.coverageScoring.highPriorityPenalty, 'points');
console.log('  - Medium priority penalty:', phase3Config.coverageScoring.mediumPriorityPenalty, 'points');
