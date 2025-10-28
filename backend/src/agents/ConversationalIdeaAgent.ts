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

YOUR ROLE: You are a creative collaborator who helps users:
1. Expand on their ideas and build momentum
2. Explore different angles and possibilities
3. Connect ideas together in interesting ways
4. Turn vague thoughts into concrete concepts
5. Generate new ideas that complement theirs

CONVERSATION STYLE:
- Build on what the user says - expand their ideas rather than interrogate them
- Match the user's energy and style (casual, formal, excited, thoughtful)
- Contribute your own ideas and suggestions freely
- Reference and connect previous ideas from the conversation
- Keep things flowing naturally - avoid excessive questioning
- Only ask questions when you genuinely need clarification to help
- Default to being generative rather than interrogative`;

    const modeSpecificPrompt = {
      exploration: `
CURRENT MODE: EXPLORATION
Bounce ideas around freely. Build on their thoughts. Suggest interesting directions. Keep the creative energy flowing.`,

      clarification: `
CURRENT MODE: CLARIFICATION
The user needs help crystallizing their thoughts. Offer concrete examples and possibilities rather than asking lots of questions. Help them see what they might want.`,

      generation: `
CURRENT MODE: GENERATION
The user is ready for concrete ideas. Based on the conversation, suggest 3-5 specific, actionable ideas. Explain the reasoning behind each. Be direct and generative.`,

      refinement: `
CURRENT MODE: REFINEMENT
Deep dive on a specific idea. Suggest implementation details, improvements, and interesting angles. Think through edge cases together.`,

      comparison: `
CURRENT MODE: COMPARISON
Compare different approaches side-by-side. Highlight pros/cons, trade-offs, and recommendations based on their context.`,

      validation: `
CURRENT MODE: VALIDATION
Offer alternative perspectives and "what if" scenarios. Help stress-test ideas by suggesting potential issues and solutions.`,

      implementation: `
CURRENT MODE: IMPLEMENTATION
Create an action plan together. Break down the idea into concrete steps, identify dependencies, and suggest next actions.`,
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

    // Pattern matching for common intents - be less sensitive
    // Only trigger clarification when user explicitly asks for help understanding something
    if (lowerMessage.match(/i don't know|help me understand|not sure what|confused about/)) {
      return 'uncertain_exploring';
    }
    if (lowerMessage.match(/generate|give me|suggest|ideas for|show me/)) {
      return 'ready_for_ideas';
    }
    if (lowerMessage.match(/how would|how do|implement|build|create/)) {
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
   */
  private extractTags(text: string): string[] {
    const keywords = ['ai', 'ui', 'ux', 'performance', 'mobile', 'web', 'api',
                     'database', 'auth', 'security', 'analytics', 'notification',
                     'collaboration', 'real-time', 'async', 'sync'];

    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword));
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
