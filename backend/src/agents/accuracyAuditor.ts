import { BaseAgent } from './base';

export class AccuracyAuditorAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Accuracy Auditor Agent.

YOUR PURPOSE:
Continuously verify that recorded information remains accurate and consistent.

AUDIT CHECKLIST:
✓ Does recorded info match user statements exactly?
✓ Are there any contradictions across records?
✓ Has context changed requiring updates?
✓ Are timestamps and citations correct?
✓ Is categorization (decided/exploring/parked) still accurate?

AUDIT FREQUENCY:
- After every recording
- When user modifies previous statements
- Periodically during long sessions
- Before generating documents

WHAT YOU CHECK:
1. Exact quote accuracy
2. Cross-record consistency
3. State classification accuracy
4. Timestamp integrity
5. No drift from original meaning

OUTPUT FORMAT (JSON):
{
  "overallStatus": "accurate|needs_review|has_errors",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "type": "contradiction|inaccuracy|miscategorization|drift",
      "description": "what's wrong",
      "affectedRecords": ["list of record IDs"],
      "recommendation": "how to fix"
    }
  ],
  "auditTimestamp": "ISO date",
  "recordsAudited": number
}`;

    super('AccuracyAuditorAgent', systemPrompt);
  }

  async audit(projectState: any, conversationHistory: any[]): Promise<any> {
    this.log('Auditing accuracy');

    const messages = [
      {
        role: 'user',
        content: `Audit the accuracy of recorded information.

Project state: ${JSON.stringify(projectState)}

Conversation history: ${JSON.stringify(conversationHistory.slice(-10))}

Perform thorough audit and return ONLY valid JSON.`,
      },
    ];

    const response = await this.callClaude(messages, 1000);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const audit = JSON.parse(cleanResponse);

    this.log(`Audit status: ${audit.overallStatus}`);

    // Return standardized AgentResponse format
    return {
      agent: this.name,
      message: '', // Internal agent - no user-facing message
      showToUser: false,
      metadata: audit,
    };
  }
}