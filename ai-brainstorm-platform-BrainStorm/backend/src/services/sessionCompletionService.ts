import { SupabaseClient } from '@supabase/supabase-js';
import { ExtractedIdea } from './contextGroupingService';
import { BrainstormDocumentService } from './brainstormDocumentService';
import { v4 as uuidv4 } from 'uuid';

export interface SessionCompletionSummary {
  success: boolean;
  sessionId: string;
  sessionName: string;
  documentsCreated: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  documentsUpdated: Array<{
    id: string;
    title: string;
    type: string;
    previousVersion: number;
    newVersion: number;
  }>;
  projectItemsAdded: number;
  itemsDetails: {
    decided: number;
    exploring: number;
  };
  sandboxStatus: string;
}

/**
 * Session Completion Service
 *
 * Orchestrates the complete session finalization workflow:
 * 1. Create brainstorm session record
 * 2. Generate documents (accepted/rejected)
 * 3. Update existing documents
 * 4. Add accepted ideas to main project
 * 5. Update sandbox status
 * 6. Update conversation status
 * 7. Return detailed summary
 */
export class SessionCompletionService {
  private brainstormDocService: BrainstormDocumentService;

  constructor(private supabase: SupabaseClient) {
    this.brainstormDocService = new BrainstormDocumentService(supabase);
  }

  /**
   * Complete brainstorm session with all updates
   */
  async completeSession(
    conversationId: string,
    finalDecisions: {
      accepted: ExtractedIdea[];
      rejected: ExtractedIdea[];
      unmarked?: ExtractedIdea[];
    }
  ): Promise<SessionCompletionSummary> {
    console.log(`[SessionCompletion] Starting completion for conversation ${conversationId}`);
    console.log(`[SessionCompletion] ${finalDecisions.accepted.length} accepted, ${finalDecisions.rejected.length} rejected`);

    try {
      // 1. Get conversation and sandbox info
      const { data: conversation, error: convError } = await this.supabase
        .from('sandbox_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error(`Conversation not found: ${convError?.message}`);
      }

      const { data: sandbox, error: sandboxError } = await this.supabase
        .from('sandbox_sessions')
        .select('*')
        .eq('id', conversation.sandbox_id)
        .single();

      if (sandboxError || !sandbox) {
        throw new Error(`Sandbox not found: ${sandboxError?.message}`);
      }

      const projectId = sandbox.project_id;
      const sessionName = `Completed Session - ${new Date().toLocaleDateString()}`;

      // 2. Create brainstorm session record
      const session = await this.createSessionRecord(
        sandbox.id,
        conversationId,
        projectId,
        sessionName,
        finalDecisions
      );

      console.log(`[SessionCompletion] Created session record: ${session.id}`);

      // 3. Generate documents
      const { acceptedDoc, rejectedDoc, updatedDocs } =
        await this.brainstormDocService.generateSessionDocuments(
          projectId,
          session.id,
          sessionName,
          finalDecisions.accepted,
          finalDecisions.rejected
        );

      console.log(`[SessionCompletion] Generated ${updatedDocs.length + 2} documents`);

      // 4. Update session with document IDs
      await this.updateSessionDocuments(
        session.id,
        [acceptedDoc.id, rejectedDoc.id],
        updatedDocs.map(d => d.id)
      );

      // 5. Add accepted ideas to main project
      const addedItems = await this.addIdeasToProject(
        projectId,
        finalDecisions.accepted,
        session.id
      );

      console.log(`[SessionCompletion] Added ${addedItems.length} items to project`);

      // 6. Update sandbox status
      await this.updateSandboxStatus(sandbox.id, sessionName);

      // 7. Update conversation status
      await this.updateConversationStatus(conversationId, finalDecisions);

      // 8. Build summary
      const summary: SessionCompletionSummary = {
        success: true,
        sessionId: session.id,
        sessionName,
        documentsCreated: [
          {
            id: acceptedDoc.id,
            title: acceptedDoc.title,
            type: 'accepted_ideas',
          },
          {
            id: rejectedDoc.id,
            title: rejectedDoc.title,
            type: 'rejected_ideas',
          },
        ],
        documentsUpdated: updatedDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.document_type,
          previousVersion: doc.version - 1,
          newVersion: doc.version,
        })),
        projectItemsAdded: addedItems.length,
        itemsDetails: {
          decided: addedItems.filter(i => i.state === 'decided').length,
          exploring: addedItems.filter(i => i.state === 'exploring').length,
        },
        sandboxStatus: 'completed',
      };

      console.log(`[SessionCompletion] Session completion successful`);
      return summary;
    } catch (error) {
      console.error('[SessionCompletion] Error completing session:', error);
      throw error;
    }
  }

  /**
   * Create brainstorm session tracking record
   */
  private async createSessionRecord(
    sandboxId: string,
    conversationId: string,
    projectId: string,
    sessionName: string,
    decisions: {
      accepted: ExtractedIdea[];
      rejected: ExtractedIdea[];
      unmarked?: ExtractedIdea[];
    }
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('brainstorm_sessions')
      .insert({
        sandbox_id: sandboxId,
        conversation_id: conversationId,
        project_id: projectId,
        session_name: sessionName,
        accepted_ideas: decisions.accepted,
        rejected_ideas: decisions.rejected,
        unmarked_ideas: decisions.unmarked || [],
        metadata: {
          acceptedCount: decisions.accepted.length,
          rejectedCount: decisions.rejected.length,
          unmarkedCount: decisions.unmarked?.length || 0,
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session record: ${error.message}`);
    }

    return data;
  }

  /**
   * Update session with generated document IDs
   */
  private async updateSessionDocuments(
    sessionId: string,
    generatedDocIds: string[],
    updatedDocIds: string[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from('brainstorm_sessions')
      .update({
        generated_document_ids: generatedDocIds,
        updated_document_ids: updatedDocIds,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[SessionCompletion] Error updating session documents:', error);
    }
  }

  /**
   * Add accepted ideas to main project as items
   */
  private async addIdeasToProject(
    projectId: string,
    acceptedIdeas: ExtractedIdea[],
    sessionId: string
  ): Promise<any[]> {
    if (acceptedIdeas.length === 0) {
      return [];
    }

    // Fetch current items
    const { data: project, error: fetchError } = await this.supabase
      .from('projects')
      .select('items')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch project: ${fetchError.message}`);
    }

    const currentItems = project?.items || [];

    // Convert ideas to project items
    // Per requirements: all accepted ideas default to "decided" state
    const newItems = acceptedIdeas.map(idea => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: `${idea.idea.title}: ${idea.idea.description}`,
      state: 'decided', // Default to decided per user requirement
      created_at: new Date().toISOString(),
      metadata: {
        fromBrainstorm: true,
        sessionId: sessionId,
        originalIdea: {
          id: idea.id,
          title: idea.idea.title,
          description: idea.idea.description,
          reasoning: idea.idea.reasoning,
          userIntent: idea.idea.userIntent,
          tags: idea.tags,
          innovationLevel: idea.innovationLevel,
          source: idea.source,
        },
        conversationContext: idea.conversationContext,
      },
    }));

    // Update project with new items
    const { error: updateError } = await this.supabase
      .from('projects')
      .update({
        items: [...currentItems, ...newItems],
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      throw new Error(`Failed to update project items: ${updateError.message}`);
    }

    return newItems;
  }

  /**
   * Update sandbox status to completed
   */
  private async updateSandboxStatus(
    sandboxId: string,
    sessionName: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sandbox_sessions')
      .update({
        status: 'saved_as_alternative', // Using existing status enum
        name: sessionName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sandboxId);

    if (error) {
      console.error('[SessionCompletion] Error updating sandbox status:', error);
      throw new Error(`Failed to update sandbox status: ${error.message}`);
    }
  }

  /**
   * Update conversation status to completed
   */
  private async updateConversationStatus(
    conversationId: string,
    finalDecisions: {
      accepted: ExtractedIdea[];
      rejected: ExtractedIdea[];
      unmarked?: ExtractedIdea[];
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sandbox_conversations')
      .update({
        session_status: 'completed',
        final_decisions: {
          accepted: finalDecisions.accepted.map(i => i.id),
          rejected: finalDecisions.rejected.map(i => i.id),
          unmarked: finalDecisions.unmarked?.map(i => i.id) || [],
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) {
      console.error('[SessionCompletion] Error updating conversation status:', error);
      throw new Error(`Failed to update conversation status: ${error.message}`);
    }
  }

  /**
   * Get session summary by ID (for display later)
   */
  async getSessionSummary(sessionId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    // Fetch associated documents
    const generatedDocIds = data.generated_document_ids || [];
    const updatedDocIds = data.updated_document_ids || [];

    const { data: generatedDocs } = await this.supabase
      .from('generated_documents')
      .select('id, title, document_type')
      .in('id', generatedDocIds);

    const { data: updatedDocs } = await this.supabase
      .from('generated_documents')
      .select('id, title, document_type, version')
      .in('id', updatedDocIds);

    return {
      ...data,
      generatedDocuments: generatedDocs || [],
      updatedDocuments: updatedDocs || [],
    };
  }

  /**
   * Get all sessions for a project
   */
  async getProjectSessions(projectId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch project sessions: ${error.message}`);
    }

    return data || [];
  }
}
