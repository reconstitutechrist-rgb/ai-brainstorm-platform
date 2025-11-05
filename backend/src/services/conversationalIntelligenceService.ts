import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QAResponse {
  type: 'qa';
  content: string;
  metadata: {
    sources: Array<{
      type: string;
      title: string;
      relevance: string;
    }>;
    relatedTopics?: string[];
    documentsNeedingExtraction?: Array<{
      id: string;
      filename: string;
    }>;
  };
}

interface DocumentResponse {
  type: 'document';
  content: string;
  metadata: {
    title: string;
    documentType: string;
    audience: string;
    tone: string;
    format: string;
    sources: Array<{
      type: string;
      title: string;
    }>;
  };
}

type ConversationResponse = QAResponse | DocumentResponse;

export class ConversationalIntelligenceService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Sanitize text content to remove invalid Unicode characters
   */
  private sanitizeText(text: string): string {
    if (!text) return '';

    try {
      // Step 1: Remove all surrogate code units to prevent JSON encoding issues
      let sanitized = text.replace(/[\uD800-\uDFFF]/g, '');

      // Step 2: Remove control characters except newlines, tabs, and carriage returns
      sanitized = sanitized.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

      // Step 3: Replace replacement characters with question marks
      sanitized = sanitized.replace(/\uFFFD/g, '?');

      // Step 4: Ensure it's valid UTF-8 by converting through Buffer
      const buffer = Buffer.from(sanitized, 'utf8');
      sanitized = buffer.toString('utf8');

      return sanitized;
    } catch (error) {
      console.error('[ConversationalIntelligence] Text sanitization error:', error);
      // Fallback: keep only printable ASCII characters
      return text.replace(/[^\x20-\x7E\n\r\t]/g, '');
    }
  }

  /**
   * Process conversation message and determine intent
   */
  async processConversation(
    projectId: string,
    userMessage: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<ConversationResponse> {
    console.log(`[ConversationalIntelligence] Processing message for project ${projectId}`);
    console.log(`[ConversationalIntelligence] Message: "${userMessage}"`);

    // Quick check: are there user documents without extracted content?
    const userDocs = await this.getUserDocuments(projectId);
    if (userDocs && userDocs.length > 0) {
      const docsWithoutContent = userDocs.filter((doc: any) =>
        !doc.metadata?.content && !doc.metadata?.extractedContent
      );

      if (docsWithoutContent.length > 0) {
        console.warn(`[ConversationalIntelligence] Found ${docsWithoutContent.length} documents without extracted content`);
        console.warn(`[ConversationalIntelligence] Documents: ${docsWithoutContent.map((d: any) => d.filename).join(', ')}`);

        // Return helpful error message
        return {
          type: 'qa',
          content: `I found ${docsWithoutContent.length} uploaded document(s) that don't have extracted content yet:\n\n${docsWithoutContent.map((d: any) => `- ${d.filename}`).join('\n')}\n\nThese documents were uploaded before content extraction was implemented. To fix this, you can:\n\n1. Re-upload these documents (recommended for best results)\n2. Or, have the system administrator run the backfill endpoint to extract content from existing documents\n\nOnce the content is extracted, I'll be able to answer questions about your project using information from these documents.`,
          metadata: {
            sources: [],
            relatedTopics: [],
            documentsNeedingExtraction: docsWithoutContent.map((d: any) => ({
              id: d.id,
              filename: d.filename
            }))
          }
        } as QAResponse;
      }
    }

    // Detect intent
    const intent = await this.detectIntent(userMessage, conversationHistory);
    console.log(`[ConversationalIntelligence] Detected intent: ${intent}`);

    if (intent === 'document_generation') {
      return await this.handleDocumentGeneration(projectId, userMessage, conversationHistory);
    } else {
      return await this.handleQuestionAnswer(projectId, userMessage, conversationHistory);
    }
  }

  /**
   * Detect user intent from message
   */
  private async detectIntent(
    message: string,
    history: ConversationMessage[]
  ): Promise<'qa' | 'document_generation'> {
    const lowerMessage = message.toLowerCase();

    // Document generation keywords
    const docGenerationKeywords = [
      'create', 'generate', 'build', 'draft', 'write', 'make a', 'prepare',
      'develop', 'compose', 'construct', 'produce', 'design a'
    ];

    // Check for document generation intent
    const hasDocGenKeyword = docGenerationKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Document type indicators
    const documentTypeIndicators = [
      'proposal', 'pitch', 'documentation', 'guide', 'report', 'summary',
      'presentation', 'brief', 'plan', 'specification', 'overview', 'deck',
      'doc', 'document', 'memo', 'letter', 'email', 'rfp', 'contract'
    ];

    const hasDocTypeIndicator = documentTypeIndicators.some(type =>
      lowerMessage.includes(type)
    );

    // If has both generation keyword AND document type, it's document generation
    if (hasDocGenKeyword && hasDocTypeIndicator) {
      return 'document_generation';
    }

    // Additional check: if message is asking to "create" or "generate" something substantial
    if (hasDocGenKeyword && (lowerMessage.includes(' for ') || lowerMessage.includes(' about '))) {
      return 'document_generation';
    }

    // Default to Q&A
    return 'qa';
  }

  /**
   * Handle Q&A requests
   */
  private async handleQuestionAnswer(
    projectId: string,
    question: string,
    conversationHistory: ConversationMessage[]
  ): Promise<QAResponse> {
    console.log(`[ConversationalIntelligence] Handling Q&A`);

    // Gather all project data
    const projectData = await this.gatherProjectData(projectId);

    // Generate answer using Claude
    const systemPrompt = `You are a helpful project intelligence assistant. Answer questions about the user's project based on the provided data.

Be concise but thorough. Cite specific documents or decisions when relevant. If you don't have enough information to answer confidently, say so.`;

    const userPrompt = `Project Data:
${this.formatProjectDataForPrompt(projectData)}

User Question: ${question}

Please answer the question based on the project data above. Be specific and cite sources when possible.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const answerContent = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Extract sources mentioned in the answer
      const sources = this.extractSources(answerContent, projectData);

      return {
        type: 'qa',
        content: answerContent,
        metadata: {
          sources,
          relatedTopics: this.extractRelatedTopics(answerContent)
        }
      };
    } catch (error: any) {
      console.error('[ConversationalIntelligence] Q&A error:', error);

      // Provide more specific error messages
      if (error.message?.includes('Invalid API Key')) {
        throw new Error('API configuration error. Please check your Anthropic API key.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed with AI service.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message) {
        throw new Error(`AI service error: ${error.message}`);
      }

      throw new Error('Failed to generate answer. Please try again.');
    }
  }

  /**
   * Handle document generation requests
   */
  private async handleDocumentGeneration(
    projectId: string,
    request: string,
    conversationHistory: ConversationMessage[]
  ): Promise<DocumentResponse> {
    console.log(`[ConversationalIntelligence] Handling document generation`);

    // Gather all project data
    const projectData = await this.gatherProjectData(projectId);

    // Analyze request to extract metadata
    const documentMetadata = await this.analyzeDocumentRequest(request);

    // Generate document using Claude
    const systemPrompt = `You are an expert document generator. Create professional documents tailored to specific audiences and purposes.

Generate complete, well-structured documents using markdown formatting. Adapt your tone and language to match the target audience.`;

    const userPrompt = `Project Information:
${this.formatProjectDataForPrompt(projectData)}

User Request: ${request}

Document Requirements:
- Type: ${documentMetadata.documentType}
- Audience: ${documentMetadata.audience}
- Tone: ${documentMetadata.tone}

Please generate a complete, professional document that:
1. Uses the project information provided above
2. Is appropriately formatted for ${documentMetadata.audience}
3. Uses a ${documentMetadata.tone} tone
4. Includes all relevant information from the project data
5. Follows industry best practices for ${documentMetadata.documentType}

Generate the complete document in markdown format.`;

    try {
      console.log('[ConversationalIntelligence] Calling Claude API for document generation...');
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });
      console.log('[ConversationalIntelligence] Document generated successfully');

      const documentContent = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Extract title from generated content (first # heading)
      const titleMatch = documentContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : documentMetadata.documentType;

      // Identify sources used
      const sources = this.identifyUsedSources(projectData);

      return {
        type: 'document',
        content: documentContent,
        metadata: {
          title,
          documentType: documentMetadata.documentType,
          audience: documentMetadata.audience,
          tone: documentMetadata.tone,
          format: 'markdown',
          sources
        }
      };
    } catch (error: any) {
      console.error('[ConversationalIntelligence] Document generation error:', error);

      // Provide more specific error messages
      if (error.message?.includes('Invalid API Key')) {
        throw new Error('API configuration error. Please check your Anthropic API key.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed with AI service.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message) {
        throw new Error(`AI service error: ${error.message}`);
      }

      throw new Error('Failed to generate document. Please try again.');
    }
  }

  /**
   * Analyze document generation request to extract metadata
   */
  private async analyzeDocumentRequest(request: string): Promise<{
    documentType: string;
    audience: string;
    tone: string;
  }> {
    const lowerRequest = request.toLowerCase();

    // Simple keyword-based detection (can be enhanced with AI later)
    let documentType = 'General Document';
    let audience = 'General Audience';
    let tone = 'Professional';

    // Detect document type
    if (lowerRequest.includes('proposal')) documentType = 'Proposal';
    else if (lowerRequest.includes('pitch') || lowerRequest.includes('investor')) documentType = 'Investor Pitch';
    else if (lowerRequest.includes('documentation') || lowerRequest.includes('guide')) documentType = 'Documentation';
    else if (lowerRequest.includes('report')) documentType = 'Report';
    else if (lowerRequest.includes('summary') || lowerRequest.includes('executive')) documentType = 'Executive Summary';
    else if (lowerRequest.includes('specification') || lowerRequest.includes('spec')) documentType = 'Technical Specification';
    else if (lowerRequest.includes('overview')) documentType = 'Overview';

    // Detect audience
    if (lowerRequest.includes('investor')) audience = 'Investors';
    else if (lowerRequest.includes('vendor') || lowerRequest.includes('supplier')) audience = 'Vendors';
    else if (lowerRequest.includes('customer') || lowerRequest.includes('client')) audience = 'Customers';
    else if (lowerRequest.includes('developer') || lowerRequest.includes('technical')) audience = 'Developers';
    else if (lowerRequest.includes('executive') || lowerRequest.includes('stakeholder')) audience = 'Executives';
    else if (lowerRequest.includes('user') || lowerRequest.includes('end-user')) audience = 'End Users';
    else if (lowerRequest.includes('enterprise')) audience = 'Enterprise Clients';

    // Detect tone
    if (lowerRequest.includes('casual') || lowerRequest.includes('friendly')) tone = 'Casual and Friendly';
    else if (lowerRequest.includes('formal')) tone = 'Formal and Professional';
    else if (lowerRequest.includes('persuasive') || lowerRequest.includes('compelling')) tone = 'Persuasive';
    else if (lowerRequest.includes('technical')) tone = 'Technical and Detailed';
    else if (lowerRequest.includes('educational') || lowerRequest.includes('tutorial')) tone = 'Educational';

    return { documentType, audience, tone };
  }

  /**
   * Gather all project data from intelligence hub
   */
  private async gatherProjectData(projectId: string): Promise<any> {
    console.log(`[ConversationalIntelligence] Gathering project data`);

    const [
      project,
      generatedDocs,
      userDocs,
      conversations,
      activity
    ] = await Promise.all([
      this.getProject(projectId),
      this.getGeneratedDocuments(projectId),
      this.getUserDocuments(projectId),
      this.getProjectConversations(projectId),
      this.getProjectActivity(projectId)
    ]);

    return {
      project,
      generatedDocs,
      userDocs,
      conversations,
      activity
    };
  }

  /**
   * Get project details
   */
  private async getProject(projectId: string) {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('[ConversationalIntelligence] Failed to fetch project:', error.message);
      throw new Error(`Project not found: ${projectId}`);
    }
    return data;
  }

  /**
   * Get all generated documents
   */
  private async getGeneratedDocuments(projectId: string) {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .neq('document_type', 'vendor_comparison');

    if (error) {
      console.warn('[ConversationalIntelligence] Generated documents not available:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Get user-uploaded documents
   */
  private async getUserDocuments(projectId: string) {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.warn('[ConversationalIntelligence] User documents not available:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Get project conversations
   */
  private async getProjectConversations(projectId: string) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('project_id', projectId)
      .limit(5);

    if (error) {
      console.warn('[ConversationalIntelligence] Conversations not available:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Get project activity
   */
  private async getProjectActivity(projectId: string) {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Handle missing table gracefully
    if (error) {
      console.warn('[ConversationalIntelligence] Activity logs not available:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Format project data for Claude prompt
   */
  private formatProjectDataForPrompt(projectData: any): string {
    const parts: string[] = [];

    // Project basics
    if (projectData.project) {
      parts.push(`PROJECT: ${projectData.project.title}`);
      if (projectData.project.description) {
        parts.push(`Description: ${projectData.project.description}`);
      }
      parts.push('');
    }

    // Generated documents
    if (projectData.generatedDocs && projectData.generatedDocs.length > 0) {
      parts.push('GENERATED DOCUMENTS:');
      projectData.generatedDocs.forEach((doc: any) => {
        parts.push(`\n[${doc.document_type.toUpperCase()}] - ${doc.title}`);
        // Sanitize content to remove invalid Unicode characters
        const content = this.sanitizeText(doc.content);
        parts.push(content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
      });
      parts.push('');
    }

    // User documents
    if (projectData.userDocs && projectData.userDocs.length > 0) {
      parts.push('USER DOCUMENTS:');
      let documentsWithContent = 0;
      let documentsWithoutContent = 0;

      projectData.userDocs.forEach((doc: any) => {
        parts.push(`\n[USER DOC] - ${doc.filename}`);
        if (doc.metadata?.content || doc.metadata?.extractedContent) {
          const rawContent = doc.metadata?.content || doc.metadata?.extractedContent;
          // Sanitize content to remove invalid Unicode characters
          const content = this.sanitizeText(rawContent);
          parts.push(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
          documentsWithContent++;
        } else {
          parts.push('[Content not extracted - document may need to be re-uploaded or have content extracted]');
          documentsWithoutContent++;
        }
      });
      parts.push('');

      // Log warning if documents are missing content
      if (documentsWithoutContent > 0) {
        console.warn(`[ConversationalIntelligence] WARNING: ${documentsWithoutContent} of ${projectData.userDocs.length} user documents have no extracted content`);
        console.warn(`[ConversationalIntelligence] To fix this, call POST /api/documents/project/${projectData.project?.id}/extract-all-content`);
      }
    }

    // Recent activity (sample)
    if (projectData.activity && projectData.activity.length > 0) {
      parts.push('RECENT ACTIVITY:');
      projectData.activity.slice(0, 5).forEach((act: any) => {
        parts.push(`- ${act.agent_name}: ${act.action} (${new Date(act.created_at).toLocaleDateString()})`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Extract sources mentioned in answer
   */
  private extractSources(answer: string, projectData: any): Array<{ type: string; title: string; relevance: string }> {
    const sources: Array<{ type: string; title: string; relevance: string }> = [];

    // Check generated docs
    if (projectData.generatedDocs) {
      projectData.generatedDocs.forEach((doc: any) => {
        if (answer.toLowerCase().includes(doc.document_type.toLowerCase().replace('_', ' '))) {
          sources.push({
            type: 'Generated Document',
            title: doc.title,
            relevance: 'Referenced in answer'
          });
        }
      });
    }

    // Check user docs
    if (projectData.userDocs) {
      projectData.userDocs.forEach((doc: any) => {
        if (answer.toLowerCase().includes(doc.filename.toLowerCase())) {
          sources.push({
            type: 'User Document',
            title: doc.filename,
            relevance: 'Referenced in answer'
          });
        }
      });
    }

    return sources;
  }

  /**
   * Extract related topics from answer
   */
  private extractRelatedTopics(answer: string): string[] {
    // Simple extraction - can be enhanced with NLP
    const topics: string[] = [];

    const topicKeywords = ['authentication', 'security', 'database', 'api', 'frontend', 'backend', 'deployment', 'testing'];

    topicKeywords.forEach(keyword => {
      if (answer.toLowerCase().includes(keyword)) {
        topics.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });

    return topics;
  }

  /**
   * Identify sources used in generated document
   */
  private identifyUsedSources(projectData: any): Array<{ type: string; title: string }> {
    const sources: Array<{ type: string; title: string }> = [];

    // Add all available documents as potential sources
    if (projectData.generatedDocs) {
      projectData.generatedDocs.forEach((doc: any) => {
        sources.push({
          type: 'Generated Document',
          title: doc.title
        });
      });
    }

    if (projectData.userDocs) {
      projectData.userDocs.forEach((doc: any) => {
        sources.push({
          type: 'User Document',
          title: doc.filename
        });
      });
    }

    return sources;
  }
}
