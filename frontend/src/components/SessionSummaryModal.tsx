import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useSessionStore } from '../store/sessionStore';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  onStartSession,
}) => {
  const { isDarkMode } = useThemeStore();
  const { sessionSummary, suggestedSteps, blockers } = useSessionStore();

  if (!isOpen || !sessionSummary) return null;

  const handleStartSession = () => {
    onStartSession();
    onClose();
  };

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <div
              className={`${
                isDarkMode ? 'glass-dark' : 'glass'
              } rounded-3xl shadow-glass-strong max-w-3xl w-full max-h-[85vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 backdrop-blur-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">Welcome Back!</h2>
                    <p className="text-teal-100 mt-1">
                      Last session: {sessionSummary.lastSession}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Summary Narrative */}
              <div className="px-8 py-6">
                <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-teal-900/30' : 'bg-teal-50'} border-l-4 border-teal-500`}>
                  <p className={`text-lg leading-relaxed ${isDarkMode ? 'text-teal-100' : 'text-teal-900'}`}>
                    {generateSessionNarrative()}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="px-8 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-5 rounded-xl ${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} text-center`}>
                    <div className={`text-4xl font-bold ${sessionSummary.itemsDecided > 0 ? 'text-green-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                      {sessionSummary.itemsDecided}
                    </div>
                    <div className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Decided
                    </div>
                  </div>

                  <div className={`p-5 rounded-xl ${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} text-center`}>
                    <div className={`text-4xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {sessionSummary.itemsExploring}
                    </div>
                    <div className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Exploring
                    </div>
                  </div>

                  <div className={`p-5 rounded-xl ${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} text-center`}>
                    <div className={`text-4xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {sessionSummary.itemsParked}
                    </div>
                    <div className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Parked
                    </div>
                  </div>

                  <div className={`p-5 rounded-xl ${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} text-center`}>
                    <div className={`text-4xl font-bold ${sessionSummary.pendingQuestions > 0 ? 'text-yellow-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                      {sessionSummary.pendingQuestions}
                    </div>
                    <div className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Questions
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Next Steps */}
              {suggestedSteps.length > 0 && (
                <div className="px-8 pb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="text-teal-500" size={20} />
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Suggested Next Steps
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {suggestedSteps.slice(0, 3).map((step) => (
                      <div
                        key={step.id}
                        className={`p-4 rounded-xl ${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} border-l-4 ${
                          step.priority === 'high'
                            ? 'border-red-500'
                            : step.priority === 'medium'
                            ? 'border-yellow-500'
                            : 'border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {step.text}
                            </p>
                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {step.reason}
                            </p>
                          </div>
                          {step.priority === 'high' && (
                            <span className="ml-3 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockers */}
              {blockers.length > 0 && (
                <div className="px-8 pb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertCircle className="text-red-500" size={20} />
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Active Blockers
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {blockers.map((blocker) => (
                      <div
                        key={blocker.id}
                        className={`p-4 rounded-xl ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'} border border-red-500/50`}
                      >
                        <p className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-900'}`}>
                          {blocker.text}
                        </p>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                          Type: {blocker.type}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="sticky bottom-0 backdrop-blur-xl bg-gradient-to-t from-white/90 to-white/50 dark:from-gray-900/90 dark:to-gray-900/50 px-8 py-6 rounded-b-3xl border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      isDarkMode
                        ? 'glass-dark-subtle hover:bg-white/20 text-gray-300'
                        : 'glass-subtle hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Review Later
                  </button>

                  <button
                    onClick={handleStartSession}
                    className="flex items-center space-x-2 px-8 py-3 rounded-xl font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <CheckCircle2 size={20} />
                    <span>Start New Session</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
