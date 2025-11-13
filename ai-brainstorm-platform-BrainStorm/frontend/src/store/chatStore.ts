import { create } from 'zustand';
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

// Use server-side persistence only - no localStorage
// Messages are loaded from the backend per project in ChatPage
export const useChatStore = create<ChatState>((set) => ({
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
  clearMessages: () => set({ messages: [], isTyping: false, activeAgents: [] }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setActiveAgents: (agents) => set({ activeAgents: agents }),
}));
