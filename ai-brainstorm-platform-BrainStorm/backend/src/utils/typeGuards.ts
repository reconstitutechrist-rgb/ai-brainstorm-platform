/**
 * Type Guard Utilities
 *
 * Provides type-safe narrowing functions for discriminated unions
 * and exhaustive switch statement helpers.
 */

import {
  AgentResponse,
  QualityAuditorResponse,
  QualityAuditorMetadata,
  isQualityAuditorResponse,
} from '../types/agents';

/**
 * Assert that a value is never - used for exhaustive switch statements
 * Throws an error if called, indicating unhandled case
 *
 * @example
 * switch (agent.agent) {
 *   case 'QualityAuditor': // handle
 *   case 'ConversationAgent': // handle
 *   default: assertNever(agent);
 * }
 */
export function assertNever(x: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${JSON.stringify(x)}`);
}

/**
 * Safe type guard for QualityAuditor responses
 * Narrows AgentResponse to QualityAuditorResponse
 */
export function isQualityAuditorResponseSafe(
  response: AgentResponse
): response is QualityAuditorResponse {
  return isQualityAuditorResponse(response);
}

/**
 * Extract QualityAuditor metadata safely with type narrowing
 * Returns the metadata if it's a QualityAuditor response, otherwise undefined
 */
export function getQualityAuditorMetadata(
  response: AgentResponse
): QualityAuditorMetadata | undefined {
  if (isQualityAuditorResponse(response)) {
    return response.metadata;
  }
  return undefined;
}

/**
 * Helper to safely extract verification results from QualityAuditor response
 */
export interface VerificationResult {
  approved: boolean;
  issues: string[];
  reasoning?: string;
  recommendation?: string;
}

export function extractVerificationResult(
  response: AgentResponse
): VerificationResult {
  const metadata = getQualityAuditorMetadata(response);
  if (!metadata) {
    return { approved: false, issues: ['Invalid response type'] };
  }

  return {
    approved: metadata.approved !== false,
    issues: metadata.issues?.map((i) => i.description) || [],
    reasoning: metadata.reasoning,
    recommendation: metadata.recommendation,
  };
}

/**
 * Helper to safely extract assumption scan results from QualityAuditor response
 */
export interface AssumptionScanResult {
  assumptionsDetected: boolean;
  assumptions: Array<{
    detail: string;
    severity: 'critical' | 'high' | 'medium';
    recommendation?: string;
  }>;
}

export function extractAssumptionScanResult(
  response: AgentResponse
): AssumptionScanResult {
  const metadata = getQualityAuditorMetadata(response);
  if (!metadata) {
    return { assumptionsDetected: false, assumptions: [] };
  }

  return {
    assumptionsDetected: metadata.assumptionsDetected || false,
    assumptions: metadata.assumptions || [],
  };
}

/**
 * Helper to safely extract consistency check results from QualityAuditor response
 */
export interface ConsistencyCheckResult {
  conflictDetected: boolean;
  conflicts: Array<{
    type: string;
    description: string;
    severity?: string;
    explanation?: string;
    resolutionOptions?: string[];
  }>;
}

export function extractConsistencyCheckResult(
  response: AgentResponse
): ConsistencyCheckResult {
  const metadata = getQualityAuditorMetadata(response);
  if (!metadata) {
    return { conflictDetected: false, conflicts: [] };
  }

  return {
    conflictDetected: metadata.conflictDetected || false,
    conflicts: metadata.conflicts || [],
  };
}

/**
 * Helper to safely extract audit results from QualityAuditor response
 */
export interface AuditResult {
  overallStatus: 'accurate' | 'needs_review' | 'has_errors';
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  recordsAudited?: number;
}

export function extractAuditResult(response: AgentResponse): AuditResult {
  const metadata = getQualityAuditorMetadata(response);
  if (!metadata) {
    return { overallStatus: 'has_errors', issues: [] };
  }

  return {
    overallStatus: metadata.overallStatus || 'needs_review',
    issues: metadata.issues || [],
    recordsAudited: metadata.recordsAudited,
  };
}

/**
 * Convert null to undefined for type safety
 * Useful when mapping between types that use null vs undefined
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if an array is non-empty
 */
export function isNonEmptyArray<T>(arr: T[] | undefined | null): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}
