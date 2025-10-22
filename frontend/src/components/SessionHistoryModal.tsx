import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { sessionsApi } from '../services/api';
import { X, Calendar, Clock, TrendingUp, ChevronDown, ChevronRight, CheckCircle2, Brain, Archive } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { UserSession } from '../types';

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  isOpen,
  onClose,
  projectId
}) => {
  const { isDarkMode } = useThemeStore();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadSessionHistory();
    }
  }, [isOpen, projectId]);

  const loadSessionHistory = async () => {
    setLoading(true);
    try {
      const response = await sessionsApi.getHistory(projectId);
      if (response.success) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const calculateSessionStats = (session: UserSession) => {
    const snapshot = session.snapshot_at_start;
    return {
      decided: snapshot.decided.length,
      exploring: snapshot.exploring.length,
      parked: snapshot.parked.length,
      total: snapshot.decided.length + snapshot.exploring.length + snapshot.parked.length
    };
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'In progress';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        <div
          className={`${
            isDarkMode ? 'glass-dark' : 'glass'
          } rounded-3xl shadow-glass max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-green-metallic/20 flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Session History
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Review your past brainstorming sessions
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-t-transparent border-green-metallic rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div
                  className={`w-16 h-16 rounded-full ${
                    isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                  } flex items-center justify-center mb-4`}
                >
                  <Calendar size={32} className="text-gray-400" />
                </div>
                <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No previous sessions found
                </p>
                <p className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Your session history will appear here after you complete your first session
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const stats = calculateSessionStats(session);
                  const isExpanded = expandedSession === session.id;
                  const isActive = session.is_active;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border rounded-xl ${
                        isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'
                      } overflow-hidden`}
                    >
                      {/* Session Header */}
                      <div
                        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors`}
                        onClick={() => toggleSession(session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                Session {sessions.length - index}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className={`flex items-center space-x-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <div className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>{format(new Date(session.session_start), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock size={14} />
                                <span>{format(new Date(session.session_start), 'h:mm a')}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <TrendingUp size={14} />
                                <span>{formatDuration(session.session_start, session.session_end)}</span>
                              </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex items-center space-x-4 mt-3">
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {stats.decided} decided
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Brain size={16} className="text-blue-500" />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {stats.exploring} exploring
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Archive size={16} className="text-yellow-500" />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {stats.parked} parked
                                </span>
                              </div>
                            </div>

                            {/* Time Ago */}
                            <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatDistanceToNow(new Date(session.session_start), { addSuffix: true })}
                            </div>
                          </div>

                          <button
                            className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
                          >
                            <div className="p-4 space-y-4">
                              {/* Decisions */}
                              {session.snapshot_at_start.decided.length > 0 && (
                                <SessionStateSection
                                  title="Decisions Made"
                                  icon={CheckCircle2}
                                  iconColor="text-green-500"
                                  items={session.snapshot_at_start.decided}
                                  isDarkMode={isDarkMode}
                                />
                              )}

                              {/* Exploring */}
                              {session.snapshot_at_start.exploring.length > 0 && (
                                <SessionStateSection
                                  title="Ideas Explored"
                                  icon={Brain}
                                  iconColor="text-blue-500"
                                  items={session.snapshot_at_start.exploring}
                                  isDarkMode={isDarkMode}
                                />
                              )}

                              {/* Parked */}
                              {session.snapshot_at_start.parked.length > 0 && (
                                <SessionStateSection
                                  title="Ideas Parked"
                                  icon={Archive}
                                  iconColor="text-yellow-500"
                                  items={session.snapshot_at_start.parked}
                                  isDarkMode={isDarkMode}
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'} flex justify-end`}>
            <button
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Session State Section Component
interface SessionStateSectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  items: Array<{ id: string; text: string; created_at: string; metadata?: Record<string, any> }>;
  isDarkMode: boolean;
}

const SessionStateSection: React.FC<SessionStateSectionProps> = ({
  title,
  icon: Icon,
  iconColor,
  items,
  isDarkMode
}) => {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <Icon size={18} className={iconColor} />
        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {title}
        </h4>
        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-2">
              <span className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {index + 1}.
              </span>
              <p className={`flex-1 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
