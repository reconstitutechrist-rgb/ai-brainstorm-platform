import { supabase } from './supabase';

interface ActivityDetails {
  [key: string]: any;
}

export class ActivityLogger {
  /**
   * Log an agent activity to the database
   */
  async logActivity(
    projectId: string,
    agentType: string,
    action: string,
    details: ActivityDetails
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_activity')
        .insert([
          {
            project_id: projectId,
            agent_type: agentType,
            action: action,
            details: details,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw - activity logging should not break the main flow
    }
  }

  /**
   * Get activity logs for a specific project
   */
  async getProjectActivity(
    projectId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Get activity error:', error);
      return [];
    }
  }

  /**
   * Get activity logs by agent type
   */
  async getActivityByAgentType(
    projectId: string,
    agentType: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('project_id', projectId)
        .eq('agent_type', agentType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Get activity by agent type error:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for a project
   */
  async getActivityStats(projectId: string): Promise<{
    totalActivities: number;
    activitiesByAgent: Record<string, number>;
    activitiesByAction: Record<string, number>;
    recentActivityCount: number;
  }> {
    try {
      // Get all activities for the project
      const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        throw error;
      }

      const activities = data || [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count by agent type
      const activitiesByAgent: Record<string, number> = {};
      const activitiesByAction: Record<string, number> = {};
      let recentActivityCount = 0;

      activities.forEach((activity) => {
        // Count by agent
        activitiesByAgent[activity.agent_type] =
          (activitiesByAgent[activity.agent_type] || 0) + 1;

        // Count by action
        activitiesByAction[activity.action] =
          (activitiesByAction[activity.action] || 0) + 1;

        // Count recent activities (last 24 hours)
        const activityDate = new Date(activity.created_at);
        if (activityDate >= last24Hours) {
          recentActivityCount++;
        }
      });

      return {
        totalActivities: activities.length,
        activitiesByAgent,
        activitiesByAction,
        recentActivityCount,
      };
    } catch (error) {
      console.error('Get activity stats error:', error);
      return {
        totalActivities: 0,
        activitiesByAgent: {},
        activitiesByAction: {},
        recentActivityCount: 0,
      };
    }
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('agent_activity')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Cleanup old activities error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();