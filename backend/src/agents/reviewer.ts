import { BaseAgent } from './base';

export class ReviewerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Reviewer Agent.

YOUR PURPOSE:
Perform comprehensive QA on conversations and documents.

REVIEW CHECKLIST:
✓ Accuracy: Does recorded info match conversations?
✓ Completeness: Is anything missing?
✓ Consistency: Any contradictions?
✓ Clarity: Is everything clearly stated?
✓ Traceability: Can we trace decisions to sources?

REVIEW TYPES:
1. Conversation Review: Check discussion flow and capture
2. Document Review: Verify generated documents
3. State Review: Audit project state accuracy
4. Final Review: Pre-delivery comprehensive check

OUTPUT FORMAT (JSON):
{
  "reviewType": "conversation|document|state|final",
  "status": "approved|needs_revision|rejected",
  "score": 0-100,
  "findings": [
    {
      "category": "accuracy|completeness|consistency|clarity",
      "severity": "critical|high|medium|low",
      "issue": "description",
      "location": "where the issue is",
      "recommendation": "how to fix"
    }
  ],
  "summary": "overall assessment"
}`;

    super('ReviewerAgent', systemPrompt);
  }

  async review(reviewType: string, data: any): Promise<any> {
    this.log(`Performing ${reviewType} review`);

    const isExplicitReview = reviewType === 'conversation' && data.explicitReview;

    const messages = [
      {
        role: 'user',
        content: `Perform a comprehensive ${reviewType} review.

${isExplicitReview ? `IMPORTANT: The user explicitly requested this review with "Review Conversation" command.
Focus on:
1. What decisions/explorations have been discussed in the conversation
2. What is currently recorded in the project state
3. Any missing items that should be recorded
4. Provide a clear summary for the user

` : ''}Data to review: ${JSON.stringify(data)}

Return ONLY valid JSON with comprehensive review results.`,
      },
    ];

    const response = await this.callClaude(messages, 1500);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const review = JSON.parse(cleanResponse);

    this.log(`Review status: ${review.status} (score: ${review.score})`);

    // For explicit reviews, generate a user-facing summary
    let userMessage = '';
    if (isExplicitReview) {
      const findings = review.findings || [];
      const missingItems = findings.filter((f: any) => f.category === 'completeness');

      userMessage = `📊 **Conversation Review Complete**\n\n`;
      userMessage += `**Overall Score:** ${review.score}/100\n`;
      userMessage += `**Status:** ${review.status}\n\n`;

      if (review.summary) {
        userMessage += `**Summary:** ${review.summary}\n\n`;
      }

      if (missingItems.length > 0) {
        userMessage += `**⚠️ Missing Items (${missingItems.length}):**\n`;
        missingItems.forEach((item: any, i: number) => {
          userMessage += `${i + 1}. ${item.issue}\n`;
          if (item.recommendation) {
            userMessage += `   → ${item.recommendation}\n`;
          }
        });
        userMessage += `\nI'll attempt to record these missing items now.\n`;
      } else {
        userMessage += `✅ **All items are properly recorded!**\n`;
      }
    }

    // Return standardized AgentResponse format
    return {
      agent: this.name,
      message: userMessage,
      showToUser: isExplicitReview,
      metadata: review,
    };
  }
}