import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';

/**
 * Custom hook to refresh project data from the server
 * Eliminates duplicate refresh logic in ChatPage
 */
export const useProjectRefresh = () => {
  return useCallback(async (projectId: string, userId: string) => {
    try {
      const { projectsApi } = await import('../services/api');
      const projectsResponse = await projectsApi.getByUserId(userId);

      if (projectsResponse.success) {
        const updatedProject = projectsResponse.projects.find(p => p.id === projectId);
        if (updatedProject) {
          useProjectStore.getState().setCurrentProject(updatedProject);
        }
      }
    } catch (err) {
      console.error('Failed to refresh project data:', err);
    }
  }, []);
};
