import React, { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';

interface SessionManagerProps {
  className?: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ className = '' }) => {
  const { user } = useUserStore();
  const { currentProject } = useProjectStore();
  const { isDarkMode } = useThemeStore();
  const {
    sessionSummary,
    suggestedSteps,
    blockers,
    isLoading,
    loadAllSessionData,
    trackActivity,
    resetInactivityTimer
  } = useSessionStore();

  // Load session data when user and project are available
  useEffect(() => {
    if (user && currentProject) {
      loadAllSessionData(user.id, currentProject.id);
    }
  }, [user, currentProject, loadAllSessionData]);

  // Track activity when user interacts with the project
  useEffect(() => {
    if (user && currentProject) {
      const handleActivity = () => {
        trackActivity(user.id, currentProject.id);
        resetInactivityTimer(user.id, currentProject.id);
      };

      // Track on user interactions
      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);

      // Track periodically every 5 minutes
      const interval = setInterval(handleActivity, 5 * 60 * 1000);

      return () => {
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        clearInterval(interval);
      };
    }
  }, [user, currentProject, trackActivity, resetInactivityTimer]);

  if (!user || !currentProject) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`${className} p-4 rounded-lg ${isDarkMode ? 'bg-teal-800 text-white' : 'bg-white text-gray-900'} shadow-md`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!sessionSummary) {
    return null;
  }

  const hasNewDecisions = sessionSummary.itemsDecided > 0;
  const hasExploringItems = sessionSummary.itemsExploring > 0;
  const hasBlockers = blockers.length > 0;
  const hasSuggestedSteps = suggestedSteps.length > 0;

  // Don't show for first session - there's no previous context
  if (sessionSummary.lastSession === 'first session') {
    return null;
  }

  // Generate written summary of last session
  const generateSessionNarrative = () => {
    const parts: string[] = [];

    if (sessionSummary.itemsDecided > 0) {
      parts.push(`finalized ${sessionSummary.itemsDecided} ${sessionSummary.itemsDecided === 1 ? 'decision' : 'decisions'}`);
    }

    if (sessionSummary.itemsExploring > 0) {
      const verb = sessionSummary.itemsDecided > 0 ? 'left' : 'had';
      parts.push(`${verb} ${sessionSummary.itemsExploring} ${sessionSummary.itemsExploring === 1 ? 'item' : 'items'} in exploration`);
    }

    if (sessionSummary.itemsParked > 0) {
      parts.push(`parked ${sessionSummary.itemsParked} for later`);
    }

    if (sessionSummary.pendingQuestions > 0) {
      parts.push(`${sessionSummary.pendingQuestions} unanswered ${sessionSummary.pendingQuestions === 1 ? 'question' : 'questions'} remaining`);
    }

    if (parts.length === 0) {
      return "Your last session was exploratory - no decisions were finalized.";
    }

    // Join parts grammatically
    if (parts.length === 1) {
      return `In your last session, you ${parts[0]}.`;
    } else if (parts.length === 2) {
      return `In your last session, you ${parts[0]} and ${parts[1]}.`;
    } else {
      const lastPart = parts.pop();
      return `In your last session, you ${parts.join(', ')}, and ${lastPart}.`;
    }
  };

  return (
    <div className={`${className} ${isDarkMode ? 'bg-teal-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 ${isDarkMode ? 'bg-teal-700' : 'bg-teal-50'} border-b ${isDarkMode ? 'border-teal-600' : 'border-teal-100'}`}>
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-teal-100' : 'text-teal-900'}`}>
          Since Last Session
        </h2>
        <p className={`text-sm ${isDarkMode ? 'text-teal-200' : 'text-teal-600'} mt-1`}>
          {sessionSummary.lastSession}
        </p>
      </div>

      {/* Written Summary */}
      <div className={`px-6 py-4 ${isDarkMode ? 'bg-teal-700/30' : 'bg-teal-50/50'}`}>
        <p className={`text-base ${isDarkMode ? 'text-teal-100' : 'text-teal-900'} leading-relaxed`}>
          {generateSessionNarrative()}
        </p>
      </div>

      {/* Stats Section */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Items Decided Since Last */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-teal-700/50' : 'bg-teal-50'}`}>
          <div className={`text-3xl font-bold ${hasNewDecisions ? 'text-cyan-500' : (isDarkMode ? 'text-teal-200' : 'text-gray-600')}`}>
            {sessionSummary.itemsDecided}
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-teal-300' : 'text-gray-500'} mt-1`}>
            Decided Since Last
          </div>
        </div>

        {/* Items Exploring */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-teal-700/50' : 'bg-teal-50'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-200' : 'text-teal-700'}`}>
            {sessionSummary.itemsExploring}
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-teal-300' : 'text-gray-500'} mt-1`}>
            Exploring
          </div>
        </div>

        {/* Items Parked */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-teal-700/50' : 'bg-teal-50'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-200' : 'text-gray-700'}`}>
            {sessionSummary.itemsParked}
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-teal-300' : 'text-gray-500'} mt-1`}>
            Parked
          </div>
        </div>

        {/* Pending Questions */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-teal-700/50' : 'bg-teal-50'}`}>
          <div className={`text-3xl font-bold ${sessionSummary.pendingQuestions > 0 ? 'text-yellow-500' : (isDarkMode ? 'text-teal-200' : 'text-gray-600')}`}>
            {sessionSummary.pendingQuestions}
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-teal-300' : 'text-gray-500'} mt-1`}>
            Pending Questions
          </div>
        </div>
      </div>

      {/* Suggested Next Steps */}
      {hasSuggestedSteps && (
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-teal-600' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-teal-200' : 'text-gray-700'} mb-3`}>
            Suggested Next Steps
          </h3>
          <div className="space-y-2">
            {suggestedSteps.map((step) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg ${isDarkMode ? 'bg-teal-700/30' : 'bg-gray-50'} border ${
                  step.priority === 'high'
                    ? 'border-red-300'
                    : step.priority === 'medium'
                    ? 'border-yellow-300'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {step.text}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-teal-300' : 'text-gray-500'} mt-1`}>
                      {step.reason}
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {step.priority === 'high' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        High
                      </span>
                    )}
                    {step.priority === 'medium' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Medium
                      </span>
                    )}
                    {step.blocksOthers && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-1">
                        Blocker
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Blockers */}
      {hasBlockers && (
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-teal-600' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-teal-200' : 'text-gray-700'} mb-3`}>
            Active Blockers
          </h3>
          <div className="space-y-2">
            {blockers.map((blocker) => (
              <div
                key={blocker.id}
                className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'} border ${isDarkMode ? 'border-red-800' : 'border-red-200'}`}
              >
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-red-200' : 'text-red-900'}`}>
                      {blocker.text}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'} mt-1`}>
                      Type: {blocker.type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {hasNewDecisions && (
        <div className={`px-6 py-3 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} border-t ${isDarkMode ? 'border-green-800' : 'border-green-200'}`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-cyan-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              Great progress! You've made {sessionSummary.itemsDecided} {sessionSummary.itemsDecided === 1 ? 'decision' : 'decisions'} since your last session.
            </span>
          </div>
        </div>
      )}

      {/* No Activity Warning */}
      {!hasNewDecisions && !hasExploringItems && sessionSummary.lastSession !== 'first session' && (
        <div className={`px-6 py-3 ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border-t ${isDarkMode ? 'border-yellow-800' : 'border-yellow-200'}`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              No new activity since your last session. Time to make some decisions!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Export SessionSummary as an alias for backward compatibility
export const SessionSummary = SessionManager;