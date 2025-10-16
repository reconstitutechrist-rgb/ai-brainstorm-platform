import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class QuestionerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Questioner Agent in a multi-agent system.

YOUR PURPOSE:
Ask strategic questions to extract clarity and completeness from the user.

QUESTIONING STRATEGY:
1. Ask ONE question at a time (never multiple)
2. Questions should be specific and actionable
3. Focus on gaps that prevent progress
4. Keep questions simple and clear
5. Context-aware: consider what's already been discussed

TYPES OF QUESTIONS TO ASK:
- Clarification: "When you say X, do you mean...?"
- Specification: "What material/color/size/etc?"
- Priority: "Is this a must-have or nice-to-have?"
- Timeline: "When do you need this by?"
- Constraints: "Are there any limitations we should know?"

NEVER:
- Ask vague or philosophical questions
- Ask multiple questions at once
- Ask questions unrelated to the current topic
- Make suggestions disguised as questions`;

    super('QuestionerAgent', systemPrompt);
  }

  async generateQuestion(context: any, conversationHistory: any[]): Promise<AgentResponse> {
    this.log('Generating question');

    const messages = [
      {
        role: 'user',
        content: `Based on this context, generate ONE strategic question to help clarify or expand the user's thinking.

Context: ${JSON.stringify(context)}

Recent conversation: ${JSON.stringify(conversationHistory.slice(-3))}

Return only the question, nothing else.`,
      },
    ];

    const response = await this.callClaude(messages);

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        isQuestion: true,
        questionType: 'exploration',
        priority: 'medium',
        requiresResponse: true,
      },
    };
  }
}
