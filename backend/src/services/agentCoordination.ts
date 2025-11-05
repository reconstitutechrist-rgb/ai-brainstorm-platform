import { IntegrationOrchestrator } from '../agents/orchestrator';
import { supabase } from './supabase';
import { AgentResponse } from '../types';

export interface ConversationContext {
  projectId: string;
  messages: any[];
  currentState: any;
}

export class AgentCoordinationService {
  private orchestrator: IntegrationOrchestrator;

  constructor() {
    this.orchestrator = new IntegrationOrchestrator();
  }

  /**
   * Process user message through the agent workflow
   */
  async processUserMessage(
    projectId: string,
    userId: string,
    userMessage: string
  ): Promise<{
    responses: AgentResponse[];
    updates: any;
    workflow: any;
  }> {
    try {
      console.log(`[Coordination] Processing message for project ${projectId}`);

      // 1-4. Fetch all project data in parallel (optimization: 4 sequential calls → 1 parallel batch)
      const [projectState, conversationHistory, projectReferences, projectDocuments] = await Promise.all([
        this.getProjectState(projectId),
        this.getConversationHistory(projectId),
        this.getProjectReferences(projectId),
        this.getProjectDocuments(projectId),
      ]);

      console.log(`[Coordination] Fetched project data: ${projectReferences.length} references, ${projectDocuments.length} documents`);

      // 4. Build conversation context
      const context: ConversationContext = {
        projectId,
        messages: conversationHistory,
        currentState: projectState,
      };

      // 5. Classify intent using Context Manager
      const contextManager = this.orchestrator['agents'].get('contextManager');
      const intent = await contextManager.classifyIntent(userMessage, conversationHistory);

      console.log(`[Coordination] Intent classified: ${intent.type} (${intent.confidence}% confidence)`);

      // 6. Determine workflow based on intent
      const workflow = await this.orchestrator.determineWorkflow(intent, userMessage);

      // 7. QUICK FIX: Execute ONLY conversation agent for immediate response
      console.log('[Coordination] ⚡ Quick response mode: executing conversation agent only');
      const allProjectContext = [...projectReferences, ...projectDocuments];
      
      // Get conversation agent directly
      const conversationAgent = this.orchestrator['agents'].get('conversation');
      if (!conversationAgent) {
        throw new Error('Conversation agent not found');
      }

      // Execute conversation agent immediately
      const conversationResponse = await conversationAgent.reflect(
        userMessage,
        conversationHistory,
        allProjectContext
      );

      console.log(`[Coordination] Conversation agent responded in real-time: ${conversationResponse.message?.length || 0} chars`);

      // Package as response array
      const immediateResponses = [conversationResponse];

      // 8. Fire background workflow execution (gap detection, clarification, recording)
      // This runs AFTER we've already returned the conversation response
      this.executeBackgroundWorkflow(
        workflow,
        userMessage,
        projectState,
        conversationHistory,
        allProjectContext,
        immediateResponses,
        projectId
      ).catch(err => {
        console.error('[Coordination] Background workflow error (non-fatal):', err);
      });

      // Return conversation response immediately - background processing happens async
      return {
        responses: immediateResponses,
        updates: { itemsAdded: [], itemsModified: [], itemsMoved: [] }, // Empty for now - recording is async
        workflow,
      };
    } catch (error) {
      console.error('[Coordination] Error processing message:', error);
      throw error;
    }
  }

  /**
   * Execute full workflow in background (gap detection, clarification, recording)
   * This runs AFTER the conversation response has been returned to the user
   */
  private async executeBackgroundWorkflow(
    workflow: any,
    userMessage: string,
    projectState: any,
    conversationHistory: any[],
    allProjectContext: any[],
    conversationResponses: AgentResponse[],
    projectId: string
  ): Promise<void> {
    try {
      console.log('[Coordination] 🔄 Starting background workflow execution...');

      // Execute the full workflow (gap detection, clarification, etc.)
      const backgroundResponses = await this.orchestrator.executeWorkflow(
        workflow,
        userMessage,
        projectState,
        conversationHistory,
        allProjectContext
      );

      console.log(`[Coordination] Background workflow completed: ${backgroundResponses.length} responses`);

      // Save background agent responses that contain questions to the database
      // This allows the frontend AgentQuestionBubble to display them
      await this.saveBackgroundAgentResponses(projectId, backgroundResponses);

      // Combine conversation + background responses for recording
      const allResponses = [...conversationResponses, ...backgroundResponses];

      // Now fire recording with all responses
      await this.processStateUpdatesAsync(projectId, allResponses, userMessage, workflow);

      console.log('[Coordination] ✅ Background workflow complete');
    } catch (error: any) {
      console.error('[Coordination] ❌ Background workflow failed:', error);
      // Don't throw - background failure shouldn't break the main flow
    }
  }

  /**
   * Save background agent responses (gap detection, clarification) that contain questions
   * This allows the frontend to display agent questions in the AgentQuestionBubble
   */
  private async saveBackgroundAgentResponses(
    projectId: string,
    backgroundResponses: AgentResponse[]
  ): Promise<void> {
    try {
      // Find responses with agentQuestions metadata
      const responsesWithQuestions = backgroundResponses.filter(
        r => r.metadata?.agentQuestions && r.metadata.agentQuestions.length > 0
      );

      if (responsesWithQuestions.length === 0) {
        console.log('[Coordination] No background responses with questions to save');
        return;
      }

      console.log(`[Coordination] Saving ${responsesWithQuestions.length} background responses with questions`);

      // Get user ID from the project (we'll need this for message creation)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('[Coordination] Failed to get project user_id:', projectError);
        return;
      }

      // Save each response as a system message with metadata
      const messagesToSave = responsesWithQuestions.map(response => ({
        project_id: projectId,
        user_id: project.user_id,
        role: 'assistant',
        content: response.message || '[Background agent analysis]',
        agent_type: response.agent || 'system',
        metadata: response.metadata || {},
      }));

      const { error: saveError } = await supabase
        .from('messages')
        .insert(messagesToSave);

      if (saveError) {
        console.error('[Coordination] Failed to save background agent responses:', saveError);
      } else {
        console.log(`[Coordination] ✅ Saved ${messagesToSave.length} background agent responses with questions`);
      }
    } catch (error) {
      console.error('[Coordination] Error saving background agent responses:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Process state updates and logging asynchronously in the background
   * This allows the conversation response to be sent immediately without waiting for recording
   */
  private async processStateUpdatesAsync(
    projectId: string,
    responses: AgentResponse[],
    userMessage: string,
    workflow: any
  ): Promise<void> {
    try {
      console.log('[Coordination] 🚀 Starting background recording...');

      // Invoke PersistenceManager agent directly to analyze and record items
      const persistenceManager = this.orchestrator['agents'].get('persistenceManager');
      if (!persistenceManager) {
        console.error('[Coordination] ❌ PersistenceManager agent not found');
        return;
      }

      // Get fresh project state and conversation history for recording
      const [projectState, conversationHistory] = await Promise.all([
        this.getProjectState(projectId),
        this.getConversationHistory(projectId)
      ]);

      // Find the conversation response (the message to analyze for recording)
      const conversationResponse = responses.find(r =>
        r.agent && (r.agent.includes('ConversationAgent') || r.agent.includes('brainstorming'))
      );

      if (!conversationResponse) {
        console.log('[Coordination] No conversation response to record from');
        return;
      }

      console.log('[Coordination] Invoking PersistenceManager to analyze conversation response');

      // Invoke recorder agent with conversation response
      const recorderResponse = await persistenceManager.record(
        { conversationResponse: conversationResponse.message },
        projectState,
        userMessage,
        workflow.intent,
        conversationHistory
      );

      // Process recorder response to update project state
      const updates = await this.processStateUpdates(projectId, [recorderResponse], userMessage);

      await this.logAgentActivity(projectId, workflow, [...responses, recorderResponse]);
      console.log('[Coordination] ✅ Background recording complete:', updates);
    } catch (error) {
      console.error('[Coordination] ❌ Background recording failed:', error);
      // Don't throw - recording failure shouldn't break conversation
    }
  }

  /**
   * Get current project state
   */
  private async getProjectState(projectId: string): Promise<any> {
    const { data, error } = await supabase
      .from('projects')
      .select('items')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project state:', error);
      return { decided: [], exploring: [], parked: [] };
    }

    const items = data?.items || [];

    return {
      decided: items.filter((i: any) => i.state === 'decided'),
      exploring: items.filter((i: any) => i.state === 'exploring'),
      parked: items.filter((i: any) => i.state === 'parked'),
    };
  }

  /**
   * Get conversation history
   * FIXED: Now retrieves the MOST RECENT 50 messages, not the oldest 50
   * This ensures the AI always has current context and responds to latest inputs
   */
  private async getConversationHistory(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }) // Get most recent first
      .limit(50); // Last 50 messages for context

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    // Reverse to maintain chronological order for AI context
    // (oldest to newest, but only including the most recent 50 messages)
    return (data || []).reverse();
  }

  /**
   * Get project references (PDFs, images, uploaded files)
   */
  private async getProjectReferences(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('references')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project references:', error);
      return [];
    }

    // Transform references to include analysis and metadata
    const references = (data || []).map(ref => ({
      id: ref.id,
      filename: ref.filename,
      type: ref.metadata?.type || 'unknown',
      url: ref.url,
      analysis: ref.metadata?.analysis || null,
      description: ref.metadata?.description || '',
      status: ref.analysis_status,
      created_at: ref.created_at,
      source: 'reference', // Mark as reference
    }));

    return references;
  }

  /**
   * Get project documents (uploaded document files)
   */
  private async getProjectDocuments(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching project documents:', error);
      return [];
    }

    // Transform documents to match reference format
    const documents = (data || []).map(doc => ({
      id: doc.id,
      filename: doc.filename,
      type: doc.file_type || 'document',
      url: doc.file_url,
      analysis: null, // Documents don't have analysis yet
      description: doc.description || '',
      status: 'uploaded',
      created_at: doc.created_at,
      source: 'document', // Mark as document
      fileSize: doc.file_size,
    }));

    return documents;
  }

  /**
   * Process state updates from agent responses
   */
  private async processStateUpdates(
    projectId: string,
    responses: AgentResponse[],
    userMessage: string
  ): Promise<any> {
    console.log(`[Coordination] Processing state updates for ${responses.length} responses`);

    const updates: any = {
      itemsAdded: [],
      itemsModified: [],
      itemsMoved: [],
    };

    // Check for recorder agent responses with metadata
    for (const response of responses) {
      if (response && response.agent && (response.agent.includes('RecorderAgent') || response.agent.includes('PersistenceManagerAgent'))) {
        console.log(`[Coordination] Found ${response.agent} response, checking metadata...`);
        console.log(`[Coordination] Metadata:`, JSON.stringify(response.metadata, null, 2));

        if (!response.metadata) {
          console.log(`[Coordination] ⚠️  ${response.agent} has NO metadata - skipping`);
          continue;
        }
        // Check for batch recording from review (new format)
        if (response.metadata.itemsToRecord && Array.isArray(response.metadata.itemsToRecord)) {
          console.log(`[Coordination] Processing ${response.metadata.itemsToRecord.length} items from review`);

          // Get current items once
          const { data: project } = await supabase
            .from('projects')
            .select('items')
            .eq('id', projectId)
            .single();

          let currentItems = project?.items || [];

          // Add each item from the review
          for (const itemToRecord of response.metadata.itemsToRecord) {
            const newItem = {
              id: this.generateId(),
              text: itemToRecord.item,
              state: itemToRecord.state,
              created_at: new Date().toISOString(),
              citation: {
                userQuote: itemToRecord.userQuote || userMessage,
                timestamp: new Date().toISOString(),
                confidence: itemToRecord.confidence || 85,
                source: 'review', // Mark as coming from review
              },
            };

            currentItems = [...currentItems, newItem];
            updates.itemsAdded.push(newItem);
            console.log(`[Coordination] Added item: ${newItem.text} (${newItem.state})`);
          }

          // Update project with all new items
          if (updates.itemsAdded.length > 0) {
            const { error: updateError } = await supabase
              .from('projects')
              .update({
                items: currentItems,
                updated_at: new Date().toISOString()
              })
              .eq('id', projectId);

            if (updateError) {
              console.error(`[Coordination] Error saving items to project:`, updateError);
            } else {
              console.log(`[Coordination] Saved ${updates.itemsAdded.length} items to project ${projectId}`);
            }
          }
        }
        // Check for single item recording (original format)
        else if (response.metadata.shouldRecord && response.metadata.item) {
          console.log(`[Coordination] ✅ Single item recording triggered`);
          console.log(`[Coordination]   - verified: ${response.metadata.verified}`);
          console.log(`[Coordination]   - shouldRecord: ${response.metadata.shouldRecord}`);
          console.log(`[Coordination]   - state: ${response.metadata.state}`);
          console.log(`[Coordination]   - item: ${response.metadata.item}`);
          console.log(`[Coordination]   - confidence: ${response.metadata.confidence}`);

          const { shouldRecord, state, item } = response.metadata;

          // Add new item to project
          const newItem = {
            id: this.generateId(),
            text: item,
            state: state,
            created_at: new Date().toISOString(),
            citation: {
              userQuote: userMessage,
              timestamp: new Date().toISOString(),
              confidence: response.metadata.confidence || 100,
            },
          };

          console.log(`[Coordination] Creating new item:`, JSON.stringify(newItem, null, 2));

          // Get current items
          const { data: project } = await supabase
            .from('projects')
            .select('items')
            .eq('id', projectId)
            .single();

          const currentItems = project?.items || [];
          const updatedItems = [...currentItems, newItem];

          console.log(`[Coordination] Current items count: ${currentItems.length}, new count: ${updatedItems.length}`);

          // Update project
          const { error: updateError } = await supabase
            .from('projects')
            .update({
              items: updatedItems,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

          if (updateError) {
            console.error(`[Coordination] ❌ Error saving item to project:`, updateError);
          } else {
            console.log(`[Coordination] ✅ Successfully saved item to project ${projectId}`);
            updates.itemsAdded.push(newItem);
          }
        } else {
          // Log when recorder metadata doesn't have the expected fields
          console.log(`[Coordination] ⚠️  ${response.agent} metadata missing shouldRecord or item fields`);
          console.log(`[Coordination]   - shouldRecord: ${response.metadata.shouldRecord}`);
          console.log(`[Coordination]   - item: ${response.metadata.item ? 'exists' : 'missing'}`);
          console.log(`[Coordination]   - verified: ${response.metadata.verified}`);
        }
      }
    }

    console.log(`[Coordination] State updates complete: ${updates.itemsAdded.length} added, ${updates.itemsModified.length} modified, ${updates.itemsMoved.length} moved`);
    return updates;
  }

  /**
   * Log agent activity
   */
  private async logAgentActivity(
    projectId: string,
    workflow: any,
    responses: AgentResponse[]
  ): Promise<void> {
    try {
      const activities = responses.map(response => ({
        project_id: projectId,
        agent_type: response.agent,
        action: workflow.intent,
        details: {
          message: response.message,
          metadata: response.metadata,
        },
      }));

      if (activities.length > 0) {
        await supabase
          .from('agent_activity')
          .insert(activities);
      }
    } catch (error) {
      console.error('Error logging agent activity:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return this.orchestrator.getStats();
  }
}
