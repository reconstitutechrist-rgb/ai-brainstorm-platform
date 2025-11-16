/**
 * ResearchOrchestrator - Page-Specific Orchestrator for ResearchPage
 *
 * Coordinates research workflows with project context integration.
 * Separates new ideas from already-decided items to prevent duplicates.
 */

import { UnifiedResearchAgent } from '../agents/unifiedResearchAgent';
import { QualityAuditorAgent } from '../agents/qualityAuditor';
import { supabase } from '../services/supabase';

interface ResearchContext {
  projectId: string;
  query: string;
  userId?: string;
  conversationHistory?: any[];
  includeWeb?: boolean;
  includeDocuments?: boolean;
  includeReferences?: boolean;
}

interface ResearchResult {
  synthesis: string;
  newIdeas: ResearchItem[];
  alreadyDecided: ResearchItem[];
  metadata: {
    totalSources: number;
    webSources: number;
    documentSources: number;
    referenceSources: number;
    duplicatesFound: number;
  };
}

interface ResearchItem {
  content: string;
  source: string;
  sourceType: 'web' | 'document' | 'reference';
  relevanceScore?: number;
  matchedDecidedItem?: {
    id: string;
    title: string;
    similarity: number;
  };
}

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  state: string;
  tags: string[];
  created_at: Date;
}

export class ResearchOrchestrator {
  private researchAgent: UnifiedResearchAgent;
  private qualityAuditor: QualityAuditorAgent;

  constructor() {
    this.researchAgent = new UnifiedResearchAgent();
    this.qualityAuditor = new QualityAuditorAgent();
  }

  /**
   * Main entry point for ResearchPage queries
   * Performs research and separates new ideas from already-decided items
   */
  async processResearchQuery(context: ResearchContext): Promise<ResearchResult> {
    try {
      console.log('[ResearchOrchestrator] Processing research query:', context.query);

      // Step 1: Get existing project items (decided context)
      const projectItems = await this.getProjectItems(context.projectId);
      console.log(`[ResearchOrchestrator] Found ${projectItems.length} existing project items`);

      // Step 2: Perform research using UnifiedResearchAgent
      const researchResult = await this.researchAgent.research(
        context.query,
        context.projectId,
        context.userId || 'system',
        {
          sources: 'auto',
          intent: 'research',
          maxWebSources: context.includeWeb !== false ? 5 : 0,
          maxDocumentSources: context.includeDocuments !== false ? 10 : 0,
          includeAnalysis: true,
          saveToDB: true,
        }
      );

      // Step 3: Extract research items from the result
      const researchItems = this.extractResearchItems(researchResult);

      // Step 4: Separate new ideas from already-decided items
      const { newIdeas, alreadyDecided } = await this.separateNewVsDecided(
        researchItems,
        projectItems
      );

      // Step 5: Generate synthesis with project context awareness
      const synthesis = await this.synthesizeWithContext(
        context.query,
        newIdeas,
        alreadyDecided,
        researchResult.synthesis
      );

      // Step 6: Calculate metadata
      const metadata = {
        totalSources: researchItems.length,
        webSources: researchItems.filter(i => i.sourceType === 'web').length,
        documentSources: researchItems.filter(i => i.sourceType === 'document').length,
        referenceSources: researchItems.filter(i => i.sourceType === 'reference').length,
        duplicatesFound: alreadyDecided.length
      };

      console.log('[ResearchOrchestrator] Research complete:', metadata);

      return {
        synthesis,
        newIdeas,
        alreadyDecided,
        metadata
      };
    } catch (error) {
      console.error('[ResearchOrchestrator] Error processing research:', error);
      throw error;
    }
  }

  /**
   * Get all project items (decided context) from database
   */
  private async getProjectItems(projectId: string): Promise<ProjectItem[]> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const items = project?.items || [];

      // Convert to ProjectItem format
      return items.map((item: any) => ({
        id: item.id,
        title: item.text || item.title || '',
        description: item.text || item.description || '',
        state: item.state || 'exploring',
        tags: item.tags || item.metadata?.tags || [],
        created_at: new Date(item.created_at || Date.now()),
      }));
    } catch (error) {
      console.error('[ResearchOrchestrator] Error fetching project items:', error);
      return [];
    }
  }

  /**
   * Extract research items from UnifiedResearchAgent result
   */
  private extractResearchItems(researchResult: any): ResearchItem[] {
    const items: ResearchItem[] = [];

    // Extract from web sources
    if (researchResult.webSources) {
      researchResult.webSources.forEach((result: any) => {
        items.push({
          content: result.snippet || result.content || '',
          source: result.url || '',
          sourceType: 'web',
          relevanceScore: 0.8 // Default relevance for web sources
        });
      });
    }

    // Extract from document sources
    if (researchResult.documentSources) {
      researchResult.documentSources.forEach((result: any) => {
        items.push({
          content: result.content || '',
          source: result.filename || result.id,
          sourceType: 'document',
          relevanceScore: result.relevanceScore || 0.8
        });
      });
    }

    // Note: References are included in documentSources with type='reference'
    // Filter them out separately if needed
    if (researchResult.documentSources) {
      researchResult.documentSources
        .filter((result: any) => result.type === 'reference')
        .forEach((result: any) => {
          // Already added above, but mark as reference type if needed
        });
    }

    return items;
  }

  /**
   * Separate research items into new ideas vs already-decided items
   * Uses semantic similarity to detect duplicates
   */
  private async separateNewVsDecided(
    researchItems: ResearchItem[],
    projectItems: ProjectItem[]
  ): Promise<{ newIdeas: ResearchItem[]; alreadyDecided: ResearchItem[] }> {
    const newIdeas: ResearchItem[] = [];
    const alreadyDecided: ResearchItem[] = [];

    // If no project items, all research is new
    if (projectItems.length === 0) {
      return { newIdeas: researchItems, alreadyDecided: [] };
    }

    // Check each research item against project items
    for (const researchItem of researchItems) {
      const match = this.findBestMatch(researchItem, projectItems);

      if (match && match.similarity > 0.7) {
        // High similarity - likely already decided
        alreadyDecided.push({
          ...researchItem,
          matchedDecidedItem: match
        });
      } else {
        // Low similarity or no match - new idea
        newIdeas.push(researchItem);
      }
    }

    return { newIdeas, alreadyDecided };
  }

  /**
   * Find best matching project item for a research item
   * Uses simple text similarity (could be enhanced with embeddings)
   */
  private findBestMatch(
    researchItem: ResearchItem,
    projectItems: ProjectItem[]
  ): { id: string; title: string; similarity: number } | null {
    let bestMatch: { id: string; title: string; similarity: number } | null = null;
    let highestSimilarity = 0;

    for (const projectItem of projectItems) {
      const similarity = this.calculateTextSimilarity(
        researchItem.content,
        projectItem.title + ' ' + projectItem.description
      );

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          id: projectItem.id,
          title: projectItem.title,
          similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate text similarity using simple word overlap
   * TODO: Replace with proper embedding-based similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    const words2 = new Set(
      text2.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Generate synthesis with project context awareness
   * Highlights what's new vs what's already in the project
   */
  private async synthesizeWithContext(
    query: string,
    newIdeas: ResearchItem[],
    alreadyDecided: ResearchItem[],
    originalSynthesis: string
  ): Promise<string> {
    let synthesis = originalSynthesis;

    // Add context section if there are duplicates
    if (alreadyDecided.length > 0) {
      synthesis += '\n\n---\n\n';
      synthesis += '## 📋 Already in Your Project\n\n';
      synthesis += `Found ${alreadyDecided.length} research result(s) that match items you've already decided on:\n\n`;

      alreadyDecided.slice(0, 5).forEach((item, index) => {
        synthesis += `${index + 1}. **${item.matchedDecidedItem?.title}** (${Math.round(item.matchedDecidedItem!.similarity * 100)}% match)\n`;
        synthesis += `   - Research: "${item.content.substring(0, 100)}..."\n`;
        synthesis += `   - Source: ${item.source}\n\n`;
      });

      if (alreadyDecided.length > 5) {
        synthesis += `_...and ${alreadyDecided.length - 5} more matches_\n\n`;
      }
    }

    // Add new ideas section
    if (newIdeas.length > 0) {
      synthesis += '\n\n---\n\n';
      synthesis += '## ✨ New Ideas to Consider\n\n';
      synthesis += `Found ${newIdeas.length} new research result(s) not yet in your project:\n\n`;

      newIdeas.slice(0, 5).forEach((item, index) => {
        synthesis += `${index + 1}. "${item.content.substring(0, 150)}..."\n`;
        synthesis += `   - Source: ${item.source}\n`;
        synthesis += `   - Type: ${item.sourceType}\n\n`;
      });

      if (newIdeas.length > 5) {
        synthesis += `_...and ${newIdeas.length - 5} more new ideas_\n\n`;
      }

      synthesis += '\n💡 **Would you like to decide on any of these new ideas?** Head to the Chat page to discuss and record decisions.\n';
    }

    return synthesis;
  }

  /**
   * Generate research-based document with optional verification
   * (Called from Intelligence Hub's document generation feature)
   * NOTE: This is a placeholder - UnifiedResearchAgent does not have generateDocument() method
   * Use DocumentOrchestrator for actual document generation
   */
  async generateResearchDocument(
    projectId: string,
    documentType: string,
    researchContext: string,
    verify: boolean = false
  ): Promise<{ document: string; qualityReport?: any }> {
    console.log('[ResearchOrchestrator] Generating research document:', documentType);
    console.warn('[ResearchOrchestrator] generateDocument() not implemented in UnifiedResearchAgent. Use DocumentOrchestrator instead.');

    // For now, perform research on the context and use synthesis as document base
    const researchResult = await this.researchAgent.research(
      researchContext,
      projectId,
      'system',
      {
        sources: 'auto',
        intent: 'research',
        maxWebSources: 5,
        maxDocumentSources: 10,
        includeAnalysis: true,
        saveToDB: false,
      }
    );

    // Use synthesis as the document content
    const documentContent = `# ${documentType}\n\n${researchResult.synthesis}`;

    let qualityReport: any = undefined;

    // Optional verification step
    if (verify) {
      console.log('[ResearchOrchestrator] Running quality checks on document');

      const [verification, assumptionScan] = await Promise.all([
        this.qualityAuditor.verify(
          { documentContent },
          'Verify research document'
        ),
        this.qualityAuditor.scan(
          { documentContent }
        )
      ]);

      qualityReport = {
        verified: verification.metadata?.approved !== false,
        issues: verification.metadata?.issues || [],
        assumptions: assumptionScan.metadata?.assumptions || [],
        assumptionCount: assumptionScan.metadata?.assumptions?.length || 0
      };

      console.log('[ResearchOrchestrator] Quality report:', qualityReport);
    }

    return {
      document: documentContent,
      qualityReport
    };
  }
}

