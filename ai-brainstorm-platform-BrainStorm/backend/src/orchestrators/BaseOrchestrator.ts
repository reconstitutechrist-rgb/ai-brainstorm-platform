/**
 * BaseOrchestrator - Abstract base class for page-specific orchestrators
 *
 * Provides shared functionality including:
 * - QualityAuditorAgent integration
 * - Project items fetching
 * - Text similarity calculations
 * - Logging utilities
 */

import { QualityAuditorAgent } from '../agents/qualityAuditor';
import {
  getProjectItems as fetchProjectItems,
  getRawProjectItems,
  ProjectItem,
} from '../utils/projectHelpers';
import {
  calculateJaccardSimilarity,
  getDuplicateRecommendation,
  findBestMatch,
} from '../utils/textSimilarity';

export abstract class BaseOrchestrator {
  protected qualityAuditor: QualityAuditorAgent;
  protected orchestratorName: string;

  constructor(orchestratorName: string) {
    this.orchestratorName = orchestratorName;
    this.qualityAuditor = new QualityAuditorAgent();
  }

  /**
   * Get project items with full transformation
   * Sorted by state priority (decided > exploring > parked)
   */
  protected async getProjectItems(projectId: string): Promise<ProjectItem[]> {
    try {
      return await fetchProjectItems(projectId);
    } catch (error) {
      this.logError('Error fetching project items', error);
      return [];
    }
  }

  /**
   * Get raw project items without transformation
   * Useful when you need the original format
   */
  protected async getRawProjectItems(projectId: string): Promise<any[]> {
    try {
      return await getRawProjectItems(projectId);
    } catch (error) {
      this.logError('Error fetching raw project items', error);
      return [];
    }
  }

  /**
   * Calculate text similarity between two strings
   */
  protected calculateTextSimilarity(text1: string, text2: string): number {
    return calculateJaccardSimilarity(text1, text2);
  }

  /**
   * Get recommendation for duplicate handling
   */
  protected getRecommendation(
    similarity: number,
    itemState: string
  ): 'skip' | 'merge' | 'extract_anyway' {
    return getDuplicateRecommendation(similarity, itemState);
  }

  /**
   * Find the best matching item from a list
   */
  protected findBestMatch<T>(
    text: string,
    candidates: T[],
    textExtractor: (candidate: T) => string
  ): { item: T; similarity: number } | null {
    return findBestMatch(text, candidates, textExtractor);
  }

  /**
   * Log an operation with consistent formatting
   */
  protected log(operation: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[${this.orchestratorName}] ${operation}:`, data);
    } else {
      console.log(`[${this.orchestratorName}] ${operation}`);
    }
  }

  /**
   * Log an error with consistent formatting
   */
  protected logError(operation: string, error: any): void {
    console.error(`[${this.orchestratorName}] ${operation}:`, error);
  }
}

// Re-export ProjectItem for convenience
export { ProjectItem };
