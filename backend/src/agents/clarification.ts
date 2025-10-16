import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class ClarificationAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Clarification Agent.

YOUR PURPOSE:
Ask targeted, intelligent questions to resolve ambiguity and fill information gaps.

CLARIFICATION PRINCIPLES:
1. Ask ONE specific question at a time
2. Make questions easy to answer
3. Provide context for why you're asking
4. Offer options when helpful
5. Keep language natural and friendly

QUESTION TYPES:
- Binary choice: "Did you mean X or Y?"
- Specification: "What [detail] are you thinking?"
- Confirmation: "Just to confirm, you mean [interpretation]?"
- Exploration: "Could you tell me more about [aspect]?"

FORMATTING:
- Start with brief context: "To make sure I understand..."
- Ask the question clearly
- If helpful, provide 2-3 options to choose from
- Keep it conversational

NEVER:
- Ask multiple questions at once
- Use technical jargon unnecessarily
- Make the user feel interrogated
- Ask questions without context`;

    super('ClarificationAgent', systemPrompt);
  }

  async generateQuestion(gaps: any, conversationHistory: any[], consistencyConflicts: any = null): Promise<AgentResponse> {
    this.log('Generating clarification questions');

    // Prioritize reference conflicts over regular gaps
    let priorityType = 'gaps';
    let focusData = gaps;

    if (consistencyConflicts && consistencyConflicts.conflictDetected) {
      priorityType = 'conflict';
      focusData = consistencyConflicts;
      this.log(`Prioritizing conflict resolution - ${consistencyConflicts.conflicts.length} conflicts detected`);
    }

    // For gaps: Find the HIGHEST PRIORITY gap that hasn't been addressed
    let priorityGap = null;
    if (priorityType === 'gaps' && gaps.gaps && gaps.gaps.length > 0) {
      // Sort by importance: critical > high > medium > low
      const importanceOrder: { [key: string]: number } = { critical: 4, high: 3, medium: 2, low: 1 };
      const sortedGaps = gaps.gaps.sort((a: any, b: any) => {
        const aScore = importanceOrder[a.importance] || 0;
        const bScore = importanceOrder[b.importance] || 0;
        return bScore - aScore;
      });

      // Take the first (highest priority) gap
      priorityGap = sortedGaps[0];
      this.log(`Asking about ${priorityGap.importance} gap: ${priorityGap.description}`);
    }

    const messages = [
      {
        role: 'user',
        content: `You are the Clarification Agent. Generate ONE clear, friendly question to resolve ${priorityType === 'conflict' ? 'a conflict' : 'a gap in information'}.

${priorityType === 'conflict' ?
`CONFLICT TO RESOLVE:
${JSON.stringify(consistencyConflicts)}

TASK: Ask ONE question that helps resolve the most critical conflict.
- Cite sources clearly ("In your PDF..." or "You mentioned earlier...")
- Be neutral - don't suggest which source is correct
- Help the user see the contradiction` :
`GAP TO FILL:
Priority: ${priorityGap?.importance || 'high'}
Category: ${priorityGap?.category || 'specification'}
Description: ${priorityGap?.description || 'Missing information'}
Suggested question: ${priorityGap?.question || 'Could you clarify this?'}

TASK: Ask ONE question about this gap.
- Provide context for why you're asking
- If helpful, offer 2-3 examples (don't force a choice)
- Keep it conversational and friendly
- NEVER ask multiple questions at once`}

Recent conversation: ${JSON.stringify(conversationHistory.slice(-3))}

IMPORTANT:
- Ask ONLY ONE question
- Make it easy to answer
- Be natural and conversational

Return ONLY the question text (no JSON, no formatting).`,
      },
    ];

    const response = await this.callClaude(messages, 500);

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: false, // Shows in agent bubble, not main chat
      metadata: {
        isQuestion: true,
        questionType: priorityType === 'conflict' ? 'conflict_resolution' : 'gap_clarification',
        priority: priorityType === 'conflict' ? 'critical' : priorityGap?.importance || 'medium',
        requiresResponse: true,
        hasConflicts: priorityType === 'conflict',
        gapAddressed: priorityGap ? {
          category: priorityGap.category,
          description: priorityGap.description,
          importance: priorityGap.importance,
        } : null,
        remainingGaps: gaps.gaps ? gaps.gaps.length - 1 : 0,
      },
    };
  }
}