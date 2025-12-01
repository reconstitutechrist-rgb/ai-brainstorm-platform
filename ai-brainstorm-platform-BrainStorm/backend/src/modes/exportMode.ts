/**
 * Export Mode
 *
 * Generates documents from captured ideas and decisions.
 * Supports: summary, prd, tasks, roadmap
 * One API call per export.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConversationContext, ModeResponse, ExportFormat } from './types';

const EXPORT_PROMPTS: Record<ExportFormat, string> = {
  summary: `Create a concise project summary based on the following ideas and decisions.

PROJECT: {projectTitle}

DECISIONS MADE:
{decisions}

IDEAS BEING EXPLORED:
{ideas}

Format as a clear, readable summary with sections:
1. Overview (2-3 sentences)
2. Key Decisions
3. Ideas Under Consideration
4. Recommended Next Steps`,

  prd: `Generate a Product Requirements Document (PRD) based on these decisions and ideas.

PROJECT: {projectTitle}

DECISIONS:
{decisions}

IDEAS:
{ideas}

Format as a professional PRD with:
1. Executive Summary
2. Problem Statement
3. Goals & Success Metrics
4. Requirements (based on decisions)
5. Open Questions (based on ideas still being explored)
6. Out of Scope`,

  tasks: `Convert these decisions into actionable tasks.

PROJECT: {projectTitle}

DECISIONS:
{decisions}

IDEAS (for context, not tasks yet):
{ideas}

Create a prioritized task list. For each task:
- Clear action item
- Brief description
- Dependencies (if any)

Format as a numbered list, prioritized by logical order of execution.`,

  roadmap: `Create a high-level roadmap from these decisions and ideas.

PROJECT: {projectTitle}

DECISIONS:
{decisions}

IDEAS:
{ideas}

Create a phased roadmap:
- Phase 1: Foundation (must-haves from decisions)
- Phase 2: Enhancement (additional features from decisions)
- Phase 3: Future (ideas worth exploring)

Keep it high-level and actionable.`,
};

function detectExportFormat(message: string): ExportFormat {
  const lower = message.toLowerCase();

  if (lower.includes('prd') || lower.includes('product requirement')) {
    return 'prd';
  }
  if (lower.includes('task') || lower.includes('todo') || lower.includes('action')) {
    return 'tasks';
  }
  if (lower.includes('roadmap') || lower.includes('timeline') || lower.includes('phase')) {
    return 'roadmap';
  }

  return 'summary'; // Default
}

function buildPrompt(format: ExportFormat, context: ConversationContext): string {
  const decisions = context.decisions.length > 0
    ? context.decisions.map((d, i) => `${i + 1}. ${d.text}`).join('\n')
    : '(No decisions made yet)';

  const ideas = context.ideas.length > 0
    ? context.ideas.map((i, idx) => `${idx + 1}. ${i.text}`).join('\n')
    : '(No ideas captured yet)';

  return EXPORT_PROMPTS[format]
    .replace('{projectTitle}', context.projectTitle)
    .replace('{decisions}', decisions)
    .replace('{ideas}', ideas);
}

export async function exportMode(
  client: Anthropic,
  message: string,
  context: ConversationContext
): Promise<ModeResponse> {
  const format = detectExportFormat(message);
  const systemPrompt = buildPrompt(format, context);

  // Check if there's anything to export
  if (context.decisions.length === 0 && context.ideas.length === 0) {
    return {
      message: "There's nothing to export yet. Start brainstorming to capture some ideas and decisions first!",
      extractedItems: [],
      mode: 'export',
      metadata: { exportFormat: format },
    };
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: `Generate a ${format} for this project.` },
    ],
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return {
    message: responseText,
    extractedItems: [], // Exports don't create new items
    mode: 'export',
    metadata: { exportFormat: format },
  };
}
