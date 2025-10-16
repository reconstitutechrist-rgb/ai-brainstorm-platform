import { BaseAgent } from './base';
import { AgentResponse } from '../types';

/**
 * ConversationAgent
 *
 * Consolidates: BrainstormingAgent + ClarificationEngine (which was GapDetection + Clarification + Questioner)
 *
 * Responsibilities:
 * - Reflect and organize what the user said (validation of understanding)
 * - Detect information gaps and ambiguities
 * - Ask ONE targeted clarifying question when needed
 * - Acknowledge corrections and adjust understanding
 *
 * This creates natural conversation flow where the agent demonstrates understanding
 * AND asks for clarification in a single response.
 */
export class ConversationAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Conversation Agent - Reflective Understanding + Targeted Clarification

YOUR PURPOSE:
You are the user's conversational partner in brainstorming. Your job is to:
1. Demonstrate you understood what they said (reflection)
2. Ask ONE clarifying question if something is ambiguous or missing

CORE BEHAVIOR:

ALWAYS START by reflecting their statement:
✓ "You're saying [restate their core point]"
✓ "So you want [organize their scattered thoughts]"
✓ "You mentioned [identify key elements]"

THEN, if there's a gap or ambiguity, ask ONE question:
✓ "To clarify: [specific question]?"
✓ "Just to confirm, do you mean [interpretation]?"
✓ "Could you specify [missing detail]?"

CRITICAL RULES:
❌ NEVER add suggestions, ideas, or opinions
❌ NEVER ask multiple questions at once
❌ NEVER say "Looking at your documents" unless they mentioned them
❌ NEVER elaborate beyond what they said
❌ NEVER use phrases like "you could", "what if", "have you considered", "this creates", "this ties into"

✓ ONLY reflect what they explicitly stated
✓ ONLY ask ONE question if something is unclear
✓ ONLY acknowledge if they correct you ("You're right, I misunderstood...")

DETECTING CORRECTIONS:
If user says: "no", "listen", "I just said", "that's not what I meant" → Start with acknowledgment:
"You're right, I misunderstood. You're saying [correct understanding]."

EXAMPLES:

User: "I want RGB lighting and maybe a transparent case"
You: "You want RGB lighting included. You're considering a transparent case as a possibility."

User: "I want 3 levels for the Create Your Own Story feature"
You: "You're creating a 'Create Your Own Story' feature with 3 levels. To clarify: Are these difficulty levels (beginner/intermediate/advanced) or different story types?"

User: "no! this is a new feature not part of the other modes"
You: "You're right, I misunderstood. The 'Create Your Own Story' feature is completely separate from the Canon and Dynamic modes - it's a new feature for users to create interactive stories from scratch."

RESPONSE STRUCTURE:
1. Reflection (1-2 sentences showing you understood)
2. Clarification question (ONLY if needed, max 1 question)
3. Keep total response under 4 sentences

Stay concise, natural, and genuinely helpful.`;

    super('ConversationAgent', systemPrompt);
  }

  /**
   * Main conversation method - reflects understanding and asks clarifying questions
   */
  async respond(userMessage: string, conversationHistory: any[], projectState: any, projectReferences: any[] = []): Promise<AgentResponse> {
    this.log('Processing conversation');

    // Detect if user is correcting us
    const correctionSignals = ['no', 'listen', 'i just said', 'i said', 'not what i meant', 'you\'re not listening', 'wrong'];
    const isCorrection = correctionSignals.some(signal => userMessage.toLowerCase().includes(signal));

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
          refInfo += `\n  Summary: ${ref.analysis.substring(0, 300)}${ref.analysis.length > 300 ? '...' : ''}`;
        }
        return refInfo;
      }).join('\n');

      referenceStr = `\n\nUploaded References:\n${refs}`;
      this.log(`Including ${projectReferences.length} references in context`);
    }

    const messages = [
      {
        role: 'user',
        content: `You are a conversational agent helping with brainstorming.

User's message: "${userMessage}"${contextStr}${referenceStr}

${isCorrection ? `⚠️ CORRECTION DETECTED - User is correcting your previous misunderstanding!

MANDATORY BEHAVIOR FOR CORRECTIONS:
1. Start with: "You're right, I misunderstood. [correct understanding]"
2. Restate their point correctly in YOUR OWN WORDS to show you now understand
3. DO NOT ASK ANY QUESTIONS - Your response must end with a period (.) not a question mark (?)
4. Keep it short - 2-3 sentences maximum

CRITICAL: When being corrected, your ONLY job is to acknowledge and demonstrate correct understanding. NO QUESTIONS ALLOWED.` : `Current project state: ${JSON.stringify(projectState, null, 2)}

YOUR RESPONSE MUST:
1. Start by reflecting what they said (show you understood)
2. If something is unclear or missing, ask ONE specific clarifying question
3. Stay under 4 sentences total
4. Be natural and conversational`}

FORBIDDEN:
- Do NOT add suggestions or ideas
- Do NOT ask multiple questions
- Do NOT say "Looking at your documents" unless they mentioned them
- Do NOT use "you could", "what if", "this creates", "this ties into"
- Do NOT elaborate beyond what they said

${referenceStr ? '\nIf they mention uploaded files: Reflect that: "You shared [filename] showing..." but do NOT analyze or suggest based on references unless asked.' : ''}`,
      },
    ];

    const response = await this.callClaude(messages, 600);

    // Validate response doesn't violate rules
    const forbidden = ['you could', 'what if', 'have you considered', 'looking at your documents', 'this creates', 'this ties into', 'this opens up'];
    const violatesRules = forbidden.some(phrase => response.toLowerCase().includes(phrase));

    // Count question marks
    const questionCount = (response.match(/\?/g) || []).length;

    // CRITICAL: If this is a correction, ensure NO questions are asked
    const hasQuestionDuringCorrection = isCorrection && questionCount > 0;

    if (violatesRules || questionCount > 1 || hasQuestionDuringCorrection) {
      this.log('Response violated rules - regenerating with stricter prompt');

      const retryMessages = [
        {
          role: 'user',
          content: `CRITICAL: Your previous response violated the rules.

User said: "${userMessage}"

${isCorrection ? `⚠️ USER IS CORRECTING YOU - THIS IS A CORRECTION!

YOU MUST:
1. Start with "You're right, I misunderstood."
2. Restate what they ACTUALLY said in your own words
3. END WITH A PERIOD (.) - ABSOLUTELY NO QUESTION MARKS (?)
4. Keep it 2-3 sentences maximum

Example: "You're right, I misunderstood. The Create Your Own Story mode is a completely separate feature from Canon and Divergent modes, specifically for users to create their own interactive stories from scratch."

DO NOT ASK ANY QUESTIONS. Just acknowledge and restate correctly.` : `YOU MUST:
1. Reflect ONLY what they said (no suggestions, no elaborations)
2. Ask maximum ONE question if something is unclear
3. Use phrases like "You're saying...", "You mentioned...", "You want..."

FORBIDDEN PHRASES (do NOT use):
- "you could", "what if", "have you considered"
- "looking at your documents", "this creates", "this ties into"
- Multiple questions (?)`}

Generate a simple, clean response that follows these rules EXACTLY.`,
        },
      ];

      const retryResponse = await this.callClaude(retryMessages, 400);

      return {
        agent: this.name,
        message: retryResponse.trim(),
        showToUser: true,
        metadata: {
          wasRetried: true,
          originalViolation: hasQuestionDuringCorrection ? 'question during correction' : (violatesRules ? 'forbidden phrases' : 'multiple questions'),
        },
      };
    }

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: true,
      metadata: {
        isCorrection,
        hasQuestion: questionCount === 1,
      },
    };
  }

  /**
   * Analyze for gaps (silent) - used by orchestrator for workflow decisions
   * Returns structured data without showing anything to user
   */
  async analyze(userMessage: string, projectState: any): Promise<AgentResponse> {
    this.log('Analyzing for information gaps (silent)');

    const messages = [
      {
        role: 'user',
        content: `Analyze this statement for missing information that prevents complete understanding or decision-making.

User statement: "${userMessage}"

Current project state: ${JSON.stringify(projectState)}

Identify gaps and prioritize by importance. Be precise - don't flag things that aren't actually needed.

Return ONLY valid JSON:
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
}`,
      },
    ];

    const response = await this.callClaude(messages, 800);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const gaps = JSON.parse(cleanResponse);

    this.log(`Found ${gaps.criticalCount || 0} critical gaps, ${gaps.gaps?.length || 0} total gaps`);

    // Analysis is SILENT - only returns structured data for orchestrator
    return {
      agent: this.name,
      message: '', // Never create user messages during analysis
      showToUser: false,
      metadata: {
        ...gaps,
        hasGaps: gaps.criticalCount > 0 || gaps.gaps?.some((g: any) => g.importance === 'high'),
        hasCriticalGaps: gaps.criticalCount > 0,
        priority: gaps.criticalCount > 0 ? 'critical' : (gaps.gaps?.some((g: any) => g.importance === 'high') ? 'high' : 'low'),
      },
    };
  }

  /**
   * Legacy compatibility - maps old "reflect" method to new "respond"
   */
  async reflect(userMessage: string, conversationHistory: any[], projectReferences: any[] = []): Promise<AgentResponse> {
    return this.respond(userMessage, conversationHistory, {}, projectReferences);
  }

  /**
   * Legacy compatibility - maps old "generateQuestion" to respond with question focus
   */
  async generateQuestion(gaps: any, conversationHistory: any[], consistencyConflicts: any = null): Promise<AgentResponse> {
    // For backwards compatibility with workflows that call generateQuestion directly
    // We'll generate a question based on the gaps provided

    let priorityGap = null;
    if (gaps.gaps && gaps.gaps.length > 0) {
      const importanceOrder: { [key: string]: number } = { critical: 4, high: 3, medium: 2, low: 1 };
      const sortedGaps = gaps.gaps.sort((a: any, b: any) => {
        const aScore = importanceOrder[a.importance] || 0;
        const bScore = importanceOrder[b.importance] || 0;
        return bScore - aScore;
      });
      priorityGap = sortedGaps[0];
    }

    const messages = [
      {
        role: 'user',
        content: `Generate ONE clear, friendly question to fill this gap:

Gap: ${priorityGap?.description || 'Missing information'}
Priority: ${priorityGap?.importance || 'high'}
Suggested question: ${priorityGap?.question || 'Could you clarify?'}

Return ONLY the question text (no JSON, no formatting).`,
      },
    ];

    const response = await this.callClaude(messages, 400);

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: false, // Shows in agent bubble
      metadata: {
        isQuestion: true,
        questionType: 'gap_clarification',
        priority: priorityGap?.importance || 'medium',
      },
    };
  }

  /**
   * Legacy compatibility - exploration questions
   */
  async generateExplorationQuestion(context: any, conversationHistory: any[]): Promise<AgentResponse> {
    const messages = [
      {
        role: 'user',
        content: `Based on this context, generate ONE strategic question to help clarify or expand the user's thinking.

Context: ${JSON.stringify(context)}
Recent conversation: ${JSON.stringify(conversationHistory.slice(-3))}

Ask about priorities, constraints, or preferences. Keep it specific and actionable.
Return only the question.`,
      },
    ];

    const response = await this.callClaude(messages, 400);

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: true,
      metadata: {
        isQuestion: true,
        questionType: 'exploration',
      },
    };
  }
}
