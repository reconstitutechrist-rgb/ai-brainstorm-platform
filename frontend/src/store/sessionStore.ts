import { create } from 'zustand';
import { sessionsApi } from '../services/api';
import type { SessionSummary, SuggestedStep, Blocker } from '../types';

interface SessionState {
  // State
  sessionSummary: SessionSummary | null;
  suggestedSteps: SuggestedStep[];
  blockers: Blocker[];
  isLoading: boolean;
  error: string | null;
  inactivityTimer: NodeJS.Timeout | null;

  // Actions
  loadSessionSummary: (userId: string, projectId: string) => Promise<void>;
  loadSuggestedSteps: (projectId: string) => Promise<void>;
  loadBlockers: (projectId: string) => Promise<void>;
  loadAllSessionData: (userId: string, projectId: string) => Promise<void>;
  startSession: (userId: string, projectId: string) => Promise<void>;
  endSession: (userId: string, projectId: string) => Promise<void>;
  trackActivity: (userId: string, projectId: string) => void;
  clearSessionData: () => void;
  startInactivityTimer: (userId: string, projectId: string) => void;
  resetInactivityTimer: (userId: string, projectId: string) => void;
  clearInactivityTimer: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessionSummary: null,
  suggestedSteps: [],
  blockers: [],
  isLoading: false,
  error: null,
  inactivityTimer: null,

  // Load session summary
  loadSessionSummary: async (userId: string, projectId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await sessionsApi.getSummary(userId, projectId);

      if (response.success && response.data) {
        set({
          sessionSummary: response.data,
          isLoading: false
        });
      } else {
        set({
          error: 'Failed to load session summary',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading session summary:', error);
      set({
        error: 'Failed to load session summary',
        isLoading: false
      });
    }
  },

  // Load suggested steps
  loadSuggestedSteps: async (projectId: string) => {
    try {
      const response = await sessionsApi.getSuggestedSteps(projectId);

      if (response.success && response.data) {
        set({ suggestedSteps: response.data });
      }
    } catch (error) {
      console.error('Error loading suggested steps:', error);
    }
  },

  // Load blockers
  loadBlockers: async (projectId: string) => {
    try {
      const response = await sessionsApi.getBlockers(projectId);

      if (response.success && response.data) {
        set({ blockers: response.data });
      }
    } catch (error) {
      console.error('Error loading blockers:', error);
    }
  },

  // Load all session data at once
  loadAllSessionData: async (userId: string, projectId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Load all session data in parallel
      const [summaryResponse, stepsResponse, blockersResponse] = await Promise.all([
        sessionsApi.getSummary(userId, projectId),
        sessionsApi.getSuggestedSteps(projectId),
        sessionsApi.getBlockers(projectId)
      ]);

      set({
        sessionSummary: summaryResponse.success ? summaryResponse.data : null,
        suggestedSteps: stepsResponse.success ? stepsResponse.data : [],
        blockers: blockersResponse.success ? blockersResponse.data : [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading session data:', error);
      set({
        error: 'Failed to load session data',
        isLoading: false
      });
    }
  },

  // Start a new session
  startSession: async (userId: string, projectId: string) => {
    try {
      await sessionsApi.startSession(userId, projectId);

      // Load fresh session data
      const { loadAllSessionData, startInactivityTimer } = useSessionStore.getState();
      await loadAllSessionData(userId, projectId);

      // Start inactivity timer
      startInactivityTimer(userId, projectId);
    } catch (error) {
      console.error('Error starting session:', error);
      set({ error: 'Failed to start session' });
    }
  },

  // End the current session
  endSession: async (userId: string, projectId: string) => {
    try {
      await sessionsApi.endSession(userId, projectId);

      // Clear inactivity timer
      const { clearInactivityTimer } = get();
      clearInactivityTimer();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  },

  // Track user activity (fire and forget)
  trackActivity: (userId: string, projectId: string) => {
    // This is a fire-and-forget operation, don't wait for response
    sessionsApi.trackActivity(userId, projectId);
  },

  // Clear session data (useful on logout or project switch)
  clearSessionData: () => {
    set({
      sessionSummary: null,
      suggestedSteps: [],
      blockers: [],
      isLoading: false,
      error: null
    });
  },

  // Start inactivity timer (ends session after 30 minutes of no activity)
  startInactivityTimer: (userId: string, projectId: string) => {
    const { clearInactivityTimer, endSession } = get();

    // Clear any existing timer
    clearInactivityTimer();

    // Set new timer for 30 minutes (1800000 ms)
    const timer = setTimeout(() => {
      console.log('[SessionStore] Session ended due to inactivity');
      endSession(userId, projectId);
    }, 30 * 60 * 1000);

    set({ inactivityTimer: timer });
  },

  // Reset inactivity timer (call this on any user activity)
  resetInactivityTimer: (userId: string, projectId: string) => {
    const { startInactivityTimer } = get();
    startInactivityTimer(userId, projectId);
  },

  // Clear the inactivity timer
  clearInactivityTimer: () => {
    const { inactivityTimer } = get();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      set({ inactivityTimer: null });
    }
  }
}));