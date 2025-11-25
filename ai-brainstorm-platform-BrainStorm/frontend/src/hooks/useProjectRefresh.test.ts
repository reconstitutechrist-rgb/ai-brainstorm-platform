import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectRefresh } from './useProjectRefresh';
import { useProjectStore } from '../store/projectStore';

// Mock the API
vi.mock('../services/api', () => ({
  projectsApi: {
    getAll: vi.fn(),
  },
}));

describe('useProjectRefresh', () => {
  const mockProjectId = 'project-123';
  const mockUserId = 'user-456';
  const mockProject = {
    id: mockProjectId,
    title: 'Test Project',
    description: 'Test Description',
    user_id: mockUserId,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ currentProject: null, projects: [] });
  });

  it('should refresh project data successfully', async () => {
    const { projectsApi } = await import('../services/api');
    vi.mocked(projectsApi.getAll).mockResolvedValue({
      success: true,
      projects: [mockProject],
    });

    const { result } = renderHook(() => useProjectRefresh());
    const refreshProject = result.current;

    await refreshProject(mockProjectId, mockUserId);

    await waitFor(() => {
      const state = useProjectStore.getState();
      expect(state.currentProject).toEqual(mockProject);
    });

    expect(projectsApi.getAll).toHaveBeenCalledWith(mockUserId);
    expect(projectsApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('should handle project not found', async () => {
    const { projectsApi } = await import('../services/api');
    vi.mocked(projectsApi.getAll).mockResolvedValue({
      success: true,
      projects: [],
    });

    const { result } = renderHook(() => useProjectRefresh());
    const refreshProject = result.current;

    await refreshProject(mockProjectId, mockUserId);

    await waitFor(() => {
      const state = useProjectStore.getState();
      expect(state.currentProject).toBeNull();
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { projectsApi } = await import('../services/api');
    vi.mocked(projectsApi.getAll).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useProjectRefresh());
    const refreshProject = result.current;

    await refreshProject(mockProjectId, mockUserId);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh project data:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should be memoized and stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useProjectRefresh());
    const firstReference = result.current;

    rerender();

    expect(result.current).toBe(firstReference);
  });
});
