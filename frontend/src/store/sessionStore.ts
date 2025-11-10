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
  currentSession: { id: string; session_start: string } | null; // Track current active session
  isSessionActive: boolean;

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
  currentSession: null,
  isSessionActive: false,

  // Load session summary
  loadSessionSummary: async (userId: string, projectId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await sessionsApi.getSummary(userId, projectId);

      if (response.success && response.data) {
        set({
          sessionSummary: response.data,
          isLoading: false,
          error: null
        });
      } else {
        console.warn('[SessionStore] ⚠️ Session summary load failed, data may not be available yet');
        set({
          error: null, // Don't show error for missing data - this is expected for new projects
          isLoading: false
        });
      }
    } catch (error: any) {
      console.error('[SessionStore] ❌ Error loading session summary:', error);

      // Only show user-facing error for actual errors, not missing data
      const isSetupError = error.response?.status === 500 ||
                          error.message?.includes('table') ||
                          error.message?.includes('function');

      set({
        error: isSetupError
          ? 'Session data unavailable. Database setup may be required - see SESSION_SETUP_GUIDE.md'
          : null,
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
      console.log('[SessionStore] Starting session...');
      const response = await sessionsApi.startSession(userId, projectId);

      // Check if session was actually created
      if (!response.success || !response.data) {
        console.error('[SessionStore] ❌ Session start failed - no data returned');
        set({
          error: '⚠️ Session could not be started. The database may need to be set up. Check the console for details.'
        });
        return;
      }

      console.log('[SessionStore] ✅ Session started successfully', response.data);

      // Set current session data
      set({
        currentSession: {
          id: response.data.id,
          session_start: response.data.session_start
        },
        isSessionActive: true
      });

      // Load fresh session data
      const { loadAllSessionData, startInactivityTimer } = useSessionStore.getState();
      await loadAllSessionData(userId, projectId);

      // Start inactivity timer
      startInactivityTimer(userId, projectId);
    } catch (error: any) {
      console.error('[SessionStore] ❌ Error starting session:', error);

      // Provide user-friendly error message
      let errorMessage = 'Failed to start session. ';

      if (error.response?.status === 500) {
        errorMessage += 'The database may need to be set up. Please check SESSION_SETUP_GUIDE.md.';
      } else if (error.message?.includes('table')) {
        errorMessage += 'Session tables may be missing from the database.';
      } else {
        errorMessage += 'Please try again or contact support.';
      }

      set({ error: errorMessage });
    }
  },

  // End the current session
  endSession: async (userId: string, projectId: string) => {
    try {
      await sessionsApi.endSession(userId, projectId);

      // Clear session state
      set({
        currentSession: null,
        isSessionActive: false
      });

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
      error: null,
      currentSession: null,
      isSessionActive: false
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
