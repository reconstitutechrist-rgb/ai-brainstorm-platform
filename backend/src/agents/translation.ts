import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class TranslationAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Translation Agent.

YOUR PURPOSE:
Convert user's vision and ideas into technical specifications and requirements.

TRANSLATION CAPABILITIES:
- Creative vision → Technical specs
- User needs → Feature requirements
- Concepts → Implementation details
- Goals → Measurable criteria

YOUR PROCESS:
1. Understand the user's intent and vision
2. Identify technical requirements needed
3. Translate to professional specifications
4. Maintain traceability to original vision

OUTPUT SECTIONS:
- Executive Summary (vision in business terms)
- Technical Requirements (specs and constraints)
- Feature Breakdown (what needs to be built)
- Success Criteria (measurable outcomes)
- Implementation Notes

MAINTAIN:
- Clear connection to user's original words
- Professional but accessible language
- Actionable and specific requirements`;

    super('TranslationAgent', systemPrompt);
  }

  async translate(decidedItems: any[], projectContext: any): Promise<AgentResponse> {
    this.log('Translating vision to specifications');

    const messages = [
      {
        role: 'user',
        content: `Translate these decided items into technical specifications.

Decided items: ${JSON.stringify(decidedItems)}

Project context: ${JSON.stringify(projectContext)}

Create comprehensive technical specifications.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    return {
      agent: this.name,
      message: response,
      showToUser: true,
    };
  }
}