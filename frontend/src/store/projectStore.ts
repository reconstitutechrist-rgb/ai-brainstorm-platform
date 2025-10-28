import { create } from 'zustand';
import type { Project } from '../types';
import { canvasApi } from '../services/api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  selectedCardIds: Set<string>;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // Canvas-specific actions
  updateItemPosition: (itemId: string, position: { x: number; y: number }) => void;
  updateItemFields: (itemId: string, fields: Partial<import('../types').ProjectItem>) => void;
  toggleItemArchive: (itemId: string) => Promise<void>;
  archiveMultipleItems: (itemIds: string[]) => Promise<void>;
  // Selection actions
  toggleCardSelection: (itemId: string) => void;
  selectAllCards: () => void;
  clearSelection: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  selectedCardIds: new Set<string>(),
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({
    projects: [project, ...state.projects]
  })),
  updateProject: (projectId, updates) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === projectId ? { ...p, ...updates } : p
    ),
    currentProject: state.currentProject?.id === projectId
      ? { ...state.currentProject, ...updates }
      : state.currentProject,
  })),
  deleteProject: (projectId) => set((state) => ({
    projects: state.projects.filter(p => p.id !== projectId),
    currentProject: state.currentProject?.id === projectId
      ? null
      : state.currentProject,
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Canvas-specific action implementations
  updateItemPosition: (itemId, position) => set((state) => {
    if (!state.currentProject) return state;

    const updatedItems = state.currentProject.items.map(item =>
      item.id === itemId ? { ...item, position } : item
    );

    const updatedProject = { ...state.currentProject, items: updatedItems };

    return {
      currentProject: updatedProject,
      projects: state.projects.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      ),
    };
  }),

  updateItemFields: (itemId, fields) => set((state) => {
    if (!state.currentProject) return state;

    const updatedItems = state.currentProject.items.map(item =>
      item.id === itemId ? { ...item, ...fields } : item
    );

    const updatedProject = { ...state.currentProject, items: updatedItems };

    return {
      currentProject: updatedProject,
      projects: state.projects.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      ),
    };
  }),

  toggleItemArchive: async (itemId) => {
    const state = get();
    if (!state.currentProject) return;

    // Optimistic update
    const item = state.currentProject.items.find(i => i.id === itemId);
    if (!item) return;

    const willBeArchived = !item.isArchived;

    set((state) => {
      if (!state.currentProject) return state;

      const updatedItems = state.currentProject.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              isArchived: willBeArchived,
              archivedAt: willBeArchived ? new Date().toISOString() : undefined,
            }
          : item
      );

      const updatedProject = { ...state.currentProject, items: updatedItems };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
      };
    });

    // Persist to backend
    try {
      if (willBeArchived) {
        await canvasApi.archiveCards(state.currentProject.id, [itemId]);
      } else {
        await canvasApi.restoreCards(state.currentProject.id, [itemId]);
      }
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      // Revert optimistic update on error
      set((state) => {
        if (!state.currentProject) return state;

        const updatedItems = state.currentProject.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                isArchived: !willBeArchived,
                archivedAt: !willBeArchived ? new Date().toISOString() : undefined,
              }
            : item
        );

        const updatedProject = { ...state.currentProject, items: updatedItems };

        return {
          currentProject: updatedProject,
          projects: state.projects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          ),
        };
      });
      throw error;
    }
  },

  archiveMultipleItems: async (itemIds) => {
    const state = get();
    if (!state.currentProject || itemIds.length === 0) return;

    // Optimistic update
    set((state) => {
      if (!state.currentProject) return state;

      const updatedItems = state.currentProject.items.map(item =>
        itemIds.includes(item.id)
          ? {
              ...item,
              isArchived: true,
              archivedAt: new Date().toISOString(),
            }
          : item
      );

      const updatedProject = { ...state.currentProject, items: updatedItems };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
        selectedCardIds: new Set<string>(), // Clear selection after archiving
      };
    });

    // Persist to backend
    try {
      await canvasApi.archiveCards(state.currentProject.id, itemIds);
    } catch (error) {
      console.error('Failed to archive items:', error);
      // Revert optimistic update on error
      set((state) => {
        if (!state.currentProject) return state;

        const updatedItems = state.currentProject.items.map(item =>
          itemIds.includes(item.id)
            ? {
                ...item,
                isArchived: false,
                archivedAt: undefined,
              }
            : item
        );

        const updatedProject = { ...state.currentProject, items: updatedItems };

        return {
          currentProject: updatedProject,
          projects: state.projects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          ),
        };
      });
      throw error;
    }
  },

  // Selection actions
  toggleCardSelection: (itemId) => set((state) => {
    const newSelection = new Set(state.selectedCardIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    return { selectedCardIds: newSelection };
  }),

  selectAllCards: () => set((state) => {
    if (!state.currentProject) return state;

    const visibleCardIds = state.currentProject.items
      .filter(item => !item.isArchived)
      .map(item => item.id);

    return { selectedCardIds: new Set(visibleCardIds) };
  }),

  clearSelection: () => set({ selectedCardIds: new Set<string>() }),
}));
