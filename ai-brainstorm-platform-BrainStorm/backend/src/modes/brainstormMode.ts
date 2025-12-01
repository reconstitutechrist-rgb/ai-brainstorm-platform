/**
 * Brainstorm Mode
 *
 * Free-flowing conversation that captures ideas naturally.
 * One API call. Simple prompt. No complex orchestration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConversationContext, ModeResponse, Item } from './types';
import { v4 as uuidv4 } from 'uuid';

const BRAINSTORM_PROMPT = `You are a focused brainstorming partner. Your style is conversational but efficient.

RULES:
1. Respond naturally but concisely (2-4 sentences max for discussion)
2. Ask ONE clarifying question only if something is genuinely unclear
3. Don't over-validate or use excessive enthusiasm
4. Extract concrete ideas mentioned by the user

PROJECT CONTEXT:
Title: {projectTitle}

EXISTING IDEAS:
{existingIdeas}

EXISTING DECISIONS:
{existingDecisions}

After your conversational response, if the user mentioned any concrete ideas, features, or concepts, extract them in this exact format:

<ideas>
- [concrete idea here]
- [another idea if applicable]
</ideas>

Only include the <ideas> block if there are actual new ideas to extract. Don't repeat existing ideas.`;

function buildPrompt(context: ConversationContext): string {
  const existingIdeas = context.ideas.length > 0
    ? context.ideas.map(i => `- ${i.text}`).join('\n')
    : '(none yet)';

  const existingDecisions = context.decisions.length > 0
    ? context.decisions.map(d => `- ${d.text}`).join('\n')
    : '(none yet)';

  return BRAINSTORM_PROMPT
    .replace('{projectTitle}', context.projectTitle)
    .replace('{existingIdeas}', existingIdeas)
    .replace('{existingDecisions}', existingDecisions);
}

function parseIdeas(response: string): { cleanMessage: string; ideas: string[] } {
  const ideasMatch = response.match(/<ideas>([\s\S]*?)<\/ideas>/);

  if (!ideasMatch) {
    return { cleanMessage: response.trim(), ideas: [] };
  }

  // Extract ideas from the block
  const ideasBlock = ideasMatch[1];
  const ideas = ideasBlock
    .split('\n')
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(line => line.length > 0);

  // Remove the ideas block from the message shown to user
  const cleanMessage = response.replace(/<ideas>[\s\S]*?<\/ideas>/, '').trim();

  return { cleanMessage, ideas };
}

export async function brainstormMode(
  client: Anthropic,
  message: string,
  context: ConversationContext
): Promise<ModeResponse> {
  const systemPrompt = buildPrompt(context);

  // Build conversation history for Claude
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...context.recentMessages.slice(-10), // Last 10 messages for context
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  const { cleanMessage, ideas } = parseIdeas(responseText);

  // Convert extracted ideas to Item objects
  const extractedItems: Item[] = ideas.map(idea => ({
    id: uuidv4(),
    text: idea,
    type: 'idea',
    createdAt: new Date().toISOString(),
  }));

  return {
    message: cleanMessage,
    extractedItems,
    mode: 'brainstorm',
  };
}
