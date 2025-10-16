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
   * Main conversation method - responds to user messages
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

YOUR ROLE: You are not just generating ideas - you are having a conversation to help the user:
1. Clarify what they're really trying to achieve
2. Explore different angles they might not have considered
3. Challenge assumptions constructively
4. Help them discover what they actually want
5. Extract concrete, actionable ideas from the dialogue

CONVERSATION STYLE:
- Ask thoughtful questions to understand deeper motivations
- Be curious and empathetic
- Suggest ideas but also ask for the user's thoughts
- Reference previous points in the conversation
- Help organize vague thoughts into concrete ideas
- Acknowledge when the user is exploring vs. when they're ready to commit`;

    const modeSpecificPrompt = {
      exploration: `
CURRENT MODE: EXPLORATION
Focus on open-ended discovery. Ask broad questions. Help the user explore different angles. Don't rush to solutions.`,

      clarification: `
CURRENT MODE: CLARIFICATION
The user seems uncertain. Ask specific questions to help them articulate what they want. Offer examples to make abstract ideas concrete.`,

      generation: `
CURRENT MODE: GENERATION
The user is ready for concrete ideas. Based on the conversation, suggest 3-5 specific, actionable ideas. Explain the reasoning behind each.`,

      refinement: `
CURRENT MODE: REFINEMENT
Deep dive on a specific idea. Help the user think through implementation details, edge cases, and improvements.`,

      comparison: `
CURRENT MODE: COMPARISON
Help the user compare different approaches. Highlight pros/cons, trade-offs, and which might be better for their specific situation.`,

      validation: `
CURRENT MODE: VALIDATION
Challenge assumptions respectfully. Ask "what if" questions. Help the user stress-test their ideas.`,

      implementation: `
CURRENT MODE: IMPLEMENTATION
Help the user create an action plan. Break down the idea into concrete steps, identify dependencies, and suggest next actions.`,
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
    let prompt = userMessage;

    // Add context hints for the AI
    if (detectedIntent.includes('uncertain')) {
      prompt += `\n\n[User seems uncertain - ask clarifying questions]`;
    } else if (detectedIntent.includes('ready')) {
      prompt += `\n\n[User seems ready for concrete suggestions]`;
    } else if (detectedIntent.includes('exploring')) {
      prompt += `\n\n[User is in exploration mode - be open-ended]`;
    }

    return prompt;
  }

  /**
   * Detect user intent from their message
   */
  private async detectUserIntent(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Pattern matching for common intents
    if (lowerMessage.match(/what if|thinking about|considering|maybe|not sure/)) {
      return 'uncertain_exploring';
    }
    if (lowerMessage.match(/generate|give me|suggest|ideas for|show me/)) {
      return 'ready_for_ideas';
    }
    if (lowerMessage.match(/how would|how do|implement|build|create/)) {
      return 'implementation_focused';
    }
    if (lowerMessage.match(/why|explain|tell me more|what about/)) {
      return 'seeking_clarification';
    }
    if (lowerMessage.match(/compare|better|versus|vs|or/)) {
      return 'comparison_needed';
    }
    if (lowerMessage.match(/refine|improve|enhance|expand/)) {
      return 'refinement_needed';
    }

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
   */
  private async extractIdeasFromResponse(
    userMessage: string,
    aiResponse: string,
    conversationHistory: Message[]
  ): Promise<ExtractedIdea[]> {
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

    // Also look for ideas in user message
    if (userMessage.match(/i'm thinking|considering|what about|maybe we|could we/i)) {
      ideas.push({
        id: `idea-${Date.now()}-user-${Math.random().toString(36).substr(2, 9)}`,
        source: 'user_mention',
        conversationContext: {
          messageId: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          leadingQuestions: [],
        },
        idea: {
          title: userMessage.substring(0, 50) + '...',
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
