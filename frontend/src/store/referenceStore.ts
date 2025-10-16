import { create } from 'zustand';
import type { Reference } from '../types';

interface ReferenceState {
  // State
  references: Reference[];
  isLoading: boolean;
  error: string | null;
  uploadProgress: number;

  // Actions
  setReferences: (references: Reference[]) => void;
  addReference: (reference: Reference) => void;
  updateReference: (referenceId: string, updates: Partial<Reference>) => void;
  deleteReference: (referenceId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUploadProgress: (progress: number) => void;

  // Helpers
  getReferencesByProject: (projectId: string) => Reference[];
  getReferencesByType: (type: string) => Reference[];
}

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  // Initial state
  references: [],
  isLoading: false,
  error: null,
  uploadProgress: 0,

  // Actions
  setReferences: (references) => set({ references }),

  addReference: (reference) =>
    set((state) => ({ references: [reference, ...state.references] })),

  updateReference: (referenceId, updates) =>
    set((state) => ({
      references: state.references.map((ref) =>
        ref.id === referenceId ? { ...ref, ...updates } : ref
      ),
    })),

  deleteReference: (referenceId) =>
    set((state) => ({
      references: state.references.filter((ref) => ref.id !== referenceId),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  // Helpers
  getReferencesByProject: (projectId) => {
    return get().references.filter((ref) => ref.project_id === projectId);
  },

  getReferencesByType: (type) => {
    return get().references.filter((ref) => ref.metadata?.type === type);
  },
}));
