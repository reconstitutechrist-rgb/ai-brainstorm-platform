import { create } from 'zustand';
import type { Message } from '../types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  activeAgents: string[];
  currentProjectId: string | null;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setIsTyping: (isTyping: boolean) => void;
  setActiveAgents: (agents: string[]) => void;
  setCurrentProject: (projectId: string | null) => void;
  clearProjectMessages: () => void;
}

// Create separate store instances per project to avoid localStorage conflicts
// We'll manage project-specific state in memory only
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  activeAgents: [],
  currentProjectId: null,
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  addMessages: (messages) => set((state) => ({
    messages: [...state.messages, ...messages]
  })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], isTyping: false, activeAgents: [] }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setActiveAgents: (agents) => set({ activeAgents: agents }),
  setCurrentProject: (projectId) => set((state) => {
    // When switching projects, clear messages if project changed
    if (state.currentProjectId !== projectId) {
      return {
        currentProjectId: projectId,
        messages: [],
        isTyping: false,
        activeAgents: []
      };
    }
    return { currentProjectId: projectId };
  }),
  clearProjectMessages: () => set({ messages: [], isTyping: false, activeAgents: [] }),
}));
