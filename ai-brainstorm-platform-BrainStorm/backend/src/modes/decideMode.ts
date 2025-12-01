/**
 * Decide Mode
 *
 * Formalizes a decision with light, inline verification.
 * Checks for conflicts with existing decisions in the same prompt.
 * One API call. No separate verification agents.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConversationContext, ModeResponse, Item } from './types';
import { v4 as uuidv4 } from 'uuid';

const DECIDE_PROMPT = `You are helping the user formalize a decision. Be direct and brief.

PROJECT: {projectTitle}

EXISTING DECISIONS (check for conflicts):
{existingDecisions}

EXISTING IDEAS (for reference):
{existingIdeas}

INSTRUCTIONS:
1. Acknowledge the decision clearly in one sentence
2. If it conflicts or overlaps with an existing decision, mention it briefly and ask if they want to update
3. Don't lecture or over-explain

Format your response like this:
- First, your brief acknowledgment (1-2 sentences max)
- Then extract the decision:

<decision>
[The decision as a clear, actionable statement]
</decision>

If there's a potential conflict:
<conflict>
[Brief description of the conflict with the existing decision]
</conflict>`;

function buildPrompt(context: ConversationContext): string {
  const existingIdeas = context.ideas.length > 0
    ? context.ideas.map(i => `- ${i.text}`).join('\n')
    : '(none)';

  const existingDecisions = context.decisions.length > 0
    ? context.decisions.map(d => `- ${d.text}`).join('\n')
    : '(none yet)';

  return DECIDE_PROMPT
    .replace('{projectTitle}', context.projectTitle)
    .replace('{existingIdeas}', existingIdeas)
    .replace('{existingDecisions}', existingDecisions);
}

function parseResponse(response: string): {
  cleanMessage: string;
  decision: string | null;
  conflict: string | null;
} {
  // Extract decision
  const decisionMatch = response.match(/<decision>([\s\S]*?)<\/decision>/);
  const decision = decisionMatch ? decisionMatch[1].trim() : null;

  // Extract conflict warning if present
  const conflictMatch = response.match(/<conflict>([\s\S]*?)<\/conflict>/);
  const conflict = conflictMatch ? conflictMatch[1].trim() : null;

  // Clean message for display
  let cleanMessage = response
    .replace(/<decision>[\s\S]*?<\/decision>/, '')
    .replace(/<conflict>[\s\S]*?<\/conflict>/, '')
    .trim();

  // If there's a conflict, append it naturally to the message
  if (conflict) {
    cleanMessage += `\n\n**Note:** ${conflict}`;
  }

  return { cleanMessage, decision, conflict };
}

export async function decideMode(
  client: Anthropic,
  message: string,
  context: ConversationContext
): Promise<ModeResponse> {
  const systemPrompt = buildPrompt(context);

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...context.recentMessages.slice(-6), // Less history needed for decisions
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  const { cleanMessage, decision, conflict } = parseResponse(responseText);

  // Convert decision to Item
  const extractedItems: Item[] = decision
    ? [{
        id: uuidv4(),
        text: decision,
        type: 'decision',
        createdAt: new Date().toISOString(),
      }]
    : [];

  return {
    message: cleanMessage,
    extractedItems,
    mode: 'decide',
    metadata: conflict ? { conflictWarning: conflict } : undefined,
  };
}
