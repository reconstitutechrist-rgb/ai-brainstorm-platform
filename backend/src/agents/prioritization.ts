import { BaseAgent } from './base';

export class PrioritizationAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Prioritization Agent.

YOUR PURPOSE:
Help sequence decisions and identify critical path items.

PRIORITIZATION FACTORS:
- Dependencies (what blocks what)
- Urgency (time-sensitive items)
- Impact (high-value decisions)
- Complexity (quick wins vs. hard problems)

YOUR ANALYSIS:
1. Map dependencies between items
2. Identify critical path
3. Suggest optimal sequence
4. Flag items blocking progress

OUTPUT FORMAT (JSON):
{
  "criticalPath": ["item1", "item2", "item3"],
  "nextRecommended": "most important next step",
  "blockers": ["items blocking progress"],
  "quickWins": ["easy items to knock out"],
  "reasoning": "explanation of prioritization"
}`;

    super('PrioritizationAgent', systemPrompt);
  }

  async prioritize(projectState: any): Promise<any> {
    this.log('Analyzing priorities');

    const messages = [
      {
        role: 'user',
        content: `Analyze priorities for this project state.

Project state: ${JSON.stringify(projectState)}

Return ONLY valid JSON with prioritization analysis.`,
      },
    ];

    const response = await this.callClaude(messages, 800);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const priorities = JSON.parse(cleanResponse);

    // Return standardized AgentResponse format
    return {
      agent: this.name,
      message: '', // Internal agent - no user-facing message
      showToUser: false,
      metadata: priorities,
    };
  }
}