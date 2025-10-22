import { BaseAgent } from './base';
import { autoFillDocument, AutoFillResult, ProjectContext } from '../services/documentAutoFill';
import {
  documentTemplates,
  DocumentTemplate,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
} from '../services/documentTemplates';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface DocumentDiscoveryResult {
  suggestedDocuments: Array<{
    templateId: string;
    templateName: string;
    category: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  conversationSummary: string;
  needsMoreInfo: boolean;
  followUpQuestions?: string[];
}

export interface DocumentGenerationResult {
  templateId: string;
  templateName: string;
  autoFillResult: AutoFillResult;
  metadata: {
    generated_from_research: boolean;
    conversation_summary: string;
    generated_by: string;
    generated_at: string;
  };
}

/**
 * Document Research Agent
 * Phase 3.1: Conversational AI agent for discovering and generating documents
 *
 * CAPABILITIES:
 * 1. Conversational document discovery (multi-turn dialogue)
 * 2. Domain-specific document suggestions (software/business/development)
 * 3. Auto-fill documents from project's decided items ONLY
 * 4. Track conversation history to avoid re-researching
 * 5. Collaborate with Strategic Planner for prioritization
 */
export class DocumentResearchAgent extends BaseAgent {
  private conversationHistory: ConversationMessage[] = [];

  constructor() {
    const systemPrompt = `You are the Document Research Agent - a conversational AI that helps users discover what documents they need for their project.

YOUR PURPOSE:
Help users identify essential documentation for their specific project type through natural conversation.

CONVERSATION STYLE:
- Ask clarifying questions to understand project domain (software, business, development)
- Listen to user's project description and goals
- Probe for specific details (e.g., "Is this a healthcare app?" "Will it handle payments?")
- Build understanding through multi-turn dialogue
- Provide thoughtful, specific document recommendations

DOCUMENT KNOWLEDGE BASE:
You have access to ${documentTemplates.length} built-in document templates across 3 categories:
- Software & Technical: API docs, architecture, deployment guides
- Business: Privacy policies, terms of service, SLAs
- Development: READMEs, contributing guides, code of conduct

DISCOVERY PROCESS:
1. Ask about the project's domain and purpose
2. Identify specific technical requirements (auth, API, data handling)
3. Understand compliance needs (legal, regulatory)
4. Determine team collaboration needs
5. Suggest relevant documents with clear reasoning

RESPONSE FORMAT:
When making document suggestions, return JSON:
{
  "message": "Conversational response to user",
  "suggestedDocuments": [
    {
      "templateId": "api_documentation",
      "templateName": "API Documentation",
      "category": "software_technical",
      "reasoning": "Your app needs an API - this doc will help define endpoints",
      "priority": "high"
    }
  ],
  "needsMoreInfo": true,
  "followUpQuestions": [
    "Will your API use authentication? If so, what kind?",
    "Do you plan to make this API public or keep it internal?"
  ]
}

QUALITY CRITERIA:
- Only suggest documents that are truly relevant
- Explain WHY each document is needed
- Prioritize based on project stage and criticality
- Ask follow-up questions when you need more context
- Never suggest documents just to fill a list

STRICT RULES:
- ALWAYS provide conversational, helpful responses
- NEVER suggest documents without clear reasoning
- ASK questions when uncertain about requirements
- Focus on quality over quantity (3-5 suggestions max)`;

    super('DocumentResearchAgent', systemPrompt);
  }

  /**
   * Conversational interaction with the user
   * Supports multi-turn dialogue for document discovery
   */
  async chat(
    userMessage: string,
    project: ProjectContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<{
    response: string;
    discovery: DocumentDiscoveryResult;
    updatedHistory: ConversationMessage[];
  }> {
    this.log(`Processing chat message: "${userMessage.substring(0, 100)}..."`);

    // Load conversation history
    if (conversationHistory) {
      this.conversationHistory = conversationHistory;
    }

    // Add user message to history
    const userMsg: ConversationMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    // Build context for Claude
    const contextMessages = this.buildConversationContext(project);

    // Call Claude
    const response = await this.callClaude(contextMessages, 2000);

    // Parse response
    let parsedResponse: any;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: treat as plain text response
        parsedResponse = {
          message: response,
          suggestedDocuments: [],
          needsMoreInfo: true,
          followUpQuestions: [],
        };
      }
    } catch (error) {
      this.log(`Failed to parse JSON response: ${error}`);
      parsedResponse = {
        message: response,
        suggestedDocuments: [],
        needsMoreInfo: true,
        followUpQuestions: [],
      };
    }

    // Add assistant response to history
    const assistantMsg: ConversationMessage = {
      role: 'assistant',
      content: parsedResponse.message || response,
      timestamp: new Date().toISOString(),
      metadata: {
        suggestedDocuments: parsedResponse.suggestedDocuments || [],
        needsMoreInfo: parsedResponse.needsMoreInfo,
        followUpQuestions: parsedResponse.followUpQuestions || [],
      },
    };
    this.conversationHistory.push(assistantMsg);

    // Create discovery result
    const discovery: DocumentDiscoveryResult = {
      suggestedDocuments: parsedResponse.suggestedDocuments || [],
      conversationSummary: this.summarizeConversation(),
      needsMoreInfo: parsedResponse.needsMoreInfo !== false,
      followUpQuestions: parsedResponse.followUpQuestions || [],
    };

    this.log(`Discovery: ${discovery.suggestedDocuments.length} documents suggested, needsMoreInfo: ${discovery.needsMoreInfo}`);

    return {
      response: parsedResponse.message || response,
      discovery,
      updatedHistory: this.conversationHistory,
    };
  }

  /**
   * Quick document discovery without conversation
   * For users who know exactly what they need
   */
  async quickDiscovery(
    query: string,
    project: ProjectContext
  ): Promise<DocumentDiscoveryResult> {
    this.log(`Quick discovery for query: "${query}"`);

    // Build prompt for quick discovery
    const messages = [
      {
        role: 'user',
        content: `Project: ${project.title}
Description: ${project.description}

User Query: "${query}"

Based on this query, suggest relevant documents. Analyze the project to understand what documents would be most helpful.

Decided Items (${project.items.filter(i => i.state === 'decided').length}):
${project.items
  .filter(i => i.state === 'decided')
  .map(item => `- ${item.text}`)
  .join('\n')}

Return JSON with your suggestions.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    // Parse response
    let parsedResponse: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          suggestedDocuments: [],
          needsMoreInfo: true,
        };
      }
    } catch (error) {
      this.log(`Failed to parse JSON response: ${error}`);
      parsedResponse = {
        suggestedDocuments: [],
        needsMoreInfo: true,
      };
    }

    return {
      suggestedDocuments: parsedResponse.suggestedDocuments || [],
      conversationSummary: `Quick discovery: ${query}`,
      needsMoreInfo: parsedResponse.needsMoreInfo !== false,
      followUpQuestions: parsedResponse.followUpQuestions || [],
    };
  }

  /**
   * Generate a document using auto-fill from project's decided items
   * STRICT: Only uses decided items, never hallucinates
   */
  async generateDocument(
    templateId: string,
    project: ProjectContext,
    userId: string,
    conversationSummary?: string
  ): Promise<DocumentGenerationResult> {
    this.log(`Generating document: ${templateId} for project: ${project.id}`);

    // Get template
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.log(`Using template: ${template.name} (${template.category})`);

    // Auto-fill document from decided items ONLY
    const autoFillResult = await autoFillDocument(template, project);

    this.log(`Auto-fill completed: ${autoFillResult.completionPercent}% complete`);
    this.log(`Filled fields: ${Object.keys(autoFillResult.filledFields).length}`);
    this.log(`Missing fields: ${autoFillResult.missingFields.length}`);

    // Return result with metadata
    return {
      templateId: template.id,
      templateName: template.name,
      autoFillResult,
      metadata: {
        generated_from_research: true,
        conversation_summary: conversationSummary || 'Document generated via Document Research Agent',
        generated_by: userId,
        generated_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Search for document templates by category or keywords
   */
  async searchDocumentTemplates(
    query: string,
    category?: 'software_technical' | 'business' | 'development'
  ): Promise<DocumentTemplate[]> {
    this.log(`Searching templates: query="${query}", category=${category || 'all'}`);

    let results: DocumentTemplate[];

    if (category) {
      // Filter by category first, then search within
      const categoryTemplates = getTemplatesByCategory(category);
      const lowerQuery = query.toLowerCase();
      results = categoryTemplates.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.webResearchKeywords?.some(k => k.toLowerCase().includes(lowerQuery))
      );
    } else {
      // Search all templates
      results = searchTemplates(query);
    }

    this.log(`Found ${results.length} matching templates`);
    return results;
  }

  /**
   * Get all available document templates
   */
  getAllTemplates(): DocumentTemplate[] {
    return documentTemplates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: 'software_technical' | 'business' | 'development'): DocumentTemplate[] {
    return getTemplatesByCategory(category);
  }

  /**
   * Analyze project and suggest documents automatically
   * Uses AI to understand project context and recommend documents
   */
  async analyzeProjectAndSuggest(project: ProjectContext): Promise<DocumentDiscoveryResult> {
    this.log(`Analyzing project for automatic suggestions: ${project.title}`);

    const decidedItems = project.items.filter(i => i.state === 'decided');
    const exploringItems = project.items.filter(i => i.state === 'exploring');

    const messages = [
      {
        role: 'user',
        content: `Analyze this project and suggest relevant documents.

PROJECT DETAILS:
Title: ${project.title}
Description: ${project.description}

DECIDED ITEMS (${decidedItems.length}):
${decidedItems.map(item => `- ${item.text}`).join('\n') || 'None yet'}

EXPLORING ITEMS (${exploringItems.length}):
${exploringItems.map(item => `- ${item.text}`).join('\n') || 'None yet'}

AVAILABLE TEMPLATES:
${documentTemplates.map(t => `- ${t.id}: ${t.name} (${t.category}) - ${t.description}`).join('\n')}

Based on this project, suggest the most relevant documents. Consider:
1. Project domain (software, business, development)
2. Technical requirements mentioned in decided items
3. Compliance or legal needs
4. Team collaboration needs

Return JSON with your suggestions.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    // Parse response
    let parsedResponse: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          suggestedDocuments: [],
          needsMoreInfo: true,
        };
      }
    } catch (error) {
      this.log(`Failed to parse JSON response: ${error}`);
      parsedResponse = {
        suggestedDocuments: [],
        needsMoreInfo: true,
      };
    }

    return {
      suggestedDocuments: parsedResponse.suggestedDocuments || [],
      conversationSummary: `Automatic analysis of project: ${project.title}`,
      needsMoreInfo: false,
      followUpQuestions: [],
    };
  }

  /**
   * Build conversation context for Claude API call
   */
  private buildConversationContext(project: ProjectContext): Array<{ role: string; content: string }> {
    const decidedItems = project.items.filter(i => i.state === 'decided');

    // Start with project context
    const contextMessage = `PROJECT CONTEXT:
Title: ${project.title}
Description: ${project.description}

DECIDED ITEMS (${decidedItems.length}):
${decidedItems.map(item => `- ${item.text}`).join('\n') || 'None yet'}

AVAILABLE TEMPLATES:
${documentTemplates.map(t => `- ${t.id}: ${t.name} (${t.category})`).join('\n')}

Conversation with user about document needs:`;

    // Build message array with conversation history
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: contextMessage,
      },
    ];

    // Add conversation history
    this.conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    return messages;
  }

  /**
   * Summarize the conversation so far
   */
  private summarizeConversation(): string {
    if (this.conversationHistory.length === 0) {
      return 'No conversation yet';
    }

    const userMessages = this.conversationHistory.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];

    return `Conversation about document needs. Last user message: "${lastUserMessage?.content.substring(0, 150) || 'N/A'}..."`;
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.log('Resetting conversation history');
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }
}
