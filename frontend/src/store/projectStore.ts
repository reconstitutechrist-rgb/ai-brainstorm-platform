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
}));
