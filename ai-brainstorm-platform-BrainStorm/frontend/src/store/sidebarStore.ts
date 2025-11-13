import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  // Desktop: collapsed state (240px expanded, 80px collapsed)
  isCollapsed: boolean;

  // Mobile: open/closed state (overlay mode)
  isMobileOpen: boolean;

  // Actions
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleMobileOpen: () => void;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      // Default: expanded on desktop, closed on mobile
      isCollapsed: false,
      isMobileOpen: false,

      toggleCollapsed: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed })),

      setCollapsed: (collapsed) =>
        set({ isCollapsed: collapsed }),

      toggleMobileOpen: () =>
        set((state) => ({ isMobileOpen: !state.isMobileOpen })),

      setMobileOpen: (open) =>
        set({ isMobileOpen: open }),

      closeMobile: () =>
        set({ isMobileOpen: false }),
    }),
    {
      name: 'sidebar-storage', // localStorage key
      // Only persist desktop collapse state, not mobile open state
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);
