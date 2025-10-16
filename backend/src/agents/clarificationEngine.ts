import { BaseAgent } from './base';
import { AgentResponse } from '../types';

/**
 * ClarificationEngine Agent
 *
 * Consolidates: GapDetection + Clarification + Questioner
 *
 * Responsibilities:
 * - Detect information gaps (specification, context, definition)
 * - Generate targeted questions to resolve gaps
 * - Ask exploratory questions for deeper understanding
 * - Prioritize questions by importance (critical > high > medium > low)
 * - Handle conflict resolution questions
 */
export class ClarificationEngineAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Clarification Engine - unified gap detection and intelligent questioning.

YOUR PURPOSE:
1. Detect missing information that prevents complete understanding
2. Generate targeted questions to resolve gaps and conflicts
3. Ask exploratory questions to deepen understanding

GAP DETECTION:
- Unspecified details (material, color, size, timing, etc.)
- Missing context or background
- Undefined terms or references
- Incomplete specifications
- Ambiguous statements needing clarification

QUESTIONING PRINCIPLES:
1. Ask ONE specific question at a time (NEVER multiple)
2. Make questions easy to answer
3. Provide context for why you're asking
4. Offer 2-3 options when helpful (don't force choice)
5. Keep language natural and friendly

QUESTION TYPES:
- Gap Clarification: "What [specific detail] are you thinking?"
- Conflict Resolution: "I see X in your PDF but you said Y - which should we use?"
- Specification: "Could you specify the [detail]?"
- Exploration: "Could you tell me more about [aspect]?"
- Binary Choice: "Did you mean X or Y?"
- Confirmation: "Just to confirm, you mean [interpretation]?"

PRIORITY LEVELS:
- critical: Blocks all progress (ask immediately)
- high: Important for quality (ask soon)
- medium: Helpful but not essential (ask when relevant)
- low: Nice to have (optional)

OUTPUT FORMATS:

For analyze():
{
  "gaps": [
    {
      "category": "specification|context|definition|detail",
      "description": "what's missing",
      "importance": "critical|high|medium|low",
      "question": "specific question to ask user"
    }
  ],
  "summary": "brief overview of gaps",
  "criticalCount": number,
  "hasGaps": bool,
  "hasCriticalGaps": bool,
  "priority": "critical|high|medium|low"
}

For generateQuestion(): Return ONLY the question text (no JSON, no formatting)`;

    super('ClarificationEngineAgent', systemPrompt);
  }

  /**
   * Analyze user message for gaps (previously GapDetectionAgent)
   * Returns structured gap data - SILENT, no user-facing message
   */
  async analyze(userMessage: string, projectState: any): Promise<AgentResponse> {
    this.log('Analyzing for information gaps');

    const messages = [
      {
        role: 'user',
        content: `Analyze this statement for missing information that prevents complete understanding or decision-making.

User statement: "${userMessage}"

Current project state: ${JSON.stringify(projectState)}

Identify gaps and prioritize by importance. Be precise - don't flag things that aren't actually needed.

Return ONLY valid JSON matching the system prompt format for analyze().`,
      },
    ];

    const response = await this.callClaude(messages, 800);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const gaps = JSON.parse(cleanResponse);

    this.log(`Found ${gaps.criticalCount || 0} critical gaps, ${gaps.gaps?.length || 0} total gaps`);

    // Clarification Engine is SILENT during analysis - only returns structured data
    return {
      agent: this.name,
      message: '', // Never create user messages during analysis
      showToUser: false, // Always silent for analysis
      metadata: {
        ...gaps,
        hasGaps: gaps.criticalCount > 0 || gaps.gaps?.some((g: any) => g.importance === 'high'),
        hasCriticalGaps: gaps.criticalCount > 0,
        priority: gaps.criticalCount > 0 ? 'critical' : (gaps.gaps?.some((g: any) => g.importance === 'high') ? 'high' : 'low'),
      },
    };
  }

  /**
   * Generate targeted question to resolve gaps or conflicts (previously ClarificationAgent)
   * Shows in agent bubble (not main chat)
   */
  async generateQuestion(gaps: any, conversationHistory: any[], consistencyConflicts: any = null): Promise<AgentResponse> {
    this.log('Generating clarification question');

    // Prioritize reference conflicts over regular gaps
    let priorityType = 'gaps';
    let focusData = gaps;

    if (consistencyConflicts && consistencyConflicts.conflictDetected) {
      priorityType = 'conflict';
      focusData = consistencyConflicts;
      this.log(`Prioritizing conflict resolution - ${consistencyConflicts.conflicts?.length || 0} conflicts detected`);
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
        content: `Generate ONE clear, friendly question to resolve ${priorityType === 'conflict' ? 'a conflict' : 'a gap in information'}.

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

  /**
   * Generate exploratory question for deeper understanding (previously QuestionerAgent)
   * Used in exploring workflow
   */
  async generateExplorationQuestion(context: any, conversationHistory: any[]): Promise<AgentResponse> {
    this.log('Generating exploration question');

    const messages = [
      {
        role: 'user',
        content: `Based on this context, generate ONE strategic question to help clarify or expand the user's thinking.

This is exploratory mode - ask open-ended questions that deepen understanding.

Context: ${JSON.stringify(context)}

Recent conversation: ${JSON.stringify(conversationHistory.slice(-3))}

QUESTION STRATEGY:
- Ask about priorities, constraints, or preferences
- Explore implications or considerations
- Help user think through different aspects
- Keep it specific and actionable
- NEVER ask multiple questions at once

Return only the question, nothing else.`,
      },
    ];

    const response = await this.callClaude(messages, 400);

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: true, // Exploration questions show in main chat
      metadata: {
        isQuestion: true,
        questionType: 'exploration',
        priority: 'medium',
        requiresResponse: true,
      },
    };
  }

  /**
   * Convenience method: Analyze and immediately generate question if gaps found
   * Used for streamlined workflows
   */
  async analyzeAndAsk(userMessage: string, projectState: any, conversationHistory: any[]): Promise<AgentResponse> {
    // Step 1: Analyze for gaps
    const analysisResult = await this.analyze(userMessage, projectState);
    const gaps = analysisResult.metadata;

    // Step 2: If gaps found, generate question
    if (gaps?.hasGaps && gaps.gaps && gaps.gaps.length > 0) {
      this.log('Gaps found - generating question');
      return await this.generateQuestion(gaps, conversationHistory);
    }

    // No gaps - return empty result
    this.log('No significant gaps found');
    return {
      agent: this.name,
      message: '',
      showToUser: false,
      metadata: {
        hasGaps: false,
        noQuestionNeeded: true,
      },
    };
  }
}
