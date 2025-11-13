import { create } from 'zustand';

export interface AgentMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: string;
  messageId?: string; // Reference to main chat message
}

export interface AgentWindow {
  agentType: string;
  state: 'open' | 'minimized' | 'closed';
  thread: AgentMessage[];
  pendingQuestions: number;
  lastQuestionId?: string;
}

interface AgentStoreState {
  // Active agent windows
  agentWindows: Record<string, AgentWindow>;

  // Actions
  openAgentWindow: (agentType: string) => void;
  closeAgentWindow: (agentType: string) => void;
  minimizeAgentWindow: (agentType: string) => void;
  restoreAgentWindow: (agentType: string) => void;

  addAgentQuestion: (agentType: string, message: AgentMessage) => void;
  addUserResponse: (agentType: string, message: AgentMessage) => void;
  markQuestionAnswered: (agentType: string) => void;

  getActiveAgents: () => string[];
  getAgentWithMostQuestions: () => string | null;
  clearAllWindows: () => void;
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  agentWindows: {},

  openAgentWindow: (agentType: string) => {
    set((state) => ({
      agentWindows: {
        ...state.agentWindows,
        [agentType]: {
          ...(state.agentWindows[agentType] || {
            agentType,
            thread: [],
            pendingQuestions: 0,
          }),
          state: 'open',
        },
      },
    }));
  },

  closeAgentWindow: (agentType: string) => {
    set((state) => {
      const newWindows = { ...state.agentWindows };
      delete newWindows[agentType];
      return { agentWindows: newWindows };
    });
  },

  minimizeAgentWindow: (agentType: string) => {
    set((state) => ({
      agentWindows: {
        ...state.agentWindows,
        [agentType]: {
          ...state.agentWindows[agentType],
          state: 'minimized',
        },
      },
    }));
  },

  restoreAgentWindow: (agentType: string) => {
    set((state) => ({
      agentWindows: {
        ...state.agentWindows,
        [agentType]: {
          ...state.agentWindows[agentType],
          state: 'open',
        },
      },
    }));
  },

  addAgentQuestion: (agentType: string, message: AgentMessage) => {
    set((state) => {
      const existingWindow = state.agentWindows[agentType];
      const thread = existingWindow ? [...existingWindow.thread, message] : [message];
      const pendingQuestions = existingWindow
        ? existingWindow.pendingQuestions + 1
        : 1;

      return {
        agentWindows: {
          ...state.agentWindows,
          [agentType]: {
            agentType,
            state: existingWindow?.state || 'minimized', // Start minimized (as bubble)
            thread,
            pendingQuestions,
            lastQuestionId: message.id,
          },
        },
      };
    });
  },

  addUserResponse: (agentType: string, message: AgentMessage) => {
    set((state) => {
      const existingWindow = state.agentWindows[agentType];
      if (!existingWindow) return state;

      return {
        agentWindows: {
          ...state.agentWindows,
          [agentType]: {
            ...existingWindow,
            thread: [...existingWindow.thread, message],
          },
        },
      };
    });
  },

  markQuestionAnswered: (agentType: string) => {
    set((state) => {
      const existingWindow = state.agentWindows[agentType];
      if (!existingWindow) return state;

      const newPendingCount = Math.max(0, existingWindow.pendingQuestions - 1);

      // If no more pending questions, minimize the window after a delay
      if (newPendingCount === 0) {
        setTimeout(() => {
          get().minimizeAgentWindow(agentType);
        }, 3000); // Auto-minimize after 3 seconds
      }

      return {
        agentWindows: {
          ...state.agentWindows,
          [agentType]: {
            ...existingWindow,
            pendingQuestions: newPendingCount,
          },
        },
      };
    });
  },

  getActiveAgents: () => {
    const { agentWindows } = get();
    return Object.keys(agentWindows).filter(
      (agentType) => agentWindows[agentType].pendingQuestions > 0
    );
  },

  getAgentWithMostQuestions: () => {
    const { agentWindows } = get();
    let maxQuestions = 0;
    let agentWithMost: string | null = null;

    Object.keys(agentWindows).forEach((agentType) => {
      const questions = agentWindows[agentType].pendingQuestions;
      if (questions > maxQuestions) {
        maxQuestions = questions;
        agentWithMost = agentType;
      }
    });

    return agentWithMost;
  },

  clearAllWindows: () => {
    set({ agentWindows: {} });
  },
}));
