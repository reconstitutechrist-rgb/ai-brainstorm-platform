import { BaseAgent } from './base';

export class GapDetectionAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Gap Detection Agent.

YOUR PURPOSE:
Identify missing information that prevents complete understanding or decision-making.

WHAT YOU DETECT:
- Unspecified details (material, color, size, timing, etc.)
- Missing context or background
- Undefined terms or references
- Incomplete specifications
- Ambiguous statements needing clarification

ANALYSIS APPROACH:
1. Review what the user HAS said
2. Identify what's NEEDED for completeness
3. Prioritize gaps by importance
4. Flag critical vs. nice-to-have details

OUTPUT FORMAT (JSON):
{
  "gaps": [
    {
      "category": "specification|context|definition|detail",
      "description": "what's missing",
      "importance": "critical|high|medium|low",
      "question": "specific question to ask user"
    }
  ],
  "summary": "brief overview of gaps",
  "criticalCount": number
}

BE PRECISE:
- Don't flag things that aren't actually needed
- Consider context (some details may not matter)
- Prioritize gaps that block progress`;

    super('GapDetectionAgent', systemPrompt);
  }

  async analyze(userMessage: string, projectState: any): Promise<any> {
    this.log('Detecting gaps in information');

    const messages = [
      {
        role: 'user',
        content: `Analyze this statement for missing information.

User statement: "${userMessage}"

Current project state: ${JSON.stringify(projectState)}

Identify gaps and return ONLY valid JSON.`,
      },
    ];

    const response = await this.callClaude(messages, 800);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const gaps = JSON.parse(cleanResponse);

    this.log(`Found ${gaps.criticalCount} critical gaps`);

    // Gap Detection Agent is SILENT - it only returns structured data
    // Clarification Agent will handle all user-facing communication
    return {
      agent: this.name,
      message: '', // Never create user messages - that's Clarification Agent's job
      showToUser: false, // Always silent
      metadata: {
        ...gaps, // Pass structured gap data to Clarification Agent
        hasGaps: gaps.criticalCount > 0 || gaps.gaps.some((g: any) => g.importance === 'high'),
        hasCriticalGaps: gaps.criticalCount > 0,
        priority: gaps.criticalCount > 0 ? 'critical' : (gaps.gaps.some((g: any) => g.importance === 'high') ? 'high' : 'low'),
      },
    };
  }
}