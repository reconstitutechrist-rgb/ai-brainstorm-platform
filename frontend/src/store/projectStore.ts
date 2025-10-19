import { create } from 'zustand';
import type { Project } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
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
  toggleItemArchive: (itemId: string) => void;
  archiveMultipleItems: (itemIds: string[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
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

  toggleItemArchive: (itemId) => set((state) => {
    if (!state.currentProject) return state;

    const updatedItems = state.currentProject.items.map(item =>
      item.id === itemId
        ? {
            ...item,
            isArchived: !item.isArchived,
            archivedAt: !item.isArchived ? new Date().toISOString() : undefined,
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
  }),

  archiveMultipleItems: (itemIds) => set((state) => {
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
    };
  }),
}));
