import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class BrainstormingAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Brainstorming Agent - Pure Reflective Mirror

YOUR ONLY JOB: Reflect, organize, and clarify what the user SAID. Nothing else.

CORE RULES (NEVER VIOLATE):
❌ NEVER add suggestions, ideas, or opinions
❌ NEVER ask questions (that's Questioner Agent's job)
❌ NEVER use phrases like: "what if you...", "you could also...", "have you considered..."
❌ NEVER inject creativity or assumptions
❌ NEVER suggest possibilities or directions

✓ ONLY reflect what they said using: "You're saying...", "So you're considering...", "You mentioned..."
✓ ONLY organize scattered thoughts into clear structure
✓ ONLY identify connections between ideas THEY shared
✓ ONLY clarify ambiguous statements they made

STYLE: Concise (1-3 sentences), neutral tone, purely reflective.

EXAMPLE:
User: "I want RGB lighting and maybe a transparent case"
You: "You want RGB lighting included. You're considering a transparent case as a possibility."
NOT: "RGB lighting is a great idea! You could add programmable patterns..." ❌`;

    super('BrainstormingAgent', systemPrompt);
  }

  async reflect(userMessage: string, conversationHistory: any[], projectReferences: any[] = []): Promise<AgentResponse> {
    this.log('Processing reflection');

    // Build context from recent conversation
    const recentMessages = conversationHistory.slice(-5);
    let contextStr = '';
    if (recentMessages.length > 0) {
      contextStr = '\n\nRecent conversation:\n' + recentMessages.map((msg: any) =>
        `${msg.role}: ${msg.content}`
      ).join('\n');
    }

    // Build reference context if files are uploaded
    let referenceStr = '';
    if (projectReferences.length > 0) {
      const refs = projectReferences.map(ref => {
        let refInfo = `- ${ref.filename} (${ref.type})`;
        if (ref.analysis) {
          refInfo += `\n  Summary: ${ref.analysis.substring(0, 500)}${ref.analysis.length > 500 ? '...' : ''}`;
        }
        if (ref.description) {
          refInfo += `\n  Description: ${ref.description}`;
        }
        return refInfo;
      }).join('\n');

      referenceStr = `\n\nUploaded References:\n${refs}`;
      this.log(`Including ${projectReferences.length} references in context`);
    }

    const messages = [
      {
        role: 'user',
        content: `Act as a PURE REFLECTIVE MIRROR. Only reflect back what the user said - NO suggestions, NO questions, NO new ideas.

User's message: "${userMessage}"${contextStr}${referenceStr}

Your response must ONLY:
1. Reflect what they explicitly said
2. Organize their thoughts clearly
3. Identify connections between ideas THEY mentioned

Remember: You are a MIRROR, not a creative partner. Just reflect their words back in organized form.
${referenceStr ? '\nNote: User uploaded references. If they mention them, reflect that: "You shared [file] showing..." - but do NOT analyze or suggest based on references.' : ''}`,
      },
    ];

    const response = await this.callClaude(messages, 1500); // Increase token limit for better responses

    const result = {
      agent: this.name,
      message: response,
      showToUser: true,
    };

    this.log(`Returning response with showToUser=${result.showToUser}, message length=${response.length}`);

    return result;
  }
}
