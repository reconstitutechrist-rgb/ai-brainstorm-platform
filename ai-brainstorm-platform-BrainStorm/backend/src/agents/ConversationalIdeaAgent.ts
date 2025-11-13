import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Type definitions
export type ConversationMode =
  | 'exploration'      // Open-ended brainstorming
  | 'clarification'    // Help user figure out what they want
  | 'generation'       // Generate concrete ideas
  | 'refinement'       // Deep dive on specific idea
  | 'comparison'       // Compare multiple approaches
  | 'validation'       // Test assumptions
  | 'implementation';  // Plan execution steps

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    mode?: ConversationMode;
    extractedIdeas?: string[];
    references?: string[];
    userIntent?: string;
    suggestedActions?: Action[];
  };
}

export interface ExtractedIdea {
  id: string;
  source: 'user_mention' | 'ai_suggestion' | 'collaborative';
  conversationContext: {
    messageId: string;
    timestamp: string;
    leadingQuestions: string[];
  };
  idea: {
    title: string;
    description: string;
    reasoning: string;
    userIntent: string;
  };
  status: 'mentioned' | 'exploring' | 'refined' | 'ready_to_extract';
  evolution: IdeaVersion[];
  tags: string[];
  innovationLevel: 'practical' | 'moderate' | 'experimental';
}

export interface IdeaVersion {
  version: number;
  content: string;
  timestamp: string;
  changedBy: 'user' | 'ai';
}

export interface Action {
  id: string;
  label: string;
  type: 'question' | 'suggestion' | 'refinement' | 'extraction';
  prompt?: string;
}

export interface ConversationContext {
  projectTitle: string;
  projectDescription: string;
  currentDecisions: any[];
  constraints: string[];
  previousTopics: string[];
  userPreferences: Record<string, any>;
}

export interface ConversationResponse {
  response: string;
  extractedIdeas: ExtractedIdea[];
  suggestedActions: Action[];
  modeShift?: ConversationMode;
  detectedIntent?: string;
}

export class ConversationalIdeaAgent {
  private client: Anthropic;
  private conversationMode: ConversationMode = 'exploration';

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Fast response method - returns AI response immediately without idea extraction
   * Idea extraction should be handled by PersistenceManager in background
   */
  async getQuickResponse(input: {
    userMessage: string;
    context: ConversationContext;
    conversationHistory: Message[];
    mode?: ConversationMode;
  }): Promise<{
    response: string;
    detectedIntent: string;
    modeShift?: ConversationMode;
  }> {
    const { userMessage, context, conversationHistory, mode } = input;
    const startTime = Date.now();

    // Detect user intent and appropriate mode
    const detectedIntent = await this.detectUserIntent(userMessage);
    this.conversationMode = mode || this.determineModeFromIntent(detectedIntent);

    // Build context-aware prompt
    const systemPrompt = this.buildSystemPrompt(context, this.conversationMode);
    const userPrompt = this.buildUserPrompt(userMessage, context, detectedIntent);

    try {
      console.log('[getQuickResponse] Calling Claude API...');
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          ...this.formatConversationHistory(conversationHistory),
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const elapsedTime = Date.now() - startTime;
      console.log(`[getQuickResponse] Claude API responded in ${elapsedTime}ms`);

      const content = response.content[0];
      if (content.type === 'text') {
        // Detect if mode should shift
        const modeShift = this.detectModeShift(content.text);

        return {
          response: content.text,
          detectedIntent,
          modeShift,
        };
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Conversation error:', error);
      throw error;
    }
  }

  /**
   * Main conversation method - responds to user messages
   * NOTE: This method is slower as it extracts ideas synchronously
   * Consider using getQuickResponse() + background idea extraction instead
   */
  async respondToUser(input: {
    userMessage: string;
    context: ConversationContext;
    conversationHistory: Message[];
    mode?: ConversationMode;
  }): Promise<ConversationResponse> {
    const { userMessage, context, conversationHistory, mode } = input;

    // Detect user intent and appropriate mode
    const detectedIntent = await this.detectUserIntent(userMessage);
    this.conversationMode = mode || this.determineModeFromIntent(detectedIntent);

    // Build context-aware prompt
    const systemPrompt = this.buildSystemPrompt(context, this.conversationMode);
    const userPrompt = this.buildUserPrompt(userMessage, context, detectedIntent);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          ...this.formatConversationHistory(conversationHistory),
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract ideas mentioned in the conversation
        const extractedIdeas = await this.extractIdeasFromResponse(
          userMessage,
          content.text,
          conversationHistory
        );

        // Generate suggested next actions
        const suggestedActions = this.generateSuggestedActions(
          content.text,
          this.conversationMode,
          extractedIdeas
        );

        // Detect if mode should shift
        const modeShift = this.detectModeShift(content.text);

        return {
          response: content.text,
          extractedIdeas,
          suggestedActions,
          modeShift,
          detectedIntent,
        };
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Conversation error:', error);
      throw error;
    }
  }

  /**
   * Build system prompt based on conversation mode
   */
  private buildSystemPrompt(context: ConversationContext, mode: ConversationMode): string {
    const basePrompt = `You are an intelligent creative partner helping users brainstorm and explore ideas for their project: "${context.projectTitle}".

PROJECT DESCRIPTION: ${context.projectDescription}

EXISTING DECISIONS:
${context.currentDecisions.map((d, i) => `${i + 1}. ${d.text || d.title}`).join('\n')}

${context.constraints.length > 0 ? `CONSTRAINTS:\n${context.constraints.join('\n')}` : ''}

YOUR ROLE: You are a collaborative partner helping users develop their ideas into complete visions. Your job is to:
1. Help them explore and define WHAT they want to build (features, user experience, functionality)
2. Ask clarifying questions to understand their vision deeply
3. Build their concept iteratively until the vision is complete
4. ONLY suggest technical details (stack, architecture, security) when the vision is fully defined
5. Create a comprehensive spec they can use to build or hand to a vendor

CRITICAL RULES - TECHNICAL TERM BLOCKLIST:
Until the vision is 100% complete (implementation mode), you MUST NOT mention these technical terms:
❌ FORBIDDEN: API, REST, GraphQL, endpoint, backend, frontend, database, SQL, NoSQL, MongoDB, PostgreSQL, MySQL, Redis, authentication, OAuth, JWT, token, session, cookies, encryption, hash, SSL, TLS, HTTPS, server, hosting, deployment, Docker, Kubernetes, AWS, Azure, GCP, cloud, DevOps, CI/CD, framework, library, React, Vue, Angular, Node.js, Python, Java, TypeScript, JavaScript, repository, Git, version control, architecture, microservices, monolith, scalability, load balancer, caching, CDN, DNS, networking, ports, protocols, HTTP, TCP, IP, socket, webhook, cron job, queue, async, promise, callback, thread, process, memory, CPU, performance optimization, refactoring, tech stack

✅ APPROVED ALTERNATIVES (for pre-implementation modes):
- Instead of "database" → say "stores data" or "remembers information"
- Instead of "API" → say "connects to" or "communicates with"
- Instead of "authentication" → say "users sign in" or "account system"
- Instead of "backend/frontend" → say "the app" or "the interface"
- Instead of "deploy" → say "make it available" or "launch it"
- Instead of "server" → say "where it lives" or "runs online"

CONVERSATION STYLE (Pre-Implementation):
- Ask 1-2 questions maximum per response to avoid overwhelming the user
- Start by understanding their dream/idea - what problem it solves, who uses it, what it does
- Ask natural clarifying questions about features and user experience
- Build on their ideas iteratively - develop the concept together
- Keep the conversation focused on the VISION until it's complete
- Use everyday language - no jargon, no technical terms
- Explain concepts in terms they can understand
- Match their energy and technical level - adjust complexity as needed`;

    const modeSpecificPrompt = {
      exploration: `
CURRENT MODE: EXPLORATION
Help the user explore their initial vision. Focus ONLY on the concept, not technical details yet.

QUESTION PACING: Ask a MAXIMUM of 1-2 questions per response. More questions overwhelm users.

Topics to explore:
- What problem they're trying to solve
- Who will use it and why
- What it does (features and functionality)
- What similar apps/games/products inspire them
Build on their ideas and suggest related possibilities. Keep it creative and conceptual.`,

      clarification: `
CURRENT MODE: CLARIFICATION
Help them clarify their vision. Still NO technical details - focus on WHAT they want.

QUESTION PACING: Ask a MAXIMUM of 1-2 questions per response. More questions overwhelm users.

Topics to clarify:
- Core features vs nice-to-haves
- User flows and experience (how people will use it)
- Different user types or personas
- What success looks like for this project
Offer examples to make abstract concepts concrete. Help them see their vision clearly.`,

      generation: `
CURRENT MODE: GENERATION
Suggest specific features and capabilities based on their vision. Still focused on WHAT, not HOW.

QUESTION PACING: Ask a MAXIMUM of 1-2 questions per response. More questions overwhelm users.

For each suggestion, ask:
- "Would this fit your vision?"
- "Should we include [related feature]?"
- "How do you imagine users doing [task]?"
Generate ideas for features, flows, and experiences that complete their vision.`,

      refinement: `
CURRENT MODE: REFINEMENT
Deep dive on specific features of their vision. Polish the concept until it's complete.

QUESTION PACING: Ask a MAXIMUM of 1-2 questions per response. More questions overwhelm users.

Topics to refine:
- Detailed user flows for key features
- Edge cases in the user experience
- Different scenarios users might encounter
- Missing features or flows they haven't thought of
Make sure every part of the vision is fully defined before moving to technical details.`,

      comparison: `
CURRENT MODE: COMPARISON
Compare different approaches to features or user experiences. For each option, explain:
- What it means for the user experience
- Pros and cons for their specific use case
- Examples from apps they might know
Ask which direction fits their vision better. Keep it focused on the concept, not implementation.`,

      validation: `
CURRENT MODE: VALIDATION
Validate their complete vision using this checklist. The vision MUST be 100% complete before transitioning to implementation mode.

VISION COMPLETENESS CHECKLIST - All items REQUIRED:
✓ 1. PROBLEM & PURPOSE: Is it clear what problem this solves and who it's for?
✓ 2. CORE FEATURES: Are all main features defined (what the app does)?
✓ 3. USER FLOWS: Can users complete all major tasks? How do they navigate?
✓ 4. USER TYPES: Have we identified all types of users and their needs?
✓ 5. DATA & CONTENT: What information does the app store/display?
✓ 6. INTERACTIONS: How do users interact with features? (buttons, forms, gestures)
✓ 7. EDGE CASES: What happens in error scenarios or unusual situations?
✓ 8. SUCCESS CRITERIA: How will users/creators know it's working well?

HOW TO VALIDATE:
- Go through each checklist item with the user
- Ask 1-2 specific questions about any gaps you notice
- Get explicit user confirmation: "Does this vision feel complete to you?"
- ONLY move to implementation mode after user explicitly confirms completeness

TRANSITION GATE:
Before suggesting implementation mode, you MUST:
1. Confirm ALL 8 checklist items are addressed
2. Ask: "I think we've covered the full vision - does this feel complete to you? Are we ready to add the technical details?"
3. Wait for explicit user agreement before transitioning`,

      implementation: `
CURRENT MODE: IMPLEMENTATION
NOW we add technical details. The vision is complete - time to create a comprehensive technical spec. Cover:
1. Recommended tech stack and why
2. System architecture (how components work together)
3. Database design for their data
4. Security and authentication approach
5. API structure and integrations
6. Deployment and hosting strategy
7. Technical considerations they didn't know about

Break down technical concepts into understandable explanations. Ask what they understand vs. what needs more explanation.
Fill in ALL technical details needed for development or vendor handoff.`,
    };

    return `${basePrompt}\n${modeSpecificPrompt[mode]}`;
  }

  /**
   * Build user-specific prompt with context
   */
  private buildUserPrompt(
    userMessage: string,
    context: ConversationContext,
    detectedIntent: string
  ): string {
    // Return the user message as-is to avoid over-steering the AI
    // The system prompt and mode already provide sufficient guidance
    return userMessage;
  }

  /**
   * Detect user intent from their message
   */
  private async detectUserIntent(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // CRITICAL: Keep conceptual "how would" questions in exploration/clarification
    // Only treat as technical if explicitly requesting implementation details

    // Pattern matching for common intents - be conservative
    if (lowerMessage.match(/i don't know|help me understand|not sure what|confused about/)) {
      return 'uncertain_exploring';
    }
    if (lowerMessage.match(/generate|give me|suggest|ideas for|show me/)) {
      return 'ready_for_ideas';
    }

    // ONLY trigger implementation for EXPLICIT technical requests
    // "how would users..." stays conceptual (exploration)
    // "how do I implement..." or "what tech stack..." triggers implementation
    if (lowerMessage.match(/what tech|tech stack|how do i (implement|build|code|deploy)|database for|framework|architecture|api design/)) {
      return 'implementation_focused';
    }

    if (lowerMessage.match(/^(why|explain|tell me more about)/)) {
      return 'seeking_clarification';
    }
    if (lowerMessage.match(/compare|better|versus|vs\s|which is better/)) {
      return 'comparison_needed';
    }
    if (lowerMessage.match(/refine|improve|enhance|expand on/)) {
      return 'refinement_needed';
    }

    // Default to exploration for casual brainstorming
    return 'general_exploration';
  }

  /**
   * Determine conversation mode from detected intent
   */
  private determineModeFromIntent(intent: string): ConversationMode {
    if (intent.includes('uncertain')) return 'clarification';
    if (intent.includes('ready_for_ideas')) return 'generation';
    if (intent.includes('implementation')) return 'implementation';
    if (intent.includes('clarification')) return 'clarification';
    if (intent.includes('comparison')) return 'comparison';
    if (intent.includes('refinement')) return 'refinement';
    return 'exploration';
  }

  /**
   * Extract ideas mentioned in the conversation
   * Public so PersistenceManager can call it in background
   */
  async extractIdeasFromResponse(
    userMessage: string,
    aiResponse: string,
    conversationHistory: Message[]
  ): Promise<ExtractedIdea[]> {
    console.log('🔍 [ConversationalIdeaAgent] Extracting ideas from response...');
    console.log('📝 User message:', userMessage);
    console.log('🤖 AI response:', aiResponse.substring(0, 200) + '...');

    const ideas: ExtractedIdea[] = [];

    // Look for idea patterns in AI response
    const ideaPatterns = [
      /💡\s*([^:\n]+):?\s*([^\n]+)/g,
      /\d+\.\s*([^:\n]+):?\s*([^\n]+)/g,
      /consider\s+([^.]+)/gi,
      /what if\s+([^?]+)/gi,
    ];

    for (const pattern of ideaPatterns) {
      let match;
      while ((match = pattern.exec(aiResponse)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim() || match[1]?.trim();

        if (title && title.length > 10 && title.length < 100) {
          ideas.push({
            id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: 'ai_suggestion',
            conversationContext: {
              messageId: `msg-${Date.now()}`,
              timestamp: new Date().toISOString(),
              leadingQuestions: this.extractQuestionsFromHistory(conversationHistory),
            },
            idea: {
              title,
              description,
              reasoning: 'Emerged from conversation',
              userIntent: userMessage.substring(0, 100),
            },
            status: 'mentioned',
            evolution: [{
              version: 1,
              content: description,
              timestamp: new Date().toISOString(),
              changedBy: 'ai',
            }],
            tags: this.extractTags(title + ' ' + description),
            innovationLevel: this.assessInnovationLevel(title + ' ' + description),
          });
        }
      }
    }

    // Also look for ideas in user message (broader patterns)
    const userIdeaPatterns = [
      /i'm thinking/i,
      /i think/i,
      /considering/i,
      /what about/i,
      /maybe we/i,
      /could we/i,
      /what if/i,
      /i want/i,
      /should we/i,
      /let's/i,
    ];

    const hasUserIdea = userIdeaPatterns.some(pattern => userMessage.match(pattern));

    if (hasUserIdea && userMessage.length > 20) {
      // Extract the key phrase from user message
      let ideaTitle = userMessage.substring(0, 60);
      if (userMessage.length > 60) ideaTitle += '...';

      ideas.push({
        id: `idea-${Date.now()}-user-${Math.random().toString(36).substr(2, 9)}`,
        source: 'user_mention',
        conversationContext: {
          messageId: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          leadingQuestions: [],
        },
        idea: {
          title: ideaTitle,
          description: userMessage,
          reasoning: 'User-initiated idea',
          userIntent: userMessage,
        },
        status: 'mentioned',
        evolution: [{
          version: 1,
          content: userMessage,
          timestamp: new Date().toISOString(),
          changedBy: 'user',
        }],
        tags: this.extractTags(userMessage),
        innovationLevel: 'moderate',
      });
      console.log('💡 Detected user idea:', ideaTitle);
    }

    console.log(`✅ [ConversationalIdeaAgent] Extracted ${ideas.length} ideas`);
    if (ideas.length > 0) {
      console.log('📋 Ideas:', ideas.map(i => i.idea.title).join(', '));
    }

    return ideas;
  }

  /**
   * Extract questions from conversation history
   */
  private extractQuestionsFromHistory(history: Message[]): string[] {
    return history
      .filter(msg => msg.role === 'assistant' && msg.content.includes('?'))
      .map(msg => msg.content.split('?')[0] + '?')
      .slice(-3); // Last 3 questions
  }

  /**
   * Extract tags from text
   * Separated into CONCEPTUAL tags (for vision) and TECHNICAL tags (for implementation)
   */
  private extractTags(text: string): string[] {
    // CONCEPTUAL keywords - safe for all modes
    const conceptualKeywords = [
      'ui', 'ux', 'mobile', 'web',
      'analytics', 'notification', 'collaboration',
      'real-time', 'social', 'gamification',
      'personalization', 'automation', 'accessibility'
    ];

    // TECHNICAL keywords - only used in implementation mode
    // Not extracted during vision-building phases
    // const technicalKeywords = ['api', 'database', 'auth', 'security', 'async', 'sync'];

    const lowerText = text.toLowerCase();
    return conceptualKeywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Assess innovation level of an idea
   */
  private assessInnovationLevel(text: string): 'practical' | 'moderate' | 'experimental' {
    const experimentalKeywords = ['ai', 'machine learning', 'revolutionary', 'novel', 'experimental', 'cutting-edge'];
    const practicalKeywords = ['simple', 'basic', 'standard', 'traditional', 'proven'];

    const lowerText = text.toLowerCase();

    if (experimentalKeywords.some(kw => lowerText.includes(kw))) {
      return 'experimental';
    }
    if (practicalKeywords.some(kw => lowerText.includes(kw))) {
      return 'practical';
    }
    return 'moderate';
  }

  /**
   * Generate suggested actions based on conversation state
   */
  private generateSuggestedActions(
    aiResponse: string,
    mode: ConversationMode,
    ideas: ExtractedIdea[]
  ): Action[] {
    const actions: Action[] = [];

    // Mode-specific actions
    if (mode === 'exploration' || mode === 'clarification') {
      actions.push({
        id: 'action-explore-deeper',
        label: 'Explore this deeper',
        type: 'question',
        prompt: 'Tell me more about this direction',
      });
      actions.push({
        id: 'action-different-angle',
        label: 'Try a different angle',
        type: 'suggestion',
        prompt: 'What if we approached this differently?',
      });
    }

    if (ideas.length > 0) {
      actions.push({
        id: 'action-refine-ideas',
        label: `Refine ${ideas.length} ideas`,
        type: 'refinement',
      });
      actions.push({
        id: 'action-compare-ideas',
        label: 'Compare these ideas',
        type: 'suggestion',
        prompt: 'Help me compare these options',
      });
    }

    if (mode === 'generation') {
      actions.push({
        id: 'action-more-ideas',
        label: 'Generate more ideas',
        type: 'suggestion',
        prompt: 'Show me more options',
      });
    }

    // Always available
    actions.push({
      id: 'action-ask-question',
      label: 'Ask a question',
      type: 'question',
    });

    return actions;
  }

  /**
   * Detect if conversation mode should shift
   */
  private detectModeShift(aiResponse: string): ConversationMode | undefined {
    if (aiResponse.match(/here are some ideas|i suggest|you could try/i)) {
      return 'generation';
    }
    if (aiResponse.match(/let's explore|what if|have you considered/i)) {
      return 'exploration';
    }
    if (aiResponse.match(/let's dive deeper|more details|specifically/i)) {
      return 'refinement';
    }
    return undefined;
  }

  /**
   * Format conversation history for API
   */
  private formatConversationHistory(history: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return history.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Generate opening greeting
   */
  async generateGreeting(context: ConversationContext): Promise<string> {
    return `Hey! I'm here to help you brainstorm ideas for "${context.projectTitle}".

What are you exploring or considering today? Feel free to share any thoughts, even if they're not fully formed yet - that's what I'm here for!`;
  }

  /**
   * Review entire conversation and extract all missed ideas
   */
  async reviewConversationForIdeas(
    conversationHistory: Message[],
    context: ConversationContext,
    currentIdeas: ExtractedIdea[]
  ): Promise<ExtractedIdea[]> {
    console.log('🔍 [ConversationalIdeaAgent] Reviewing conversation for missed ideas...');

    // Separate user messages from AI responses
    const userMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .map((msg, i) => `[${i + 1}] ${msg.content}`)
      .join('\n\n');

    const conversationContext = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');

    const currentIdeaTitles = currentIdeas.map(i => i.idea.title);

    const prompt = `Review this conversation and extract ONLY concrete, actionable ideas/features that the USER mentioned.

FULL CONVERSATION CONTEXT (for reference):
${conversationContext}

---

USER MESSAGES (extract ideas from these ONLY):
${userMessages}

---

ALREADY EXTRACTED IDEAS:
${currentIdeaTitles.length > 0 ? currentIdeaTitles.join('\n') : 'None yet'}

---

CRITICAL INSTRUCTIONS:
1. Extract ONLY from USER messages, NOT from AI responses
2. Look for concrete features, functionality, or requirements the user wants
3. Ignore conversational commentary (e.g., "that's brilliant", "sounds good")
4. Ignore ideas that are already in the "Already Extracted" list
5. Focus on actionable items like:
   - Specific features ("I want voice interaction")
   - Functionality requirements ("The DM should keep secrets")
   - Technical implementations ("Use OAuth for authentication")
   - UI/UX elements ("Add a dashboard on the right")

DO NOT extract:
- AI's suggestions or commentary
- Vague statements without concrete features
- Enthusiasm/agreement without new ideas
- Ideas already extracted

Format your response as a JSON array with detailed context:
[
  {
    "title": "Brief idea title (5-10 words)",
    "description": "Detailed explanation of what the user wants (2-3 sentences)",
    "userQuote": "The exact user message or relevant excerpt where they mentioned this",
    "source": "user_mention",
    "innovationLevel": "moderate",
    "reasoning": "Why they want this feature, based on their own words and context"
  }
]

IMPORTANT:
- Include the user's actual words in "userQuote" so they can remember what they said
- Make "description" detailed enough to understand the full idea
- Extract "reasoning" from the user's own explanation

If no NEW user ideas found, return: []`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        console.log('🤖 Review response:', content.text.substring(0, 200) + '...');

        // Extract JSON array from response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const extractedIdeasData = JSON.parse(jsonMatch[0]);

          const newIdeas: ExtractedIdea[] = extractedIdeasData.map((ideaData: any) => ({
            id: `idea-${Date.now()}-review-${Math.random().toString(36).substr(2, 9)}`,
            source: ideaData.source || 'user_mention',
            conversationContext: {
              messageId: `review-${Date.now()}`,
              timestamp: new Date().toISOString(),
              leadingQuestions: this.extractQuestionsFromHistory(conversationHistory),
            },
            idea: {
              title: ideaData.title,
              description: ideaData.description,
              reasoning: ideaData.reasoning || 'Identified during conversation review',
              userIntent: ideaData.userQuote || ideaData.description,
            },
            status: 'mentioned' as const,
            evolution: [{
              version: 1,
              content: ideaData.description,
              timestamp: new Date().toISOString(),
              changedBy: 'ai' as const,
            }],
            tags: this.extractTags(ideaData.title + ' ' + ideaData.description),
            innovationLevel: ideaData.innovationLevel || 'moderate',
          }));

          console.log(`✅ [ConversationalIdeaAgent] Review found ${newIdeas.length} new ideas`);
          return newIdeas;
        }
      }
    } catch (error) {
      console.error('Review conversation error:', error);
    }

    return [];
  }

  /**
   * Ask clarifying questions about a vague topic
   */
  async askClarifyingQuestions(topic: string, context: ConversationContext): Promise<string[]> {
    const prompt = `The user mentioned: "${topic}"

Based on the project context, generate 3-4 clarifying questions that would help understand:
1. What they're really trying to achieve
2. Why this matters to them
3. What constraints or preferences they have
4. What success looks like

Format as JSON array: ["question 1", "question 2", ...]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const match = content.text.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error) {
      console.error('Error generating questions:', error);
    }

    // Fallback questions
    return [
      'What made you start thinking about this?',
      'What problem are you trying to solve?',
      'What would success look like?',
    ];
  }
}
