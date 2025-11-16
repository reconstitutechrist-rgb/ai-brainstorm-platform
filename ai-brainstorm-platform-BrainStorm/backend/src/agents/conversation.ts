import { BaseAgent } from './base';
import { ConversationAgentResponse, ConversationMetadata } from '../types';
import { AI_MODELS } from '../config/aiModels';

/**
 * Input analysis interface for adaptive responses
 */
interface InputAnalysis {
  detailLevel: 'high' | 'medium' | 'low';
  wordCount: number;
  specifics: {
    hasTechStack: boolean;
    hasMetrics: boolean;
    hasRequirements: boolean;
    hasConstraints: boolean;
  };
  mentionedItems: string[];
}

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
 * - ADAPTIVE: Matches response depth to user's input detail level
 *
 * This creates natural conversation flow where the agent demonstrates understanding
 * AND asks for clarification in a single response.
 */
export class ConversationAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Conversation Agent - Adaptive Brainstorming Partner

YOUR PURPOSE:
You are a generative brainstorming partner who BUILDS ON user ideas by suggesting possibilities, implications, and related concepts. Your job is to REDUCE COGNITIVE LOAD by offering concrete options for the user to react to (accept/reject/park/explore).

═══ ADAPT TO USER'S DETAIL LEVEL ═══

IF user provides LOTS of detail (tech stack, specific features, metrics, requirements):
  ✓ ACKNOWLEDGE what they mentioned explicitly
  ✓ BUILD ON their specifics (reference their tech choices, features)
  ✓ Go DEEP, not broad (2-4 targeted suggestions about architecture, tradeoffs, edge cases)
  ✓ DON'T suggest basics they already covered
  ✓ Reference specific items they mentioned

  Example:
  User: "Task management app with real-time collab, video calls, Slack integration. Next.js/Node/PostgreSQL. Target: 10-50 person startups."

  GOOD Response:
  "Real-time collab + video is ambitious but addresses real pain points for remote teams! Since you chose Next.js/Node/PostgreSQL:

   • **Real-time sync** - Your biggest complexity. WebSockets (Socket.io) vs managed service (Pusher/Ably)? How will you handle conflict resolution when multiple users edit the same task?

   • **Video calls** - Build WebRTC yourself (3-6 months, full control) or integrate Daily.co (~1 week, limited customization)? What's your timeline?

   • **Slack integration** - Just push notifications, or two-way sync where tasks created in Slack appear in your app? Two-way requires webhooks + real-time updates.

   One gap I notice: **Permissions/roles** for 10-50 person teams. Admin/member roles? Project-level permissions?"

  BAD Response:
  "Great idea! Here are 5 suggestions:
   1. Define your MVP scope
   2. Research competitors
   3. Choose your tech stack  ← THEY ALREADY CHOSE THIS!
   4. Create wireframes
   5. Set timeline"

IF user provides MEDIUM detail (concept + some context):
  ✓ Reflect understanding
  ✓ Ask 2-3 questions about GAPS in their thinking
  ✓ Offer 3-5 RELEVANT suggestions based on what they shared
  ✓ Help them move from concept to concrete next steps

  Example:
  User: "A productivity app for students to manage assignments and study time"

  GOOD Response:
  "Student productivity app for assignments + study time - makes sense!

   To help develop this:
   • **Who specifically?** High school? College? Grad students? (Different needs)
   • **Core problem?** Forgetting deadlines? Procrastination? Time management? All of the above?
   • **Differentiation?** What makes this better than Google Calendar + Notion?

   Some directions to consider:
   1. Deadline tracking with smart reminders (exam in 2 weeks → daily study plan)
   2. Focus timer (Pomodoro) integrated with assignment tracker
   3. Study group coordination (share schedules, find study partners)
   4. Grade predictor (track assignments → estimate final grade)
   5. AI study planner (breaks large projects into daily tasks)

   Which resonates most with the problem you're solving?"

IF user provides LITTLE detail (vague idea, just starting):
  ✓ DON'T overwhelm with 5 suggestions when they haven't defined basics
  ✓ Ask 1-2 FOUNDATIONAL questions (who, what problem, why)
  ✓ Help them ARTICULATE their concept before tactical suggestions
  ✓ Be patient - they're still forming their thoughts

  Example:
  User: "I want to build a productivity app"

  GOOD Response:
  "Productivity apps can take many forms! Let's start with the foundation:

   • **Who is it for?** Individuals? Teams? Students? Professionals?
   • **What problem does it solve?** Time tracking? Focus/distraction blocking? Task management? Note-taking?

   Knowing this will help us figure out what features matter most.

   Do you have a specific productivity pain point in mind?"

  BAD Response:
  "Great! Here are 5 suggestions:
   1. Implement Pomodoro timer
   2. Add calendar integration
   3. Build task lists with priorities
   4. Create analytics dashboard
   5. Add team collaboration"
  ← TOO SPECIFIC when user hasn't defined basics!

═══ CORE BEHAVIOR ═══

✓ MATCH their detail level (detailed input = detailed response)
✓ REFERENCE specifics they mentioned (tech, features, metrics, constraints)
✓ BE GENERATIVE - suggest possibilities, don't just ask questions
✓ THINK AHEAD - UX, architecture, business implications
✓ Quality over quantity - 2 deep suggestions beat 5 generic ones
✓ Build on incomplete ideas - help fill in details

DON'T ASK "what do you want?" - SUGGEST "you could have X, Y, or Z"

The user will naturally react to your suggestions:
• Accept: "Yes", "Love it", "Let's do that"
• Reject: "No", "Not that", "Skip that"
• Park: "Let's park that for later", "I'll think about it"
• Explore: "Tell me more about X", "What about Y?"

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
❌ NEVER suggest things they already decided (tech stack, features)
❌ NEVER give verbose confirmations for simple "yes" responses
❌ NEVER mention recording status ("✅ Recorded as...") - UI handles this
❌ NEVER give generic advice when they've provided specific context

Be adaptive, generative, and help users discover possibilities they hadn't considered.`;

    super('ConversationAgent', systemPrompt);
  }

  /**
   * Analyze user input to determine detail level and specifics mentioned
   * This runs locally (~5ms) before calling Claude
   */
  private analyzeUserInput(message: string): InputAnalysis {
    const wordCount = message.split(/\s+/).length;

    // Detect tech stack mentions
    const techStackRegex = /\b(react|vue|angular|svelte|next\.?js|nuxt|remix|gatsby|node\.?js|express|fastify|nest\.?js|python|django|flask|fastapi|ruby|rails|php|laravel|java|spring|\.net|c#|go|golang|rust|postgres|postgresql|mysql|mariadb|mongodb|redis|elasticsearch|graphql|rest|api|typescript|javascript|html|css|tailwind|bootstrap|sass|webpack|vite|docker|kubernetes|aws|azure|gcp|vercel|netlify|heroku)\b/i;

    // Detect metrics/numbers
    const metricsRegex = /\b(\d+\s*(users?|customers?|people|person|months?|weeks?|days?|years?|hours?|minutes?|startups?|companies|businesses)|\$\d+|budget|timeline|deadline|target|goal)\b/i;

    // Detect requirements
    const requirementsRegex = /\b(should have|needs?|requires?|must have|will have|features?:|requirements?:|includes?|with|has|contain)\b/i;

    // Detect constraints
    const constraintsRegex = /\b(budget|timeline|deadline|constraint|limitation|must be|can't|won't|limited|within|by|before)\b/i;

    const hasTechStack = techStackRegex.test(message);
    const hasMetrics = metricsRegex.test(message);
    const hasRequirements = requirementsRegex.test(message);
    const hasConstraints = constraintsRegex.test(message);

    // Extract mentioned tech items for reference
    const mentionedItems: string[] = [];
    const techMatches = message.match(new RegExp(techStackRegex, 'gi'));
    if (techMatches) {
      mentionedItems.push(...techMatches.map(m => m.toLowerCase()));
    }

    // Determine detail level
    let detailLevel: 'high' | 'medium' | 'low';
    const specificCount = [hasTechStack, hasMetrics, hasRequirements, hasConstraints].filter(Boolean).length;

    if (wordCount > 50 && specificCount >= 2) {
      detailLevel = 'high';
    } else if (wordCount > 20 || specificCount >= 1) {
      detailLevel = 'medium';
    } else {
      detailLevel = 'low';
    }

    this.log(`Input analysis: ${detailLevel} detail, ${wordCount} words, ${specificCount} specifics, mentioned: ${mentionedItems.join(', ')}`);

    return {
      detailLevel,
      wordCount,
      specifics: {
        hasTechStack,
        hasMetrics,
        hasRequirements,
        hasConstraints
      },
      mentionedItems
    };
  }

  /**
   * Build context-aware user prompt with explicit guidance based on input analysis
   * ⚡ OPTIMIZED FOR SPEED: Minimal context for fast responses (2-3s target)
   */
  private buildUserPrompt(
    userMessage: string,
    analysis: InputAnalysis,
    conversationHistory: any[],
    projectReferences: any[],
    projectState: any,
    isCorrection: boolean
  ): string {
    let prompt = `User's message: "${userMessage}"\n\n`;

    // Add adaptive context hint based on detail level
    if (analysis.detailLevel === 'high') {
      prompt += `[User provided HIGH detail - they mentioned: ${analysis.mentionedItems.join(', ')}]\n`;
      prompt += `[BUILD ON their specifics with 2-4 deep, targeted suggestions. Reference what they said. Don't suggest basics they already covered.]\n\n`;
    } else if (analysis.detailLevel === 'medium') {
      prompt += `[User provided MEDIUM detail]\n`;
      prompt += `[Reflect understanding, ask 2-3 clarifying questions about gaps, offer 3-5 relevant suggestions based on what they shared.]\n\n`;
    } else {
      prompt += `[User provided LOW detail - they're just starting]\n`;
      prompt += `[Ask 1-2 foundational questions (who, what problem, why). Help them articulate their concept. Don't jump to tactical suggestions yet.]\n\n`;
    }

    // Add correction handling
    if (isCorrection) {
      prompt += `⚠️ CORRECTION DETECTED - User is correcting your previous misunderstanding!\n\n`;
      prompt += `MANDATORY BEHAVIOR FOR CORRECTIONS:\n`;
      prompt += `1. Start with: "You're right, I misunderstood. [correct understanding]"\n`;
      prompt += `2. Then optionally add generative suggestions based on the CORRECT understanding\n`;
      prompt += `3. Keep it natural and conversational\n\n`;
    }

    // ⚡ SPEED OPTIMIZATION: Only include last 2-3 messages for immediate context (not 5)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-3);
      prompt += `Recent conversation:\n`;
      recentMessages.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}\n`;
      });
      prompt += `\n`;
    }

    // ⚡ SPEED OPTIMIZATION: Skip references/project state for conversation speed
    // The PersistenceManager will use full context when recording to canvas
    // Conversation should be FAST - only use immediate chat context

    prompt += `Respond naturally based on the detail level above.`;

    return prompt;
  }

  /**
   * Main conversation method - reflects understanding and asks clarifying questions
   */
  async respond(userMessage: string, conversationHistory: any[], projectState: any, projectReferences: any[] = []): Promise<ConversationAgentResponse> {
    this.log('Processing conversation');

    // Detect simple approvals early and return brief acknowledgment
    const simpleApprovals = /^(yes|yeah|yep|yup|sure|ok|okay|right|correct|exactly|perfect|great|love it|sounds good|got it|that's right|i agree|nice|agreed|absolutely|definitely)([!.?]*)$/i;

    if (simpleApprovals.test(userMessage.trim().toLowerCase())) {
      // Return brief acknowledgment without calling Claude
      const acknowledgments = ['👍', 'Got it!', 'Great!', 'Perfect!', 'Nice!', 'Awesome!'];
      const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

      this.log('Detected simple approval - returning brief acknowledgment');

      return {
        agent: 'ConversationAgent',
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

    // ✨ NEW: Analyze input detail level
    const inputAnalysis = this.analyzeUserInput(userMessage);

    // ✨ NEW: Build context-aware prompt
    const userPrompt = this.buildUserPrompt(
      userMessage,
      inputAnalysis,
      conversationHistory || [],
      projectReferences || [],
      projectState,
      isCorrection
    );

    const messages = [
      {
        role: 'user',
        content: userPrompt
      },
    ];

    const response = await this.callClaude(messages, 600);

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
        agent: 'ConversationAgent',
        message: retryResponse.trim(),
        showToUser: true,
        metadata: {
          wasRetried: true,
          originalViolation: 'question during correction',
          // ✨ NEW: Include input analysis
          inputAnalysis: {
            detailLevel: inputAnalysis.detailLevel,
            wordCount: inputAnalysis.wordCount,
            specificsDetected: Object.values(inputAnalysis.specifics).filter(Boolean).length
          }
        },
      };
    }

    return {
      agent: 'ConversationAgent',
      message: response.trim(),
      showToUser: true,
      metadata: {
        isCorrection,
        hasQuestion: questionCount > 0,
        isGenerative: true,
        // ✨ NEW: Include input analysis metadata
        inputAnalysis: {
          detailLevel: inputAnalysis.detailLevel,
          wordCount: inputAnalysis.wordCount,
          specificsDetected: Object.values(inputAnalysis.specifics).filter(Boolean).length,
          mentionedTech: inputAnalysis.mentionedItems.length > 0 ? inputAnalysis.mentionedItems : undefined
        }
      },
    };
  }

  /**
   * Analyze for gaps (silent) - used by orchestrator for workflow decisions
   * Returns structured data without showing anything to user
   */
  async analyze(userMessage: string, projectState: any): Promise<ConversationAgentResponse> {
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

    // Use Claude Haiku for fast gap detection - this is a simple JSON analysis task
    const response = await this.callClaude(messages, 800, AI_MODELS.HAIKU);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const gaps = JSON.parse(cleanResponse);

    this.log(`Found ${gaps.criticalCount || 0} critical gaps, ${gaps.gaps?.length || 0} total gaps`);

    // Filter gaps for agent bubble - show both critical AND high priority gaps
    const bubbleGaps = gaps.gaps?.filter((g: any) =>
      g.importance === 'critical' || g.importance === 'high'
    ) || [];

    // Format questions for agent bubble with proper typing
    interface AgentQuestionItem {
      question: string;
      importance: string;
      category: string;
      showInBubble: boolean;
    }

    const agentQuestions: AgentQuestionItem[] = bubbleGaps.map((gap: any) => ({
      question: gap.question,
      importance: gap.importance,
      category: gap.category,
      showInBubble: true
    }));

    // FIX #2: Add comprehensive logging
    const highCount = gaps.gaps?.filter((g: any) => g.importance === 'high').length || 0;
    this.log(`Gap Analysis for Bubble: totalGaps=${gaps.gaps?.length || 0}, criticalCount=${gaps.criticalCount || 0}, highCount=${highCount}, bubbleGapsCount=${bubbleGaps.length}, questions=${agentQuestions.map((q: AgentQuestionItem) => `[${q.importance}] ${q.question.substring(0, 50)}...`).join('; ')}`);
    // Analysis is SILENT - only returns structured data for orchestrator
    return {
      agent: 'ConversationAgent',
      message: '', // Never create user messages during analysis
      showToUser: false,
      metadata: {
        ...gaps,
        hasGaps: gaps.criticalCount > 0 || gaps.gaps?.some((g: any) => g.importance === 'high'),
        hasCriticalGaps: gaps.criticalCount > 0,
        priority: gaps.criticalCount > 0 ? 'critical' : (gaps.gaps?.some((g: any) => g.importance === 'high') ? 'high' : 'low'),
        agentQuestions,
        showAgentBubble: agentQuestions.length > 0,
      },
    };
  }

  /**
   * Legacy compatibility - maps old "reflect" method to new "respond"
   */
  async reflect(userMessage: string, conversationHistory: any[], projectReferences: any[] = []): Promise<ConversationAgentResponse> {
    return this.respond(userMessage, conversationHistory, {}, projectReferences);
  }

  /**
   * Legacy compatibility - maps old "generateQuestion" to respond with question focus
   */
  async generateQuestion(gaps: any, conversationHistory: any[], consistencyConflicts: any = null): Promise<ConversationAgentResponse> {
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
      agent: 'ConversationAgent',
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
  async generateExplorationQuestion(context: any, conversationHistory: any[]): Promise<ConversationAgentResponse> {
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
      agent: 'ConversationAgent',
      message: response.trim(),
      showToUser: true,
      metadata: {
        isQuestion: true,
        questionType: 'exploration',
      },
    };
  }
}
