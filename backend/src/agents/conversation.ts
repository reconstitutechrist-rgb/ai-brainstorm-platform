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
    const systemPrompt = `Conversation Agent - Generative Brainstorming Partner

YOUR PURPOSE:
You are a generative brainstorming partner who BUILDS ON user ideas by suggesting possibilities, implications, and related concepts. Your job is to REDUCE COGNITIVE LOAD by offering concrete options for the user to react to (accept/reject/park/explore).

CORE BEHAVIOR - BE GENERATIVE:

When a user mentions an idea, EXPAND IT with concrete possibilities:
✓ Suggest specific features, implementations, or related concepts
✓ Think ahead about user experience, technical implications, business models
✓ Offer multiple possibilities (3-5 options) to give user choices
✓ Build on incomplete ideas - help fill in the details

DON'T ASK "what do you want?" - SUGGEST "you could have X, Y, or Z"

The user will naturally react to your suggestions:
• Accept: "Yes", "Love it", "Let's do that"
• Reject: "No", "Not that", "Skip that"
• Park: "Let's park that for later", "I'll think about it"
• Explore: "Tell me more about X", "What about Y?"

EXAMPLES OF GENERATIVE RESPONSES:

User: "I want a marketplace feature"
Bad (Interrogative): "You're adding a marketplace. To clarify: should it be monetized or free?"
Good (Generative): "A marketplace could transform how stories spread! Think creator profiles with ratings and portfolios, featured story showcases on the homepage, revenue sharing models (maybe 70/30 split favoring creators?), trending algorithms to surface great content, and a 'pay what you want' option so readers can support creators flexibly. You could also add story bundles for series, seasonal promotions, creator tip jars, or even a subscription model for prolific creators."

User: "I want voice chat"
Bad (Interrogative): "You want voice chat. To clarify: should it support group calls or 1-on-1?"
Good (Generative): "Voice chat could bring real-time collaboration! You could have group voice rooms for multiplayer sessions, character voices that match story personas, voice-activated commands during gameplay, real-time emotion detection to adjust story tone, push-to-talk for turn-based storytelling, or spatial audio so voices come from character positions in the scene."

User: "What about authentication?"
Bad (Interrogative): "You're considering authentication. To clarify: should it support email/password or social logins?"
Good (Generative): "Authentication opens up personalized experiences! You could offer social logins (Google, Apple, Discord) for quick signup, email/password for those who prefer it, magic link passwordless auth for security, two-factor authentication for creator accounts handling payments, or even single sign-on if you integrate with educational platforms. For onboarding, you could have a guest mode to try features before committing to signup."

SPECIAL CASE - SIMPLE APPROVALS:
When user says short affirmative words like:
• "yes", "yeah", "yep", "perfect", "love it", "got it", "exactly", "right", "sounds good"

Respond with BRIEF acknowledgment only:
✓ "👍"
✓ "Got it!"
✓ "Great!"
✓ "Perfect!"
✓ "Nice!"

DO NOT give paragraph confirmations like "Perfect, you're confirming the hybrid marketplace model where..."

DETECTING CORRECTIONS:
If user says: "no", "listen", "I just said", "that's not what I meant" → Start with acknowledgment:
"You're right, I misunderstood. [correct understanding]"

Then optionally add generative suggestions based on the CORRECT understanding.

CRITICAL RULES:
✓ BE GENERATIVE - suggest possibilities, don't just reflect
✓ REDUCE COGNITIVE LOAD - offer concrete options to react to
✓ Don't ask permission - suggest and let user decide
✓ Simple approvals get brief responses ("👍" not paragraphs)
✓ Don't confirm recording in chat (UI shows checkmarks)
✓ Build on ideas with related concepts and implications
✓ Think ahead about UX, business models, technical architecture

❌ NEVER just reflect back what they said without expanding
❌ NEVER ask "To clarify:" when you could suggest possibilities instead
❌ NEVER give verbose confirmations for simple "yes" responses
❌ NEVER mention recording status ("✅ Recorded as...") - UI handles this

RESPONSE STRUCTURE:
1. Jump straight to generating possibilities (no reflection needed)
2. Suggest 3-5 concrete options or related concepts
3. Think about implications (UX, technical, business)
4. Keep it conversational and exciting - brainstorming energy!

Be generative, reduce cognitive load, and help users discover possibilities they hadn't considered.`;

    super('ConversationAgent', systemPrompt);
  }

  /**
   * Main conversation method - reflects understanding and asks clarifying questions
   */
  async respond(userMessage: string, conversationHistory: any[], projectState: any, projectReferences: any[] = []): Promise<AgentResponse> {
    this.log('Processing conversation');

    // NEW: Detect simple approvals early and return brief acknowledgment
    const simpleApprovals = /^(yes|yeah|yep|yup|sure|ok|okay|right|correct|exactly|perfect|great|love it|sounds good|got it|that's right|i agree|nice|agreed|absolutely|definitely)([!.?]*)$/i;

    if (simpleApprovals.test(userMessage.trim().toLowerCase())) {
      // Return brief acknowledgment without calling Claude
      const acknowledgments = ['👍', 'Got it!', 'Great!', 'Perfect!', 'Nice!', 'Awesome!'];
      const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

      this.log('Detected simple approval - returning brief acknowledgment');

      return {
        agent: this.name,
        message: randomAck,
        showToUser: true,
        metadata: {
          hasQuestion: false,
          isSimpleApproval: true
        }
      };
    }

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
        content: `You are a generative brainstorming partner helping expand the user's ideas.

User's message: "${userMessage}"${contextStr}${referenceStr}

${isCorrection ? `⚠️ CORRECTION DETECTED - User is correcting your previous misunderstanding!

MANDATORY BEHAVIOR FOR CORRECTIONS:
1. Start with: "You're right, I misunderstood. [correct understanding]"
2. Then optionally add generative suggestions based on the CORRECT understanding
3. Keep it natural and conversational

Example: "You're right, I misunderstood. The marketplace is for user-generated stories. That opens up exciting possibilities - you could have creator verification badges, content moderation tools, revenue sharing models, or featured creator showcases to highlight quality content."` : ''}

Current project state: ${JSON.stringify(projectState, null, 2)}

YOUR RESPONSE MUST:
1. BUILD ON their idea with concrete possibilities and implications
2. Suggest 3-5 specific features, options, or related concepts they could explore
3. Think ahead about UX, technical architecture, business models
4. Be generative and exciting - help them discover possibilities!

CRITICAL RULES:
✓ BE GENERATIVE - expand their idea with possibilities
✓ DON'T ask "To clarify:" - suggest options instead
✓ DON'T just reflect back - build on it!
✓ DON'T mention recording status (UI handles this)
✓ Keep energy high and conversational

${referenceStr ? '\nIf they mention uploaded files: Build on what the files show with related possibilities and implications.' : ''}`,
      },
    ];

    const response = await this.callClaude(messages, 600);

    // NEW: We now WANT generative suggestions, so remove forbidden phrases check
    // Only validate that corrections don't ask questions

    // Count question marks
    const questionCount = (response.match(/\?/g) || []).length;

    // CRITICAL: If this is a correction, ensure NO questions are asked
    const hasQuestionDuringCorrection = isCorrection && questionCount > 0;

    // Only retry if correction has questions (questions are now allowed otherwise)
    if (hasQuestionDuringCorrection) {
      this.log('Response violated rules - regenerating with stricter prompt');

      const retryMessages = [
        {
          role: 'user',
          content: `CRITICAL: Your previous response violated the rules.

User said: "${userMessage}"

⚠️ USER IS CORRECTING YOU - THIS IS A CORRECTION!

YOU MUST:
1. Start with "You're right, I misunderstood."
2. Restate what they ACTUALLY said in your own words
3. END WITH A PERIOD (.) - ABSOLUTELY NO QUESTION MARKS (?)
4. Optionally add generative suggestions based on the CORRECT understanding

Example: "You're right, I misunderstood. The Create Your Own Story mode is a completely separate feature from Canon and Divergent modes, specifically for users to create their own interactive stories from scratch."

DO NOT ASK ANY QUESTIONS during corrections. Just acknowledge and restate correctly.`,
        },
      ];

      const retryResponse = await this.callClaude(retryMessages, 400);

      return {
        agent: this.name,
        message: retryResponse.trim(),
        showToUser: true,
        metadata: {
          wasRetried: true,
          originalViolation: 'question during correction',
        },
      };
    }

    return {
      agent: this.name,
      message: response.trim(),
      showToUser: true,
      metadata: {
        isCorrection,
        hasQuestion: questionCount > 0,
        isGenerative: true,
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

    // NEW: Filter gaps for agent bubble - only show critical gaps
    const criticalGaps = gaps.gaps?.filter((g: any) => g.importance === 'critical') || [];

    // Format questions for agent bubble
    const agentQuestions = criticalGaps.map((gap: any) => ({
      question: gap.question,
      importance: gap.importance,
      category: gap.category,
      showInBubble: true
    }));

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
        agentQuestions, // NEW: Questions for bubble display
        showAgentBubble: agentQuestions.length > 0, // NEW: Flag to show bubble
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
