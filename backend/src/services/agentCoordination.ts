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

      // 7. Execute workflow (now includes references and documents)
      const allProjectContext = [...projectReferences, ...projectDocuments];
      const responses = await this.orchestrator.executeWorkflow(
        workflow,
        userMessage,
        projectState,
        conversationHistory,
        allProjectContext
      );

      console.log(`[Coordination] Orchestrator returned ${responses.length} responses`);
      responses.forEach((r, i) => {
        console.log(`[Coordination] Response ${i}: agent=${r.agent}, showToUser=${r.showToUser}, messageLength=${r.message?.length || 0}`);
      });

      // Count user-facing responses for logging
      const userFacingCount = responses.filter(r => r.showToUser).length;
      console.log(`[Coordination] ${userFacingCount} of ${responses.length} responses have showToUser=true`);

      // 7. Process updates to project state
      const updates = await this.processStateUpdates(projectId, responses, userMessage);

      // 8. Log agent activity
      await this.logAgentActivity(projectId, workflow, responses);

      // Return ALL responses - let the conversation route filter them
      // This prevents double-filtering which was causing empty response arrays
      return {
        responses: responses,
        updates,
        workflow,
      };
    } catch (error) {
      console.error('[Coordination] Error processing message:', error);
      throw error;
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
   */
  private async getConversationHistory(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(50); // Last 50 messages for context

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return data || [];
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
    const updates: any = {
      itemsAdded: [],
      itemsModified: [],
      itemsMoved: [],
    };

    // Check for recorder agent responses with metadata
    for (const response of responses) {
      if (response && response.agent && response.agent.includes('RecorderAgent') && response.metadata) {
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

          // Get current items
          const { data: project } = await supabase
            .from('projects')
            .select('items')
            .eq('id', projectId)
            .single();

          const currentItems = project?.items || [];
          const updatedItems = [...currentItems, newItem];

          // Update project
          await supabase
            .from('projects')
            .update({
              items: updatedItems,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

          updates.itemsAdded.push(newItem);
        }
      }
    }

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