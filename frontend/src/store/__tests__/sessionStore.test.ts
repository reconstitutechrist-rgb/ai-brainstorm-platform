import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSessionStore } from '../sessionStore';
import { sessionsApi } from '../../services/api';

// Mock the sessionsApi
vi.mock('../../services/api', () => ({
  sessionsApi: {
    getSummary: vi.fn(),
    getSuggestedSteps: vi.fn(),
    getBlockers: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    trackActivity: vi.fn(),
  },
}));

describe('SessionStore', () => {
  const mockUserId = 'user-123';
  const mockProjectId = 'project-456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset store state
    useSessionStore.setState({
      sessionSummary: null,
      suggestedSteps: [],
      blockers: [],
      isLoading: false,
      error: null,
      inactivityTimer: null,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('loadSessionSummary', () => {
    it('should load session summary successfully', async () => {
      const mockSummary = {
        lastSession: 'Session-20250120-100000',
        sessionNumber: 5,
        totalSessions: 10,
        decisionsCount: 3,
        exploringCount: 2,
        parkedCount: 1,
      };

      (sessionsApi.getSummary as any).mockResolvedValue({
        success: true,
        data: mockSummary,
      });

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.sessionSummary).toEqual(mockSummary);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle missing session data gracefully', async () => {
      (sessionsApi.getSummary as any).mockResolvedValue({
        success: false,
        data: null,
      });

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.sessionSummary).toBeNull();
      expect(state.error).toBeNull(); // Should not show error for missing data
      expect(state.isLoading).toBe(false);
    });

    it('should handle database setup errors', async () => {
      const dbError = new Error('table does not exist');
      (dbError as any).response = { status: 500 };

      (sessionsApi.getSummary as any).mockRejectedValue(dbError);

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toContain('Database setup may be required');
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (sessionsApi.getSummary as any).mockReturnValue(promise);

      const { loadSessionSummary } = useSessionStore.getState();
      const loadPromise = loadSessionSummary(mockUserId, mockProjectId);

      // Check loading state is true
      expect(useSessionStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolvePromise({ success: true, data: {} });
      await loadPromise;

      // Check loading state is false
      expect(useSessionStore.getState().isLoading).toBe(false);
    });
  });

  describe('loadSuggestedSteps', () => {
    it('should load suggested steps successfully', async () => {
      const mockSteps = [
        { id: '1', text: 'Review authentication', priority: 'high' },
        { id: '2', text: 'Update documentation', priority: 'medium' },
      ];

      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({
        success: true,
        data: mockSteps,
      });

      const { loadSuggestedSteps } = useSessionStore.getState();
      await loadSuggestedSteps(mockProjectId);

      const state = useSessionStore.getState();
      expect(state.suggestedSteps).toEqual(mockSteps);
    });

    it('should handle errors silently', async () => {
      (sessionsApi.getSuggestedSteps as any).mockRejectedValue(new Error('Network error'));

      const { loadSuggestedSteps } = useSessionStore.getState();
      await loadSuggestedSteps(mockProjectId);

      const state = useSessionStore.getState();
      expect(state.suggestedSteps).toEqual([]);
    });
  });

  describe('loadBlockers', () => {
    it('should load blockers successfully', async () => {
      const mockBlockers = [
        { id: '1', description: 'API rate limit', severity: 'high' },
        { id: '2', description: 'Missing dependencies', severity: 'medium' },
      ];

      (sessionsApi.getBlockers as any).mockResolvedValue({
        success: true,
        data: mockBlockers,
      });

      const { loadBlockers } = useSessionStore.getState();
      await loadBlockers(mockProjectId);

      const state = useSessionStore.getState();
      expect(state.blockers).toEqual(mockBlockers);
    });

    it('should handle errors silently', async () => {
      (sessionsApi.getBlockers as any).mockRejectedValue(new Error('Network error'));

      const { loadBlockers } = useSessionStore.getState();
      await loadBlockers(mockProjectId);

      const state = useSessionStore.getState();
      expect(state.blockers).toEqual([]);
    });
  });

  describe('loadAllSessionData', () => {
    it('should load all session data in parallel', async () => {
      const mockSummary = { lastSession: 'Session-1', sessionNumber: 1 };
      const mockSteps = [{ id: '1', text: 'Step 1' }];
      const mockBlockers = [{ id: '1', description: 'Blocker 1' }];

      (sessionsApi.getSummary as any).mockResolvedValue({ success: true, data: mockSummary });
      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({ success: true, data: mockSteps });
      (sessionsApi.getBlockers as any).mockResolvedValue({ success: true, data: mockBlockers });

      const { loadAllSessionData } = useSessionStore.getState();
      await loadAllSessionData(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.sessionSummary).toEqual(mockSummary);
      expect(state.suggestedSteps).toEqual(mockSteps);
      expect(state.blockers).toEqual(mockBlockers);
      expect(state.isLoading).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      const mockSummary = { lastSession: 'Session-1' };

      (sessionsApi.getSummary as any).mockResolvedValue({ success: true, data: mockSummary });
      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({ success: false });
      (sessionsApi.getBlockers as any).mockRejectedValue(new Error('Failed'));

      const { loadAllSessionData } = useSessionStore.getState();
      await loadAllSessionData(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.sessionSummary).toEqual(mockSummary);
      expect(state.suggestedSteps).toEqual([]);
      expect(state.blockers).toEqual([]);
    });

    it('should set error on complete failure', async () => {
      (sessionsApi.getSummary as any).mockRejectedValue(new Error('Network error'));
      (sessionsApi.getSuggestedSteps as any).mockRejectedValue(new Error('Network error'));
      (sessionsApi.getBlockers as any).mockRejectedValue(new Error('Network error'));

      const { loadAllSessionData } = useSessionStore.getState();
      await loadAllSessionData(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toBe('Failed to load session data');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('startSession', () => {
    it('should start a new session successfully', async () => {
      const mockSessionData = {
        id: 'session-789',
        userId: mockUserId,
        projectId: mockProjectId,
        startedAt: new Date().toISOString(),
      };

      (sessionsApi.startSession as any).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });

      (sessionsApi.getSummary as any).mockResolvedValue({ success: true, data: {} });
      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({ success: true, data: [] });
      (sessionsApi.getBlockers as any).mockResolvedValue({ success: true, data: [] });

      const { startSession } = useSessionStore.getState();
      await startSession(mockUserId, mockProjectId);

      expect(sessionsApi.startSession).toHaveBeenCalledWith(mockUserId, mockProjectId);

      // Should also load all session data
      expect(sessionsApi.getSummary).toHaveBeenCalled();
    });

    it('should start inactivity timer after starting session', async () => {
      (sessionsApi.startSession as any).mockResolvedValue({
        success: true,
        data: { id: 'session-789' },
      });

      (sessionsApi.getSummary as any).mockResolvedValue({ success: true, data: {} });
      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({ success: true, data: [] });
      (sessionsApi.getBlockers as any).mockResolvedValue({ success: true, data: [] });

      const { startSession } = useSessionStore.getState();
      await startSession(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.inactivityTimer).not.toBeNull();
    });

    it('should handle session start failure', async () => {
      (sessionsApi.startSession as any).mockResolvedValue({
        success: false,
        data: null,
      });

      const { startSession } = useSessionStore.getState();
      await startSession(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toContain('Session could not be started');
    });

    it('should handle database setup errors', async () => {
      const dbError = new Error('function does not exist');
      (dbError as any).response = { status: 500 };

      (sessionsApi.startSession as any).mockRejectedValue(dbError);

      const { startSession } = useSessionStore.getState();
      await startSession(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toContain('database may need to be set up');
    });
  });

  describe('endSession', () => {
    it('should end the current session', async () => {
      (sessionsApi.endSession as any).mockResolvedValue({ success: true });

      const { endSession } = useSessionStore.getState();
      await endSession(mockUserId, mockProjectId);

      expect(sessionsApi.endSession).toHaveBeenCalledWith(mockUserId, mockProjectId);
    });

    it('should clear inactivity timer when ending session', async () => {
      // Start a session first to create a timer
      (sessionsApi.startSession as any).mockResolvedValue({
        success: true,
        data: { id: 'session-789' },
      });
      (sessionsApi.getSummary as any).mockResolvedValue({ success: true, data: {} });
      (sessionsApi.getSuggestedSteps as any).mockResolvedValue({ success: true, data: [] });
      (sessionsApi.getBlockers as any).mockResolvedValue({ success: true, data: [] });

      const { startSession } = useSessionStore.getState();
      await startSession(mockUserId, mockProjectId);

      expect(useSessionStore.getState().inactivityTimer).not.toBeNull();

      // End session
      (sessionsApi.endSession as any).mockResolvedValue({ success: true });
      const { endSession } = useSessionStore.getState();
      await endSession(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.inactivityTimer).toBeNull();
    });

    it('should handle errors silently', async () => {
      (sessionsApi.endSession as any).mockRejectedValue(new Error('Network error'));

      const { endSession } = useSessionStore.getState();
      await endSession(mockUserId, mockProjectId);

      // Should not throw or set error state
      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe('trackActivity', () => {
    it('should call API without waiting for response', () => {
      const { trackActivity } = useSessionStore.getState();
      trackActivity(mockUserId, mockProjectId);

      expect(sessionsApi.trackActivity).toHaveBeenCalledWith(mockUserId, mockProjectId);
    });

    it('should not throw if API fails', () => {
      (sessionsApi.trackActivity as any).mockRejectedValue(new Error('Network error'));

      const { trackActivity } = useSessionStore.getState();
      expect(() => trackActivity(mockUserId, mockProjectId)).not.toThrow();
    });
  });

  describe('clearSessionData', () => {
    it('should reset all session data to initial state', async () => {
      // Load some data first
      (sessionsApi.getSummary as any).mockResolvedValue({
        success: true,
        data: { lastSession: 'Session-1' },
      });

      const { loadSessionSummary, clearSessionData } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      expect(useSessionStore.getState().sessionSummary).not.toBeNull();

      // Clear data
      clearSessionData();

      const state = useSessionStore.getState();
      expect(state.sessionSummary).toBeNull();
      expect(state.suggestedSteps).toEqual([]);
      expect(state.blockers).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Inactivity Timer', () => {
    it('should start inactivity timer', () => {
      const { startInactivityTimer } = useSessionStore.getState();
      startInactivityTimer(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.inactivityTimer).not.toBeNull();
    });

    it('should end session after 30 minutes of inactivity', async () => {
      (sessionsApi.endSession as any).mockResolvedValue({ success: true });

      const { startInactivityTimer } = useSessionStore.getState();
      startInactivityTimer(mockUserId, mockProjectId);

      // Fast-forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Wait for async endSession to complete
      await vi.runAllTimersAsync();

      expect(sessionsApi.endSession).toHaveBeenCalledWith(mockUserId, mockProjectId);
    });

    it('should not end session before 30 minutes', async () => {
      (sessionsApi.endSession as any).mockResolvedValue({ success: true });

      const { startInactivityTimer } = useSessionStore.getState();
      startInactivityTimer(mockUserId, mockProjectId);

      // Fast-forward 29 minutes (not enough)
      vi.advanceTimersByTime(29 * 60 * 1000);
      await vi.runAllTimersAsync();

      expect(sessionsApi.endSession).not.toHaveBeenCalled();
    });

    it('should clear old timer when starting new one', () => {
      const { startInactivityTimer } = useSessionStore.getState();

      // Start first timer
      startInactivityTimer(mockUserId, mockProjectId);
      const firstTimer = useSessionStore.getState().inactivityTimer;

      // Start second timer
      startInactivityTimer(mockUserId, mockProjectId);
      const secondTimer = useSessionStore.getState().inactivityTimer;

      expect(firstTimer).not.toBe(secondTimer);
      expect(secondTimer).not.toBeNull();
    });

    it('should reset inactivity timer on activity', () => {
      (sessionsApi.endSession as any).mockResolvedValue({ success: true });

      const { startInactivityTimer, resetInactivityTimer } = useSessionStore.getState();

      // Start timer
      startInactivityTimer(mockUserId, mockProjectId);
      const firstTimer = useSessionStore.getState().inactivityTimer;

      // Fast-forward 20 minutes
      vi.advanceTimersByTime(20 * 60 * 1000);

      // Reset timer (user activity)
      resetInactivityTimer(mockUserId, mockProjectId);
      const secondTimer = useSessionStore.getState().inactivityTimer;

      // Timers should be different
      expect(firstTimer).not.toBe(secondTimer);

      // Fast-forward 25 more minutes (total 45 from start, but only 25 from reset)
      vi.advanceTimersByTime(25 * 60 * 1000);

      // Session should NOT end yet (reset timer hasn't reached 30 min)
      expect(sessionsApi.endSession).not.toHaveBeenCalled();
    });

    it('should clear inactivity timer', () => {
      const { startInactivityTimer, clearInactivityTimer } = useSessionStore.getState();

      startInactivityTimer(mockUserId, mockProjectId);
      expect(useSessionStore.getState().inactivityTimer).not.toBeNull();

      clearInactivityTimer();
      expect(useSessionStore.getState().inactivityTimer).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should distinguish between setup errors and data errors', async () => {
      const setupError = new Error('relation "brainstorm_sessions" does not exist');
      (setupError as any).response = { status: 500 };

      (sessionsApi.getSummary as any).mockRejectedValue(setupError);

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toContain('Database setup may be required');
    });

    it('should not show error for missing data', async () => {
      (sessionsApi.getSummary as any).mockResolvedValue({
        success: false,
        data: null,
      });

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.error).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');

      (sessionsApi.getSummary as any).mockRejectedValue(networkError);

      const { loadSessionSummary } = useSessionStore.getState();
      await loadSessionSummary(mockUserId, mockProjectId);

      const state = useSessionStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });
});
