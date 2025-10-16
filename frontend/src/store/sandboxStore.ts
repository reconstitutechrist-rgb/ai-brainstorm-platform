import { create } from 'zustand';

interface SandboxState {
  isActive: boolean;
  sandboxId: string | null;
  enterSandbox: () => void;
  exitSandbox: () => void;
  setSandboxId: (id: string | null) => void;
}

export const useSandboxStore = create<SandboxState>()((set) => ({
  isActive: false,
  sandboxId: null,
  enterSandbox: () => set({ isActive: true }),
  exitSandbox: () => set({ isActive: false, sandboxId: null }),
  setSandboxId: (id) => set({ sandboxId: id }),
}));
