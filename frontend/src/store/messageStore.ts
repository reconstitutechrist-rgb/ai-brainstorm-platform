import { create } from 'zustand';
import { Message } from '../types';

interface MessageState {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;

  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTyping: (typing: boolean) => void;

  // Helpers
  getMessagesByProject: (projectId: string) => Message[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  error: null,
  isTyping: false,

  // Actions
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  addMessages: (newMessages) =>
    set((state) => ({ messages: [...state.messages, ...newMessages] })),

  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setTyping: (typing) => set({ isTyping: typing }),

  // Helpers
  getMessagesByProject: (projectId) => {
    return get().messages.filter((msg) => msg.project_id === projectId);
  },
}));
