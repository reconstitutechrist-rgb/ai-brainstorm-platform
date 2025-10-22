import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';

/**
 * Custom hook to refresh project data from the server
 * Eliminates duplicate refresh logic in ChatPage
 */
export const useProjectRefresh = () => {
  return useCallback(async (projectId: string, _userId: string) => {
    try {
      console.log('[useProjectRefresh] Starting refresh for project:', projectId);
      const { projectsApi } = await import('../services/api');
      // FIX: Fetch the specific project directly instead of filtering from user's project list
      // This ensures we get fresh data from the database, not potentially cached/stale list
      const projectResponse = await projectsApi.getById(projectId);

      console.log('[useProjectRefresh] API Response:', {
        success: projectResponse.success,
        itemsCount: projectResponse.project?.items?.length || 0,
        decidedCount: projectResponse.project?.items?.filter((i: any) => i.state === 'decided').length || 0,
        exploringCount: projectResponse.project?.items?.filter((i: any) => i.state === 'exploring').length || 0,
      });

      if (projectResponse.success && projectResponse.project) {
        console.log(`[useProjectRefresh] Setting currentProject with ${projectResponse.project.items?.length || 0} items`);
        useProjectStore.getState().setCurrentProject(projectResponse.project);
        console.log('[useProjectRefresh] Project set successfully');
      }
    } catch (err) {
      console.error('[useProjectRefresh] Failed to refresh project data:', err);
    }
  }, []);
};
