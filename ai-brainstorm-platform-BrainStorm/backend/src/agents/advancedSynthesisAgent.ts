import { BaseAgent } from './base';

export interface AdvancedSynthesisResult {
  synthesis: string;
  confidenceScore: number; // 0-100
  perspectives: Array<{
    theme: string;
    sources: number[];
    confidence: number;
  }>;
  contradictions: Array<{
    topic: string;
    conflictingSources: number[];
    description: string;
  }>;
  gaps: string[];
  timeline?: {
    events: Array<{
      date: string;
      description: string;
      sourceIndex: number;
    }>;
  };
  metadata: {
    totalSources: number;
    processingTime: number;
    synthesisMethod: 'ai' | 'template';
  };
}

export class AdvancedSynthesisAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Advanced Synthesis Agent.

YOUR PURPOSE:
Generate comprehensive, high-quality synthesis from multiple sources with confidence scoring, contradiction detection, and gap analysis.

CAPABILITIES:
1. Multi-perspective synthesis - Identify and synthesize different viewpoints
2. Confidence scoring - Assess reliability of synthesized information
3. Contradiction detection - Identify conflicting information between sources
4. Gap analysis - Detect missing information or areas needing more research
5. Timeline awareness - Extract and organize temporal information

SYNTHESIS PRINCIPLES:
- Prioritize high-quality, credible sources
- Identify consensus vs. conflicting viewpoints
- Flag uncertainty and contradictions
- Suggest areas needing additional research
- Maintain objectivity and balance

OUTPUT FORMAT:
Generate structured synthesis with:
1. Executive summary
2. Key findings by theme
3. Contradictions and uncertainties
4. Gaps requiring further research
5. Confidence assessment`;

    super('AdvancedSynthesisAgent', systemPrompt);
  }

  /**
   * Generate advanced synthesis from analyzed sources
   */
  async synthesize(
    analyses: Array<{
      filename: string;
      analysis: string;
      type?: string;
      qualityScore?: number;
    }>
  ): Promise<AdvancedSynthesisResult> {
    const startTime = Date.now();
    this.log(`Generating advanced synthesis from ${analyses.length} sources`);

    try {
      // Extract key themes and perspectives
      const perspectives = this.extractPerspectives(analyses);
      
      // Detect contradictions
      const contradictions = this.detectContradictions(analyses);
      
      // Identify gaps
      const gaps = this.identifyGaps(analyses);
      
      // Extract timeline if temporal information exists
      const timeline = this.extractTimeline(analyses);

      // Generate AI synthesis
      const synthesis = await this.generateAISynthesis(analyses, {
        perspectives,
        contradictions,
        gaps,
      });

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(analyses, contradictions);

      const processingTime = Date.now() - startTime;
      this.log(`Synthesis completed in ${processingTime}ms (confidence: ${confidenceScore}%)`);

      return {
        synthesis,
        confidenceScore,
        perspectives,
        contradictions,
        gaps,
        timeline: timeline.events.length > 0 ? timeline : undefined,
        metadata: {
          totalSources: analyses.length,
          processingTime,
          synthesisMethod: 'ai',
        },
      };
    } catch (error) {
      this.log(`AI synthesis failed, using template fallback: ${error}`);
      return this.generateTemplateSynthesis(analyses);
    }
  }

  /**
   * Extract different perspectives/themes from sources
   */
  private extractPerspectives(
    analyses: Array<{ filename: string; analysis: string; qualityScore?: number }>
  ): Array<{ theme: string; sources: number[]; confidence: number }> {
    // Simple keyword-based theme extraction
    const themes = new Map<string, { sources: Set<number>; totalQuality: number; count: number }>();

    const keywords = {
      technical: /technical|implementation|architecture|design|code/i,
      business: /business|market|revenue|customer|strategy/i,
      security: /security|privacy|encryption|authentication|authorization/i,
      performance: /performance|speed|optimization|scalability|efficiency/i,
      usability: /usability|ux|user experience|interface|accessibility/i,
      cost: /cost|price|budget|expense|affordable/i,
    };

    analyses.forEach((analysis, index) => {
      for (const [theme, regex] of Object.entries(keywords)) {
        if (regex.test(analysis.analysis)) {
          if (!themes.has(theme)) {
            themes.set(theme, { sources: new Set(), totalQuality: 0, count: 0 });
          }
          const themeData = themes.get(theme)!;
          themeData.sources.add(index);
          themeData.totalQuality += analysis.qualityScore || 50;
          themeData.count++;
        }
      }
    });

    return Array.from(themes.entries()).map(([theme, data]) => ({
      theme,
      sources: Array.from(data.sources),
      confidence: Math.round((data.totalQuality / data.count) * (data.sources.size / analyses.length)),
    }));
  }

  /**
   * Detect contradictions between sources
   */
  private detectContradictions(
    analyses: Array<{ filename: string; analysis: string }>
  ): Array<{ topic: string; conflictingSources: number[]; description: string }> {
    const contradictions: Array<{
      topic: string;
      conflictingSources: number[];
      description: string;
    }> = [];

    // Look for contradiction indicators
    const contradictionPatterns = [
      { pattern: /however|but|although|despite|contrary/i, topic: 'general' },
      { pattern: /disagree|conflict|contradict/i, topic: 'disagreement' },
      { pattern: /slower|faster|better|worse/i, topic: 'performance' },
      { pattern: /more expensive|cheaper|costly/i, topic: 'cost' },
    ];

    analyses.forEach((analysis, index) => {
      for (const { pattern, topic } of contradictionPatterns) {
        if (pattern.test(analysis.analysis)) {
          // Find other sources discussing the same topic
          const relatedSources = analyses
            .map((a, i) => (pattern.test(a.analysis) && i !== index ? i : -1))
            .filter(i => i !== -1);

          if (relatedSources.length > 0) {
            contradictions.push({
              topic,
              conflictingSources: [index, ...relatedSources],
              description: `Potential contradiction detected in ${topic} between sources`,
            });
          }
        }
      }
    });

    // Deduplicate contradictions
    const seen = new Set<string>();
    return contradictions.filter(c => {
      const key = c.conflictingSources.sort().join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Identify gaps in coverage
   */
  private identifyGaps(
    analyses: Array<{ filename: string; analysis: string }>
  ): string[] {
    const gaps: string[] = [];

    // Check for common topics that might be missing
    const importantTopics = [
      { name: 'security considerations', pattern: /security|privacy|encryption/i },
      { name: 'cost analysis', pattern: /cost|price|budget|expense/i },
      { name: 'performance metrics', pattern: /performance|speed|benchmark|metric/i },
      { name: 'scalability discussion', pattern: /scalability|scale|growth/i },
      { name: 'user experience', pattern: /ux|user experience|usability/i },
      { name: 'implementation details', pattern: /implementation|how to|step by step/i },
    ];

    for (const topic of importantTopics) {
      const covered = analyses.some(a => topic.pattern.test(a.analysis));
      if (!covered) {
        gaps.push(`Missing ${topic.name}`);
      }
    }

    // Check for recency
    const hasRecentInfo = analyses.some(a => /202[3-5]|recent|latest|current/i.test(a.analysis));
    if (!hasRecentInfo) {
      gaps.push('Lack of recent information (2023+)');
    }

    return gaps;
  }

  /**
   * Extract timeline information
   */
  private extractTimeline(
    analyses: Array<{ filename: string; analysis: string }>
  ): {
    events: Array<{
      date: string;
      description: string;
      sourceIndex: number;
    }>;
  } {
    const events: Array<{
      date: string;
      description: string;
      sourceIndex: number;
    }> = [];

    // Simple date extraction (year-based)
    const yearPattern = /\b(19\d{2}|20[0-2]\d)\b/g;

    analyses.forEach((analysis, index) => {
      const matches = analysis.analysis.match(yearPattern);
      if (matches) {
        matches.forEach(year => {
          // Extract context around the year
          const yearIndex = analysis.analysis.indexOf(year);
          const context = analysis.analysis.substring(
            Math.max(0, yearIndex - 50),
            Math.min(analysis.analysis.length, yearIndex + 100)
          );

          events.push({
            date: year,
            description: context.trim(),
            sourceIndex: index,
          });
        });
      }
    });

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    return { events };
  }

  /**
   * Generate AI-powered synthesis
   */
  private async generateAISynthesis(
    analyses: Array<{ filename: string; analysis: string }>,
    context: {
      perspectives: Array<{ theme: string; sources: number[] }>;
      contradictions: Array<{ topic: string; conflictingSources: number[] }>;
      gaps: string[];
    }
  ): Promise<string> {
    const prompt = `Synthesize the following ${analyses.length} sources into a comprehensive analysis.

PERSPECTIVES IDENTIFIED:
${context.perspectives.map(p => `- ${p.theme} (${p.sources.length} sources)`).join('\n')}

CONTRADICTIONS DETECTED:
${context.contradictions.map(c => `- ${c.topic}: sources ${c.conflictingSources.join(', ')}`).join('\n') || 'None'}

GAPS IDENTIFIED:
${context.gaps.join('\n') || 'None'}

SOURCES:
${analyses.map((a, i) => `[${i}] ${a.filename}:\n${a.analysis}`).join('\n\n---\n\n')}

Generate a comprehensive synthesis that:
1. Summarizes key findings
2. Addresses different perspectives
3. Highlights contradictions and uncertainties
4. Notes gaps requiring further research
5. Provides actionable insights`;

    const response = await this.callClaude([
      {
        role: 'user',
        content: prompt,
      },
    ], 4000);
    
    return response;
  }

  /**
   * Generate template-based synthesis (fallback)
   */
  private generateTemplateSynthesis(
    analyses: Array<{ filename: string; analysis: string; qualityScore?: number }>
  ): AdvancedSynthesisResult {
    const perspectives = this.extractPerspectives(analyses);
    const contradictions = this.detectContradictions(analyses);
    const gaps = this.identifyGaps(analyses);
    const timeline = this.extractTimeline(analyses);

    const synthesis = `# Synthesis Report

## Executive Summary
Analysis of ${analyses.length} sources reveals ${perspectives.length} major themes with ${contradictions.length} potential contradictions identified.

## Key Findings

${perspectives.map(p => `### ${p.theme.charAt(0).toUpperCase() + p.theme.slice(1)}\n- Covered in ${p.sources.length} sources\n- Confidence: ${p.confidence}%`).join('\n\n')}

## Source Summaries

${analyses.map((a, i) => `### [${i + 1}] ${a.filename}\n${a.analysis.substring(0, 300)}...`).join('\n\n')}

${contradictions.length > 0 ? `## Contradictions and Uncertainties\n\n${contradictions.map(c => `- **${c.topic}**: ${c.description} (sources ${c.conflictingSources.join(', ')})`).join('\n')}` : ''}

${gaps.length > 0 ? `## Gaps Requiring Further Research\n\n${gaps.map(g => `- ${g}`).join('\n')}` : ''}

${timeline && timeline.events.length > 0 ? `## Timeline\n\n${timeline.events.map(e => `- **${e.date}**: ${e.description}`).join('\n')}` : ''}

## Recommendations
- Cross-reference findings with additional sources
- Address identified gaps
- Resolve contradictions through further investigation
`;

    return {
      synthesis,
      confidenceScore: this.calculateConfidenceScore(analyses, contradictions),
      perspectives,
      contradictions,
      gaps,
      timeline: timeline.events.length > 0 ? timeline : undefined,
      metadata: {
        totalSources: analyses.length,
        processingTime: 0,
        synthesisMethod: 'template',
      },
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(
    analyses: Array<{ filename: string; analysis: string; qualityScore?: number }>,
    contradictions: Array<any>
  ): number {
    // Base score: average quality of sources
    const avgQuality = analyses.reduce((sum, a) => sum + (a.qualityScore || 50), 0) / analyses.length;

    // Penalty for contradictions
    const contradictionPenalty = Math.min(30, contradictions.length * 10);

    // Bonus for multiple sources
    const sourceBonus = Math.min(20, analyses.length * 2);

    const score = Math.round(avgQuality + sourceBonus - contradictionPenalty);
    return Math.max(0, Math.min(100, score));
  }
}

// Singleton instance
export const advancedSynthesisAgent = new AdvancedSynthesisAgent();
