import { supabase } from './supabase';
import {
  UserSession,
  SessionAnalytics,
  SessionSummary,
  SuggestedStep,
  Blocker,
  ProjectState,
  ProjectItem
} from '../types';

/**
 * Session Service
 * Manages user sessions and provides analytics
 */
export class SessionService {
  /**
   * Start a new session for a user (only if no active session exists)
   */
  async startSession(userId: string, projectId: string): Promise<UserSession | null> {
    try {
      // Check if there's already an active session
      const { data: existingSession, error: checkError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();

      // Handle specific error for missing table
      if (checkError && checkError.code === '42P01') {
        console.error('[SessionService] ❌ ERROR: user_sessions table does not exist!');
        console.error('[SessionService] 📋 ACTION REQUIRED: Apply database migration');
        console.error('[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql in Supabase SQL Editor');
        console.error('[SessionService] 📖 See: SESSION_SETUP_GUIDE.md for instructions');
        return null;
      }

      // If there's an active session, return it (don't create a new one)
      if (existingSession) {
        console.log('[SessionService] ✅ Active session exists, reusing it:', existingSession.id);
        return existingSession;
      }

      console.log('[SessionService] 🆕 No active session, creating new one');

      // End any old sessions that might be stuck as active
      await this.endActiveSession(userId, projectId);

      // Get current project state for snapshot
      const { data: project } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      const snapshot = this.buildStateSnapshot(project?.items || []);

      // Create new session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          project_id: projectId,
          session_start: new Date().toISOString(),
          is_active: true,
          snapshot_at_start: snapshot
        })
        .select()
        .single();

      if (error) {
        // Handle specific error cases
        if (error.code === '42P01') {
          console.error('[SessionService] ❌ ERROR: user_sessions table does not exist!');
          console.error('[SessionService] 📋 ACTION REQUIRED: Apply database migration');
          console.error('[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql');
        } else {
          console.error('[SessionService] ❌ Error starting session:', error.message);
          console.error('[SessionService] Error code:', error.code);
          console.error('[SessionService] Error details:', error.details);
        }
        return null;
      }

      console.log('[SessionService] ✅ Session created successfully:', data.id);
      return data;
    } catch (error: any) {
      console.error('[SessionService] ❌ Unexpected error in startSession:', error.message || error);
      if (error.code) {
        console.error('[SessionService] Error code:', error.code);
      }
      return null;
    }
  }

  /**
   * End the current active session
   */
  async endActiveSession(userId: string, projectId: string): Promise<void> {
    try {
      // Get current project state for snapshot
      const { data: project } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      const snapshot = this.buildStateSnapshot(project?.items || []);

      // Update session with end time and final snapshot
      await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false,
          snapshot_at_end: snapshot
        })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('is_active', true);

      console.log('[SessionService] ✅ Session ended with snapshot captured');
    } catch (error) {
      console.error('Error ending active session:', error);
    }
  }

  /**
   * Get the current active session for a user and project
   */
  async getActiveSession(userId: string, projectId: string): Promise<UserSession | null> {
    try {
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();

      if (error) {
        // No active session found is expected, don't log as error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[SessionService] Error fetching active session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('[SessionService] Error in getActiveSession:', error);
      return null;
    }
  }

  /**
   * Get session summary using database function
   */
  async getSessionSummary(userId: string, projectId: string): Promise<SessionSummary | null> {
    try {
      // Call database function
      const { data, error } = await supabase
        .rpc('get_session_summary', {
          p_user_id: userId,
          p_project_id: projectId
        });

      if (error) {
        // Handle specific error cases
        if (error.code === '42P01') {
          console.error('[SessionService] ❌ ERROR: Session tables do not exist!');
          console.error('[SessionService] 📋 ACTION REQUIRED: Apply database migration');
          console.error('[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql');
        } else if (error.code === '42883') {
          console.error('[SessionService] ❌ ERROR: get_session_summary function does not exist!');
          console.error('[SessionService] 📋 ACTION REQUIRED: Apply database migration');
          console.error('[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql');
        } else {
          console.error('[SessionService] ❌ Error getting session summary:', error.message);
          console.error('[SessionService] Error code:', error.code);
        }
        return null;
      }

      // Get analytics data for suggested steps and blockers
      const analytics = await this.getOrCreateAnalytics(userId, projectId);

      // Get current project for live item counts
      const { data: project } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      const currentItems = project?.items || [];
      const currentDecided = currentItems.filter((i: any) => i.state === 'decided').length;
      const currentExploring = currentItems.filter((i: any) => i.state === 'exploring').length;
      const currentParked = currentItems.filter((i: any) => i.state === 'parked').length;

      // Combine data
      const summary: SessionSummary = {
        lastSession: data.lastsession || 'first session',
        itemsDecided: data.itemsdecided || 0,
        itemsExploring: data.itemsexploring || 0,
        itemsParked: data.itemsparked || 0,
        totalDecided: data.totaldecided || 0,
        // Add current live counts (not deltas)
        currentDecided,
        currentExploring,
        currentParked,
        totalItems: currentItems.length,
        pendingQuestions: analytics?.pending_questions || 0,
        suggestedNextSteps: analytics?.suggested_next_steps || [],
        activeBlockers: analytics?.active_blockers || []
      };

      return summary;
    } catch (error) {
      console.error('Error in getSessionSummary:', error);
      return null;
    }
  }

  /**
   * Get or create analytics record for user-project
   */
  async getOrCreateAnalytics(userId: string, projectId: string): Promise<SessionAnalytics | null> {
    try {
      // Try to get existing analytics
      const { data: existing } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single();

      if (existing) {
        return existing;
      }

      // Create new analytics record
      const { data, error } = await supabase
        .from('session_analytics')
        .insert({
          user_id: userId,
          project_id: projectId,
          last_activity: new Date().toISOString(),
          items_decided_since_last: 0,
          items_exploring: 0,
          items_parked: 0,
          pending_questions: 0,
          suggested_next_steps: [],
          active_blockers: []
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getOrCreateAnalytics:', error);
      return null;
    }
  }

  /**
   * Update session analytics with new activity
   */
  async updateAnalytics(
    userId: string,
    projectId: string,
    updates: {
      itemsDecidedSinceLast?: number;
      itemsExploring?: number;
      itemsParked?: number;
      pendingQuestions?: number;
      suggestedNextSteps?: SuggestedStep[];
      activeBlockers?: Blocker[];
    }
  ): Promise<void> {
    try {
      // Get current analytics
      const analytics = await this.getOrCreateAnalytics(userId, projectId);
      if (!analytics) return;

      // Build update object
      const updateData: any = {
        previous_activity: analytics.last_activity,
        last_activity: new Date().toISOString()
      };

      if (updates.itemsDecidedSinceLast !== undefined) {
        updateData.items_decided_since_last = updates.itemsDecidedSinceLast;
      }
      if (updates.itemsExploring !== undefined) {
        updateData.items_exploring = updates.itemsExploring;
      }
      if (updates.itemsParked !== undefined) {
        updateData.items_parked = updates.itemsParked;
      }
      if (updates.pendingQuestions !== undefined) {
        updateData.pending_questions = updates.pendingQuestions;
      }
      if (updates.suggestedNextSteps !== undefined) {
        updateData.suggested_next_steps = updates.suggestedNextSteps;
      }
      if (updates.activeBlockers !== undefined) {
        updateData.active_blockers = updates.activeBlockers;
      }

      await supabase
        .from('session_analytics')
        .update(updateData)
        .eq('user_id', userId)
        .eq('project_id', projectId);
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  /**
   * Generate suggested next steps based on project state
   */
  async generateSuggestedSteps(projectId: string): Promise<SuggestedStep[]> {
    try {
      // Get project data
      const { data: project } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (!project || !project.items) {
        return [];
      }

      const items = project.items as ProjectItem[];
      const suggestedSteps: SuggestedStep[] = [];

      // Analyze exploring items for high-priority decisions
      const exploringItems = items.filter(item => item.state === 'exploring');

      // Get messages to find pending questions
      const { data: messages } = await supabase
        .from('messages')
        .select('content, agent_type')
        .eq('project_id', projectId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(20);

      // Find questions from agents
      const questionMessages = messages?.filter(msg =>
        msg.agent_type === 'QuestionerAgent' ||
        msg.agent_type === 'ClarificationAgent'
      ) || [];

      // Add top exploring items as suggestions
      exploringItems.slice(0, 3).forEach((item, index) => {
        suggestedSteps.push({
          id: item.id,
          text: `Decide on: ${item.text}`,
          priority: index === 0 ? 'high' : 'medium',
          reason: 'Currently exploring',
          blocksOthers: false
        });
      });

      // Add pending questions as suggestions
      questionMessages.slice(0, 2).forEach(msg => {
        suggestedSteps.push({
          id: `question-${msg.agent_type}`,
          text: `Answer: ${msg.content.substring(0, 80)}...`,
          priority: 'high',
          reason: 'Pending clarification',
          blocksOthers: true
        });
      });

      return suggestedSteps;
    } catch (error) {
      console.error('Error generating suggested steps:', error);
      return [];
    }
  }

  /**
   * Detect active blockers in the project
   */
  async detectBlockers(projectId: string): Promise<Blocker[]> {
    try {
      // Get recent agent activity
      const { data: activities } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('project_id', projectId)
        .in('agent_type', ['GapDetectionAgent', 'ClarificationAgent', 'VerificationAgent'])
        .order('created_at', { ascending: false })
        .limit(10);

      const blockers: Blocker[] = [];

      // Analyze gap detection results
      const gapActivities = activities?.filter(a => a.agent_type === 'GapDetectionAgent') || [];
      gapActivities.forEach(activity => {
        if (activity.details?.gaps && activity.details.gaps.length > 0) {
          activity.details.gaps.forEach((gap: string) => {
            blockers.push({
              id: `gap-${activity.id}`,
              text: gap,
              type: 'information',
              blockedItems: []
            });
          });
        }
      });

      // Analyze clarification requests
      const clarificationActivities = activities?.filter(a => a.agent_type === 'ClarificationAgent') || [];
      clarificationActivities.forEach(activity => {
        if (activity.details?.question) {
          blockers.push({
            id: `clarification-${activity.id}`,
            text: activity.details.question,
            type: 'clarification',
            blockedItems: []
          });
        }
      });

      return blockers.slice(0, 5); // Return top 5 blockers
    } catch (error) {
      console.error('Error detecting blockers:', error);
      return [];
    }
  }

  /**
   * Build state snapshot from items
   */
  private buildStateSnapshot(items: ProjectItem[]): ProjectState {
    return {
      decided: items.filter(item => item.state === 'decided').map(item => ({
        id: item.id,
        text: item.text,
        created_at: item.created_at,
        metadata: item.metadata
      })),
      exploring: items.filter(item => item.state === 'exploring').map(item => ({
        id: item.id,
        text: item.text,
        created_at: item.created_at,
        metadata: item.metadata
      })),
      parked: items.filter(item => item.state === 'parked').map(item => ({
        id: item.id,
        text: item.text,
        created_at: item.created_at,
        metadata: item.metadata
      }))
    };
  }

  /**
   * Track user activity (call this on every user action)
   */
  async trackActivity(userId: string, projectId: string): Promise<void> {
    try {
      // Update or create analytics with new activity timestamp
      const analytics = await this.getOrCreateAnalytics(userId, projectId);
      if (!analytics) return;

      await supabase
        .from('session_analytics')
        .update({
          previous_activity: analytics.last_activity,
          last_activity: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('project_id', projectId);

      // Generate and update suggested steps and blockers
      const suggestedSteps = await this.generateSuggestedSteps(projectId);
      const blockers = await this.detectBlockers(projectId);

      // Get current project state counts
      const { data: project } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (project && project.items) {
        const items = project.items as ProjectItem[];
        const exploringCount = items.filter(item => item.state === 'exploring').length;
        const parkedCount = items.filter(item => item.state === 'parked').length;

        // Count pending questions from recent messages
        const { data: messages } = await supabase
          .from('messages')
          .select('agent_type')
          .eq('project_id', projectId)
          .eq('role', 'assistant')
          .in('agent_type', ['QuestionerAgent', 'ClarificationAgent'])
          .order('created_at', { ascending: false })
          .limit(10);

        await this.updateAnalytics(userId, projectId, {
          itemsExploring: exploringCount,
          itemsParked: parkedCount,
          pendingQuestions: messages?.length || 0,
          suggestedNextSteps: suggestedSteps,
          activeBlockers: blockers
        });
      }
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }
}

export const sessionService = new SessionService();
