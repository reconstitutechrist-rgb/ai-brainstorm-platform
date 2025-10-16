import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Clock } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useSessionStore } from '../store/sessionStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';

interface SessionControlsProps {
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  onSessionStart,
  onSessionEnd,
}) => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { currentProject } = useProjectStore();
  const { startSession, endSession } = useSessionStore();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const handleStartSession = async () => {
    if (!user || !currentProject) return;

    await startSession(user.id, currentProject.id);
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    onSessionStart?.();
  };

  const handleEndSession = async () => {
    if (!user || !currentProject) return;

    await endSession(user.id, currentProject.id);
    setIsSessionActive(false);
    setSessionStartTime(null);
    onSessionEnd?.();
  };

  const getSessionDuration = () => {
    if (!sessionStartTime) return '0m';
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex items-center space-x-3">
      {!isSessionActive ? (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={handleStartSession}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl ${
            isDarkMode
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
          }`}
        >
          <Play size={20} fill="currentColor" />
          <span>Start Session</span>
        </motion.button>
      ) : (
        <>
          {/* Session Active Indicator */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl ${
              isDarkMode ? 'glass-dark' : 'glass'
            } border-2 border-green-500/50`}
          >
            <div className="relative flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping" />
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-green-500" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {getSessionDuration()}
              </span>
            </div>
          </motion.div>

          {/* End Session Button */}
          <motion.button
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleEndSession}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              isDarkMode
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
            }`}
          >
            <Square size={18} />
            <span>End Session</span>
          </motion.button>
        </>
      )}
    </div>
  );
};
