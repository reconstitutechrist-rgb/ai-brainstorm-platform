/**
 * Research Suggestion Agent - Phase 3.2
 *
 * Analyzes project state and detects research gaps to provide intelligent
 * research suggestions. Helps users discover what they should research next.
 *
 * Key Features:
 * - Gap detection across multiple dimensions (competitors, tech, market, etc.)
 * - Context-aware suggestions based on project items and existing research
 * - Priority scoring to highlight most important gaps
 * - One-click research query generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { phase3Config } from '../config/phase3.config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ResearchGap {
  category: 'competitor' | 'technology' | 'market' | 'user' | 'technical_specs' | 'pricing' | 'legal' | 'other';
  title: string;
  description: string;
  suggestedQuery: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  relatedItems?: string[]; // IDs of project items this gap relates to
}

export interface ResearchSuggestionResult {
  gaps: ResearchGap[];
  totalGaps: number;
  highPriorityCount: number;
  coverageScore: number; // 0-100, how well-researched the project is
  summary: string;
}

export interface ProjectContext {
  title: string;
  description?: string;
  items: any[];
  decidedItems: any[];
  exploringItems: any[];
  parkedItems: any[];
  researchDocuments?: any[];
  references?: any[];
}

export class ResearchSuggestionAgent {
  private agentName: string = 'ResearchSuggestion';

  constructor() {
    // Agent initialization
  }

  /**
   * Analyze project and detect research gaps
   * Phase 3.2: Main entry point for gap detection
   */
  async analyzeProjectGaps(context: ProjectContext): Promise<ResearchSuggestionResult> {
    console.log(`[${this.agentName}] Analyzing project for research gaps...`);

    try {
      // Build comprehensive project summary for Claude
      const projectSummary = this.buildProjectSummary(context);
      const existingResearch = this.buildResearchSummary(context);

      // Call Claude to identify gaps
      const prompt = `You are a research strategy expert analyzing a project to identify research gaps.

PROJECT OVERVIEW:
${projectSummary}

EXISTING RESEARCH:
${existingResearch}

YOUR TASK:
Analyze this project and identify critical research gaps. For each gap, provide:
1. Category (competitor/technology/market/user/technical_specs/pricing/legal/other)
2. Clear title (e.g., "Competitor Analysis Missing")
3. Description of what's missing
4. Suggested research query (specific, actionable)
5. Priority (high/medium/low)
6. Reasoning for this priority

FOCUS ON:
- Actionable research that would help with decision-making
- Missing information that poses risk
- Gaps that would improve project success
- Competitive intelligence needs
- Technical feasibility questions
- Market validation needs

Return ONLY a JSON array of gaps in this exact format:
[
  {
    "category": "competitor",
    "title": "No competitor research found",
    "description": "No analysis of competing products or services",
    "suggestedQuery": "Research top 5 competitors in [domain]",
    "priority": "high",
    "reasoning": "Understanding competition is critical for positioning"
  }
]

Return ONLY the JSON array, no other text.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

      // Parse Claude's response
      let gaps: ResearchGap[] = [];
      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          gaps = JSON.parse(jsonMatch[0]);
        } else {
          gaps = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error(`[${this.agentName}] Failed to parse gaps response:`, parseError);
        gaps = this.generateFallbackGaps(context);
      }

      // Calculate coverage score
      const coverageScore = this.calculateCoverageScore(context, gaps);
      const highPriorityCount = gaps.filter(g => g.priority === 'high').length;

      const result: ResearchSuggestionResult = {
        gaps,
        totalGaps: gaps.length,
        highPriorityCount,
        coverageScore,
        summary: this.generateSummary(gaps, coverageScore),
      };

      console.log(`[${this.agentName}] Found ${gaps.length} gaps (${highPriorityCount} high priority)`);
      console.log(`[${this.agentName}] Coverage score: ${coverageScore}%`);

      return result;
    } catch (error: any) {
      console.error(`[${this.agentName}] Error analyzing gaps:`, error);
      throw new Error(`Failed to analyze research gaps: ${error.message}`);
    }
  }

  /**
   * Generate a single contextual research suggestion
   * Used for inline suggestions during conversations
   */
  async generateContextualSuggestion(
    userMessage: string,
    context: ProjectContext
  ): Promise<ResearchGap | null> {
    try {
      const prompt = `Based on this user message and project context, suggest ONE specific research action if relevant.

USER MESSAGE: "${userMessage}"

PROJECT: ${context.title}
DECIDED ITEMS: ${context.decidedItems.map(i => i.text).join(', ') || 'None'}
EXPLORING: ${context.exploringItems.map(i => i.text).join(', ') || 'None'}

If research would be helpful, return a JSON object:
{
  "category": "competitor|technology|market|user|technical_specs|pricing|legal|other",
  "title": "Brief title",
  "description": "What to research",
  "suggestedQuery": "Specific search query",
  "priority": "high|medium|low",
  "reasoning": "Why this matters"
}

If no research is needed, return: null

Return ONLY the JSON object or null.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : 'null';

      if (responseText.trim() === 'null') {
        return null;
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      console.error(`[${this.agentName}] Error generating contextual suggestion:`, error);
      return null;
    }
  }

  /**
   * Build project summary for analysis
   */
  private buildProjectSummary(context: ProjectContext): string {
    const sections = [];

    sections.push(`Title: ${context.title}`);
    if (context.description) {
      sections.push(`Description: ${context.description}`);
    }

    if (context.decidedItems.length > 0) {
      sections.push(`\nDECIDED ITEMS (${context.decidedItems.length}):`);
      context.decidedItems.slice(0, 10).forEach(item => {
        sections.push(`- ${item.text}`);
      });
      if (context.decidedItems.length > 10) {
        sections.push(`... and ${context.decidedItems.length - 10} more`);
      }
    }

    if (context.exploringItems.length > 0) {
      sections.push(`\nEXPLORING (${context.exploringItems.length}):`);
      context.exploringItems.slice(0, 5).forEach(item => {
        sections.push(`- ${item.text}`);
      });
      if (context.exploringItems.length > 5) {
        sections.push(`... and ${context.exploringItems.length - 5} more`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Build summary of existing research
   */
  private buildResearchSummary(context: ProjectContext): string {
    const sections = [];

    const researchDocs = context.researchDocuments || [];
    const references = context.references || [];

    if (researchDocs.length === 0 && references.length === 0) {
      return 'No research documents or references found.';
    }

    if (researchDocs.length > 0) {
      sections.push(`RESEARCH DOCUMENTS (${researchDocs.length}):`);
      researchDocs.slice(0, 5).forEach(doc => {
        sections.push(`- ${doc.title || doc.query || 'Untitled'}`);
      });
      if (researchDocs.length > 5) {
        sections.push(`... and ${researchDocs.length - 5} more`);
      }
    }

    if (references.length > 0) {
      sections.push(`\nREFERENCES (${references.length}):`);
      references.slice(0, 5).forEach(ref => {
        sections.push(`- ${ref.name || ref.filename || 'Untitled'}`);
      });
      if (references.length > 5) {
        sections.push(`... and ${references.length - 5} more`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Calculate coverage score (0-100)
   * Higher score = better research coverage
   */
  private calculateCoverageScore(context: ProjectContext, gaps: ResearchGap[]): number {
    // Base score on presence of research artifacts
    const researchCount = (context.researchDocuments?.length || 0) + (context.references?.length || 0);
    const itemCount = context.decidedItems.length + context.exploringItems.length;

    // Penalize based on gaps
    const highPriorityGaps = gaps.filter(g => g.priority === 'high').length;
    const mediumPriorityGaps = gaps.filter(g => g.priority === 'medium').length;

    // Calculate base score (0-baseScoreWeight based on research artifacts)
    const { baseScoreWeight, qualityBonus, highPriorityPenalty, mediumPriorityPenalty } = phase3Config.coverageScoring;

    let baseScore = 0;
    if (itemCount > 0) {
      const researchRatio = Math.min(researchCount / itemCount, 1);
      baseScore = researchRatio * baseScoreWeight;
    }

    // Deduct points for gaps
    const gapPenalty = (highPriorityGaps * highPriorityPenalty) + (mediumPriorityGaps * mediumPriorityPenalty);
    const finalScore = Math.max(0, Math.min(100, baseScore + qualityBonus - gapPenalty));

    return Math.round(finalScore);
  }

  /**
   * Generate summary text for gaps
   */
  private generateSummary(gaps: ResearchGap[], coverageScore: number): string {
    if (gaps.length === 0) {
      return 'Your project has comprehensive research coverage. Great work!';
    }

    const highPriority = gaps.filter(g => g.priority === 'high').length;

    if (coverageScore < 40) {
      return `Research coverage is low (${coverageScore}%). Focus on ${highPriority} high-priority research areas to improve project success.`;
    } else if (coverageScore < 70) {
      return `Moderate research coverage (${coverageScore}%). Addressing ${highPriority} high-priority gaps would strengthen your project.`;
    } else {
      return `Good research coverage (${coverageScore}%). A few additional research areas could further enhance your project.`;
    }
  }

  /**
   * Fallback gaps when Claude fails
   */
  private generateFallbackGaps(context: ProjectContext): ResearchGap[] {
    const gaps: ResearchGap[] = [];

    // Check for competitor research
    const hasCompetitorResearch = (context.researchDocuments || []).some(doc =>
      doc.title?.toLowerCase().includes('competitor') ||
      doc.query?.toLowerCase().includes('competitor')
    );
    if (!hasCompetitorResearch && context.decidedItems.length > 0) {
      gaps.push({
        category: 'competitor',
        title: 'No competitor research found',
        description: 'Understanding your competition is critical for product positioning and differentiation.',
        suggestedQuery: `Research competitors for ${context.title}`,
        priority: 'high',
        reasoning: 'Competitive analysis is essential for strategic decision-making',
      });
    }

    // Check for technical research if tech terms detected
    const hasTechTerms = [...context.decidedItems, ...context.exploringItems].some(item =>
      /technology|tech|software|platform|api|framework/i.test(item.text)
    );
    if (hasTechTerms && (context.researchDocuments || []).length === 0) {
      gaps.push({
        category: 'technology',
        title: 'Technical feasibility research needed',
        description: 'Research technical requirements and implementation options.',
        suggestedQuery: 'Research technical implementation options',
        priority: 'high',
        reasoning: 'Technical validation prevents costly mistakes',
      });
    }

    return gaps;
  }
}
