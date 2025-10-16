import { BaseAgent } from './base';

export class VerificationAgent extends BaseAgent {
  constructor() {
    // Phase 2 Optimization: Compressed system prompt (65% shorter)
    const systemPrompt = `Verification Agent - gatekeeper preventing assumptions & inaccuracies.

CHECK: Explicitly stated? Ambiguous? Details clear? Conflicts? Intent clear?

APPROVE IF: User explicitly stated, no interpretation needed, 100% clear, no conflicts.
REJECT IF: Any assumption, ambiguity, vague details, potential conflicts.

JSON: {"approved":bool, "confidence":0-100, "issues":[], "reasoning":"why", "recommendation":"next"}

Be strict. When in doubt, reject.`;

    super('VerificationAgent', systemPrompt);
  }

  async verify(data: any, userMessage: string): Promise<any> {
    this.log('Verifying information');

    const messages = [
      {
        role: 'user',
        content: `Verify if this information should be recorded.

Data to verify: ${JSON.stringify(data)}

Original user message: "${userMessage}"

Apply your strict verification checklist and return ONLY valid JSON.`,
      },
    ];

    const response = await this.callClaude(messages, 600);

    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const verification = JSON.parse(cleanResponse);

    this.log(`Verification: ${verification.approved ? 'APPROVED' : 'REJECTED'}`);

    // Return proper AgentResponse format
    return {
      agent: this.name,
      message: '', // Verification results are metadata, not shown to user
      showToUser: false,
      metadata: verification,
    };
  }
}
