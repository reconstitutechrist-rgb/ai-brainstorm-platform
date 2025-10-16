import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isCreateProjectModalOpen: boolean;
  isUploadModalOpen: boolean;
  selectedReference: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  setSelectedReference: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isCreateProjectModalOpen: false,
  isUploadModalOpen: false,
  selectedReference: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  openCreateProjectModal: () => set({ isCreateProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ isCreateProjectModalOpen: false }),
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
  setSelectedReference: (id) => set({ selectedReference: id }),
}));
