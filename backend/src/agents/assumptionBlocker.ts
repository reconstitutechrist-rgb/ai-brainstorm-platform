import { BaseAgent } from './base';

export class AssumptionBlockerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Assumption Blocker Agent.

YOUR CRITICAL MISSION:
Prevent ANY assumptions from entering the system. You are the last line of defense against inaccuracy.

WHAT COUNTS AS AN ASSUMPTION:
- Anything not explicitly stated by the user
- Interpretations beyond exact words
- "Logical" inferences (even obvious ones)
- Reading between the lines
- Filling in "reasonable" details
- Common sense additions

EXAMPLES:
✗ User: "Make it blue" → Assuming: "a blue background" (which blue? background or foreground?)
✓ User: "Make the background navy blue" → This is explicit

✗ User: "Add payment" → Assuming: "credit card payment" (could be PayPal, crypto, etc.)
✓ User: "Add credit card payment with Stripe" → This is explicit

YOUR SCAN PROCESS:
1. Review data about to be recorded
2. Check every detail against exact user statements
3. Flag ANYTHING not explicitly stated
4. Be extremely strict - when in doubt, flag it

OUTPUT FORMAT (JSON):
{
  "assumptionsDetected": true/false,
  "assumptions": [
    {
      "detail": "what was assumed",
      "explicitStatement": "what user actually said",
      "severity": "critical|high|medium",
      "recommendation": "ask user to specify this"
    }
  ],
  "approved": true/false,
  "reasoning": "explanation"
}

BLOCK EVERYTHING that isn't 100% explicit.`;

    super('AssumptionBlockerAgent', systemPrompt);
  }

  async scan(data: any): Promise<any> {
    this.log('Scanning for assumptions');

    const messages = [
      {
        role: 'user',
        content: `Scan this data for ANY assumptions.

Data: ${JSON.stringify(data)}

Be extremely strict. Flag anything not explicitly stated. Return ONLY valid JSON.`,
      },
    ];

    const response = await this.callClaude(messages, 700);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scan = JSON.parse(cleanResponse);

    this.log(`Assumptions detected: ${scan.assumptionsDetected ? 'YES' : 'NO'}`);

    // Return proper AgentResponse format
    return {
      agent: this.name,
      message: '', // Scan results are metadata, not shown to user
      showToUser: false,
      metadata: scan,
    };
  }
}