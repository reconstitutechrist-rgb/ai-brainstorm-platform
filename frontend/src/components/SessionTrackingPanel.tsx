import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useSessionStore } from '../store/sessionStore';
import { useUserStore } from '../store/userStore';
import {
  Play,
  Square,
  Clock,
  CheckCircle2,
  Brain,
  Archive,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ProjectItem } from '../types';

export const SessionTrackingPanel: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const {
    isLoading,
    loadAllSessionData,
    startSession,
    endSession,
  } = useSessionStore();

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('');
  const [activeTab, setActiveTab] = useState<'decided' | 'exploring' | 'parked'>('decided');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Load session data when component mounts or project changes
  useEffect(() => {
    if (currentProject && user) {
      loadAllSessionData(user.id, currentProject.id);
    }
  }, [currentProject?.id, user?.id]);

  // Update session duration every second
  useEffect(() => {
    if (!isSessionActive || !sessionStartTime) return;

    const interval = setInterval(() => {
      setSessionDuration(formatDistanceToNow(sessionStartTime, { includeSeconds: true }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime]);

  if (!currentProject || !user) return null;

  const handleStartSession = async () => {
    await startSession(user.id, currentProject.id);
    setIsSessionActive(true);
    setSessionStartTime(new Date());
  };

  const handleEndSession = async () => {
    await endSession(user.id, currentProject.id);
    setIsSessionActive(false);
    setSessionStartTime(null);
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Filter items created during current session
  const getSessionItems = (state: 'decided' | 'exploring' | 'parked'): ProjectItem[] => {
    if (!currentProject.items || !sessionStartTime) return [];
    
    return currentProject.items.filter(item => {
      const itemCreated = new Date(item.created_at);
      return item.state === state && itemCreated >= sessionStartTime;
    });
  };

  const decidedItems = getSessionItems('decided');
  const exploringItems = getSessionItems('exploring');
  const parkedItems = getSessionItems('parked');

  const tabs = [
    {
      id: 'decided' as const,
      label: 'Decided',
      icon: CheckCircle2,
      color: 'green',
      gradient: isDarkMode ? 'from-green-600 to-emerald-600' : 'from-green-400 to-emerald-400',
      count: decidedItems.length
    },
    {
      id: 'exploring' as const,
      label: 'Exploring',
      icon: Brain,
      color: 'blue',
      gradient: isDarkMode ? 'from-blue-600 to-cyan-600' : 'from-blue-400 to-cyan-400',
      count: exploringItems.length
    },
    {
      id: 'parked' as const,
      label: 'Parked',
      icon: Archive,
      color: 'amber',
      gradient: isDarkMode ? 'from-amber-600 to-yellow-600' : 'from-amber-400 to-yellow-400',
      count: parkedItems.length
    }
  ];

  const currentItems = activeTab === 'decided' 
    ? decidedItems 
    : activeTab === 'exploring' 
    ? exploringItems 
    : parkedItems;

  return (
    <div
      className={`${
        isDarkMode ? 'glass-dark' : 'glass'
      } rounded-3xl shadow-glass h-[calc(100vh-20rem)] flex flex-col`}
    >
      {/* Header with Session Controls */}
      <div className="p-6 border-b border-cyan-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Session Tracker
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track items from your current session
            </p>
          </div>

          {/* Session Status Indicator */}
          <div className="flex items-center gap-3">
            {isSessionActive ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    Active
                  </span>
                </div>
                <button
                  onClick={handleEndSession}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                    isDarkMode
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/40'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                  }`}
                >
                  <Square size={14} />
                  End
                </button>
              </>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                  isDarkMode
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/40'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Play size={14} />
                Start Session
              </button>
            )}
          </div>
        </div>

        {/* Session Duration */}
        {isSessionActive && sessionDuration && (
          <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Clock size={14} />
            <span>Duration: {sessionDuration}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-primary/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-all relative ${
                isActive
                  ? isDarkMode
                    ? 'bg-white/10'
                    : 'bg-gray-100'
                  : 'hover:bg-white/5'
              }`}
            >
              <Icon
                size={18}
                className={`${
                  tab.color === 'green'
                    ? 'text-green-400'
                    : tab.color === 'blue'
                    ? 'text-blue-400'
                    : 'text-amber-400'
                }`}
              />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {tab.label}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tab.gradient} text-white shadow-lg`}
              >
                {tab.count}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.gradient}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence mode="wait">
          {!isSessionActive ? (
            <motion.div
              key="not-active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div
                className={`w-16 h-16 rounded-full ${
                  isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                } flex items-center justify-center mb-4`}
              >
                <Play size={32} className="text-gray-400" />
              </div>
              <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Start a session to track your progress
              </p>
              <p className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Items created during the session will appear here
              </p>
            </motion.div>
          ) : currentItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div
                className={`w-16 h-16 rounded-full ${
                  isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                } flex items-center justify-center mb-4`}
              >
                {activeTab === 'decided' && <CheckCircle2 size={32} className="text-gray-400" />}
                {activeTab === 'exploring' && <Brain size={32} className="text-gray-400" />}
                {activeTab === 'parked' && <Archive size={32} className="text-gray-400" />}
              </div>
              <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeTab === 'decided' && 'No decisions made this session'}
                {activeTab === 'exploring' && 'No ideas being explored this session'}
                {activeTab === 'parked' && 'No ideas parked this session'}
              </p>
              <p className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Keep chatting to add items
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="items"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {currentItems.map((item, index) => (
                <SessionItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  type={activeTab}
                  isDarkMode={isDarkMode}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleItemExpansion(item.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Individual Item Card Component
interface SessionItemCardProps {
  item: ProjectItem;
  index: number;
  type: 'decided' | 'exploring' | 'parked';
  isDarkMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const SessionItemCard: React.FC<SessionItemCardProps> = ({
  item,
  index,
  type,
  isDarkMode,
  isExpanded,
  onToggleExpand
}) => {
  const getTypeColor = () => {
    switch (type) {
      case 'decided':
        return 'green';
      case 'exploring':
        return 'blue';
      case 'parked':
        return 'yellow';
    }
  };

  const color = getTypeColor();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border rounded-xl ${
        isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'
      } overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Badge */}
            <div className="flex items-center space-x-2 mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  color === 'green'
                    ? 'bg-green-500/20 text-green-400'
                    : color === 'blue'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-yellow-500/20 text-yellow-600'
                }`}
              >
                #{index + 1}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <Clock size={12} className="inline mr-1" />
                {format(new Date(item.created_at), 'h:mm a')}
              </span>
            </div>

            {/* Item Text */}
            <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} leading-relaxed`}>
              {item.text}
            </p>

            {/* Citation/Context if available */}
            {item.citation && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-3 pt-3 border-t ${
                  isDarkMode ? 'border-white/10' : 'border-gray-200'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  User Quote:
                </p>
                <p className={`text-sm italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{item.citation.userQuote}"
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {format(new Date(item.citation.timestamp), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.citation.confidence >= 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : item.citation.confidence >= 0.6
                        ? 'bg-yellow-500/20 text-yellow-600'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    Confidence: {Math.round(item.citation.confidence * 100)}%
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          {item.citation && (
            <button
              onClick={onToggleExpand}
              className={`ml-3 p-1 rounded hover:bg-white/10 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
