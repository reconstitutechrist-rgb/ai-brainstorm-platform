/**
 * SandboxOrchestrator - Page-Specific Orchestrator for SandboxPage
 *
 * Coordinates sandbox workflows with extraction validation and quality checks.
 * Prevents bad ideas from polluting the main project.
 */

import { QualityAuditorAgent } from '../agents/qualityAuditor';
import { supabase } from '../services/supabase';

interface SandboxContext {
  sandboxId: string;
  projectId: string;
  conversationId?: string;
}

interface SandboxIdea {
  id: string;
  title: string;
  description: string;
  reasoning?: string;
  tags?: string[];
  innovationLevel?: string;
  source?: string;
  status?: string;
  conversationContext?: any;
}

interface ExtractionContext {
  sandboxId: string;
  projectId: string;
  selectedIdeaIds: string[];
  verify?: boolean;
}

interface ExtractionResult {
  extractedItems: any[];
  validationReport?: {
    duplicates: DuplicateMatch[];
    conflicts: any[];
    assumptions: string[];
    verified: boolean;
  };
  metadata: {
    totalIdeas: number;
    extracted: number;
    duplicatesFound: number;
    conflictsFound: number;
  };
}

interface DuplicateMatch {
  sandboxIdeaId: string;
  sandboxIdeaTitle: string;
  projectItemId: string;
  projectItemText: string;
  similarity: number;
  recommendation: 'skip' | 'merge' | 'extract_anyway';
}

export class SandboxOrchestrator {
  private qualityAuditor: QualityAuditorAgent;

  constructor() {
    this.qualityAuditor = new QualityAuditorAgent();
  }

  /**
   * Extract ideas from sandbox to main project with validation
   * Supports Quick Extract (fast) and Verify & Extract (quality-checked)
   */
  async extractIdeas(context: ExtractionContext): Promise<ExtractionResult> {
    try {
      console.log('[SandboxOrchestrator] Extracting ideas:', {
        sandboxId: context.sandboxId,
        selectedCount: context.selectedIdeaIds.length,
        verify: context.verify,
      });

      // Step 1: Get sandbox and selected ideas
      const { sandbox, selectedIdeas } = await this.getSandboxIdeas(
        context.sandboxId,
        context.selectedIdeaIds
      );

      // Step 2: Get main project items for comparison
      const projectItems = await this.getProjectItems(context.projectId);

      // Step 3: Detect duplicates
      const duplicates = await this.detectDuplicates(selectedIdeas, projectItems);

      console.log('[SandboxOrchestrator] Found', duplicates.length, 'potential duplicates');

      // Step 4: Optional quality verification
      let validationReport: ExtractionResult['validationReport'] = undefined;
      if (context.verify) {
        validationReport = await this.verifyExtraction(
          selectedIdeas,
          projectItems,
          duplicates,
          context.projectId
        );
      }

      // Step 5: Filter out high-similarity duplicates (unless user explicitly wants them)
      const ideasToExtract = context.verify
        ? this.filterDuplicates(selectedIdeas, duplicates, validationReport)
        : selectedIdeas; // Quick mode: extract all selected ideas

      // Step 6: Convert sandbox ideas to project items
      const extractedItems = ideasToExtract.map((idea) => this.convertToProjectItem(idea, sandbox));

      // Step 7: Add to main project
      await this.addItemsToProject(context.projectId, extractedItems);

      const result: ExtractionResult = {
        extractedItems,
        validationReport,
        metadata: {
          totalIdeas: selectedIdeas.length,
          extracted: extractedItems.length,
          duplicatesFound: duplicates.length,
          conflictsFound: validationReport?.conflicts?.length || 0,
        },
      };

      console.log('[SandboxOrchestrator] Extraction complete:', result.metadata);

      return result;
    } catch (error) {
      console.error('[SandboxOrchestrator] Error extracting ideas:', error);
      throw error;
    }
  }

  /**
   * Quick extract mode (no verification)
   */
  async quickExtract(context: ExtractionContext): Promise<ExtractionResult> {
    return this.extractIdeas({ ...context, verify: false });
  }

  /**
   * Verify & extract mode (full quality checks)
   */
  async verifyAndExtract(context: ExtractionContext): Promise<ExtractionResult> {
    return this.extractIdeas({ ...context, verify: true });
  }

  /**
   * Get sandbox and selected ideas
   */
  private async getSandboxIdeas(
    sandboxId: string,
    selectedIdeaIds: string[]
  ): Promise<{ sandbox: any; selectedIdeas: SandboxIdea[] }> {
    try {
      const { data: sandbox, error } = await supabase
        .from('sandbox_sessions')
        .select('*')
        .eq('id', sandboxId)
        .single();

      if (error) throw error;

      if (!sandbox) {
        throw new Error('Sandbox not found');
      }

      const allIdeas = sandbox.sandbox_state?.ideas || [];

      const selectedIdeas = allIdeas.filter((idea: SandboxIdea) =>
        selectedIdeaIds.includes(idea.id)
      );

      return { sandbox, selectedIdeas };
    } catch (error) {
      console.error('[SandboxOrchestrator] Error fetching sandbox ideas:', error);
      throw error;
    }
  }

  /**
   * Get project items for comparison
   */
  private async getProjectItems(projectId: string): Promise<any[]> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      return project?.items || [];
    } catch (error) {
      console.error('[SandboxOrchestrator] Error fetching project items:', error);
      return [];
    }
  }

  /**
   * Detect duplicates using semantic similarity
   */
  private async detectDuplicates(
    sandboxIdeas: SandboxIdea[],
    projectItems: any[]
  ): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];

    for (const idea of sandboxIdeas) {
      const ideaText = `${idea.title} ${idea.description}`.toLowerCase();

      for (const item of projectItems) {
        const itemText = (item.text || '').toLowerCase();
        const similarity = this.calculateTextSimilarity(ideaText, itemText);

        if (similarity > 0.5) {
          // 50% similarity threshold
          const recommendation = this.getRecommendation(similarity, item.state);

          duplicates.push({
            sandboxIdeaId: idea.id,
            sandboxIdeaTitle: idea.title,
            projectItemId: item.id,
            projectItemText: item.text,
            similarity,
            recommendation,
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Calculate text similarity using simple word overlap
   * TODO: Replace with proper embedding-based similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 3));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get recommendation based on similarity and item state
   */
  private getRecommendation(
    similarity: number,
    itemState: string
  ): 'skip' | 'merge' | 'extract_anyway' {
    if (similarity > 0.8) {
      // Very high similarity
      return itemState === 'decided' ? 'skip' : 'merge';
    } else if (similarity > 0.65) {
      // High similarity
      return 'merge';
    } else {
      // Moderate similarity
      return 'extract_anyway';
    }
  }

  /**
   * Verify extraction with quality checks
   */
  private async verifyExtraction(
    sandboxIdeas: SandboxIdea[],
    projectItems: any[],
    duplicates: DuplicateMatch[],
    projectId: string
  ): Promise<{
    duplicates: DuplicateMatch[];
    conflicts: any[];
    assumptions: string[];
    verified: boolean;
  }> {
    console.log('[SandboxOrchestrator] Running quality checks on extraction');

    // Build extraction summary for quality check
    const extractionSummary = sandboxIdeas
      .map(
        (idea) =>
          `**${idea.title}**\n${idea.description}\n${idea.reasoning ? `Reasoning: ${idea.reasoning}` : ''}`
      )
      .join('\n\n');

    // Run quality checks in parallel
    const [assumptionScan, consistencyCheck] = await Promise.all([
      this.qualityAuditor.scan(
        { extractionContent: extractionSummary }
      ),
      this.qualityAuditor.checkConsistency(
        { extractionContent: extractionSummary },
        { decided: projectItems, exploring: [], parked: [] },
        []
      ),
    ]);

    const assumptions = assumptionScan.metadata?.assumptions || [];
    const conflicts = consistencyCheck.metadata?.conflicts || [];

    const verified = assumptions.length === 0 && conflicts.length === 0;

    console.log('[SandboxOrchestrator] Quality check results:', {
      assumptions: assumptions.length,
      conflicts: conflicts.length,
      verified,
    });

    return {
      duplicates,
      conflicts,
      assumptions,
      verified,
    };
  }

  /**
   * Filter duplicates based on recommendations
   */
  private filterDuplicates(
    sandboxIdeas: SandboxIdea[],
    duplicates: DuplicateMatch[],
    validationReport: any
  ): SandboxIdea[] {
    const skipIds = new Set(
      duplicates.filter((d) => d.recommendation === 'skip').map((d) => d.sandboxIdeaId)
    );

    return sandboxIdeas.filter((idea) => !skipIds.has(idea.id));
  }

  /**
   * Convert sandbox idea to project item format
   */
  private convertToProjectItem(idea: SandboxIdea, sandbox: any): any {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: `${idea.title}: ${idea.description}`,
      state: 'exploring', // Default to exploring when extracted from sandbox
      created_at: new Date().toISOString(),
      citation: {
        userQuote: 'Extracted from sandbox',
        timestamp: new Date().toISOString(),
        confidence: 85,
        source: 'sandbox',
      },
      metadata: {
        fromSandbox: true,
        sandboxId: sandbox.id,
        originalIdea: idea,
        tags: idea.tags || [],
        innovationLevel: idea.innovationLevel,
      },
    };
  }

  /**
   * Add items to main project
   */
  private async addItemsToProject(projectId: string, newItems: any[]): Promise<void> {
    try {
      // Get current items
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      if (!project) {
        throw new Error('Project not found');
      }

      const currentItems = project.items || [];
      const updatedItems = [...currentItems, ...newItems];

      // Update project
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          items: updatedItems,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      console.log('[SandboxOrchestrator] Added', newItems.length, 'items to project');
    } catch (error) {
      console.error('[SandboxOrchestrator] Error adding items to project:', error);
      throw error;
    }
  }

  /**
   * Analyze sandbox for conflicts with main project
   * Useful for showing warnings before extraction
   */
  async analyzeSandboxConflicts(context: SandboxContext): Promise<{
    conflicts: any[];
    duplicates: DuplicateMatch[];
    recommendations: string[];
  }> {
    try {
      console.log('[SandboxOrchestrator] Analyzing sandbox conflicts');

      // Get all sandbox ideas
      const { data: sandbox, error } = await supabase
        .from('sandbox_sessions')
        .select('*')
        .eq('id', context.sandboxId)
        .single();

      if (error) throw error;

      if (!sandbox) {
        throw new Error('Sandbox not found');
      }

      const allIdeas = sandbox.sandbox_state?.ideas || [];

      // Get project items
      const projectItems = await this.getProjectItems(context.projectId);

      // Detect duplicates
      const duplicates = await this.detectDuplicates(allIdeas, projectItems);

      // Run consistency check
      const ideaSummary = allIdeas
        .map((idea: SandboxIdea) => `${idea.title}: ${idea.description}`)
        .join('\n');

      const consistencyCheck = await this.qualityAuditor.checkConsistency(
        { sandboxContent: ideaSummary },
        { decided: projectItems, exploring: [], parked: [] },
        []
      );

      const conflicts = consistencyCheck.metadata?.conflicts || [];

      // Generate recommendations
      const recommendations: string[] = [];

      if (duplicates.length > 0) {
        const skipCount = duplicates.filter((d) => d.recommendation === 'skip').length;
        recommendations.push(
          `${duplicates.length} potential duplicates found (${skipCount} recommended to skip)`
        );
      }

      if (conflicts.length > 0) {
        recommendations.push(
          `${conflicts.length} conflicts detected with main project decisions`
        );
      }

      if (duplicates.length === 0 && conflicts.length === 0) {
        recommendations.push('All sandbox ideas are unique and conflict-free');
      }

      return {
        conflicts,
        duplicates,
        recommendations,
      };
    } catch (error) {
      console.error('[SandboxOrchestrator] Error analyzing conflicts:', error);
      throw error;
    }
  }

  /**
   * Generate ideas with project context awareness
   * Ensures generated ideas don't duplicate existing decisions
   */
  async generateContextAwareIdeas(
    projectId: string,
    generationContext: {
      projectContext: string;
      currentDecisions: any[];
      constraints: string[];
      direction: string;
      quantity: number;
    }
  ): Promise<{
    ideas: any[];
    filteredDuplicates: number;
    metadata: {
      generated: number;
      unique: number;
      duplicatesRemoved: number;
    };
  }> {
    console.log('[SandboxOrchestrator] Generating context-aware ideas');

    // This would call IdeaGeneratorAgent with project context
    // For now, returning structure for integration
    return {
      ideas: [],
      filteredDuplicates: 0,
      metadata: {
        generated: 0,
        unique: 0,
        duplicatesRemoved: 0,
      },
    };
  }
}
