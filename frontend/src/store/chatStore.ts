import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '../types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  activeAgents: string[];
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setIsTyping: (isTyping: boolean) => void;
  setActiveAgents: (agents: string[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isTyping: false,
      activeAgents: [],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      addMessages: (messages) => set((state) => ({
        messages: [...state.messages, ...messages]
      })),
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
      setIsTyping: (isTyping) => set({ isTyping }),
      setActiveAgents: (agents) => set({ activeAgents: agents }),
    }),
    {
      name: 'chat-storage', // unique name for localStorage key
      // Only persist messages, not transient UI state
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
