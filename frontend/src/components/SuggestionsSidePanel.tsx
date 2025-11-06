import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { useChatStore } from '../store/chatStore';
import { projectsApi, conversationsApi, canvasApi } from '../services/api';
import { showToast } from '../utils/toast';
import {
  Sparkles,
  X,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Target,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Filter,
  Minimize2,
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'action' | 'decision' | 'insight' | 'question' | 'canvas-organize' | 'canvas-layout' | 'canvas-cleanup';
  title: string;
  description: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  agentType: string;
  actionData?: any;
}

interface SuggestionsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuggestionsSidePanel: React.FC<SuggestionsSidePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const { messages } = useChatStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const loadSuggestions = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const response = await projectsApi.getSuggestions(currentProject.id);

      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Load suggestions error:', error);
      showToast('Failed to load suggestions', 'error');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Load suggestions when project changes or panel opens
  useEffect(() => {
    if (isOpen && currentProject && user) {
      loadSuggestions();
    }
  }, [isOpen, currentProject?.id, user?.id, loadSuggestions]);

  // Auto-refresh when new messages arrive
  useEffect(() => {
    if (!isOpen || !currentProject) return;
    
    const currentMessageCount = messages.length;
    
    // If message count increased, refresh suggestions after a short delay
    if (currentMessageCount > lastMessageCount && lastMessageCount > 0) {
      const timer = setTimeout(() => {
        loadSuggestions();
      }, 2000); // Wait 2 seconds after new message before refreshing
      
      return () => clearTimeout(timer);
    }
    
    setLastMessageCount(currentMessageCount);
  }, [messages.length, lastMessageCount, isOpen, currentProject, loadSuggestions]);

  const handleDismiss = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    showToast('Suggestion dismissed', 'info');
  }, []);

  const handleCanvasAction = async (suggestion: Suggestion) => {
    if (!currentProject) return;

    // Set loading state
    setIsLoading(true);

    try {
      const { actionData } = suggestion;

      if (!actionData || !actionData.action) {
        console.error('[SuggestionsSidePanel] Invalid canvas action data:', actionData);
        showToast('Invalid canvas action data', 'error');
        setIsLoading(false);
        return;
      }

      let result;

      console.log('[SuggestionsSidePanel] Applying canvas action:', actionData.action);

      switch (actionData.action) {
        case 'cluster-cards':
          if (!actionData.clusters || !Array.isArray(actionData.clusters)) {
            console.error('[SuggestionsSidePanel] No clusters provided for clustering action');
            showToast('No clustering data available', 'error');
            setIsLoading(false);
            return;
          }
          console.log(`[SuggestionsSidePanel] Clustering ${actionData.clusters.length} groups`);
          result = await canvasApi.applyClustering(currentProject.id, actionData.clusters);
          break;

        case 'archive-cards':
          if (!actionData.cardIdsToArchive || !Array.isArray(actionData.cardIdsToArchive)) {
            console.error('[SuggestionsSidePanel] No card IDs provided for archiving action');
            showToast('No cards selected for archiving', 'error');
            setIsLoading(false);
            return;
          }
          console.log(`[SuggestionsSidePanel] Archiving ${actionData.cardIdsToArchive.length} cards`);
          result = await canvasApi.archiveCards(currentProject.id, actionData.cardIdsToArchive);
          break;

        case 'optimize-layout': {
          const layout = actionData.layout || 'grid';
          console.log(`[SuggestionsSidePanel] Optimizing layout: ${layout}`);
          result = await canvasApi.optimizeLayout(currentProject.id, layout);
          break;
        }

        default:
          console.error('[SuggestionsSidePanel] Unknown canvas action:', actionData.action);
          showToast(`Unknown action type: ${actionData.action}`, 'error');
          setIsLoading(false);
          return;
      }

      console.log('[SuggestionsSidePanel] Canvas action result:', result);

      if (result?.success && result?.project) {
        // Update the project store with the new project data
        const { updateProject } = useProjectStore.getState();
        updateProject(currentProject.id, result.project);

        console.log('[SuggestionsSidePanel] Project updated successfully');

        // Show success message
        showToast(result.message || 'Canvas updated successfully!', 'success');

        // Remove suggestion after successful application
        handleDismiss(suggestion.id);

        // Reload suggestions after a short delay
        setTimeout(() => {
          loadSuggestions();
        }, 500);
      } else {
        console.error('[SuggestionsSidePanel] Canvas action failed:', result);
        showToast('Failed to apply canvas action', 'error');
      }
    } catch (error) {
      console.error('[SuggestionsSidePanel] Error applying canvas action:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Error: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (suggestion: Suggestion) => {
    if (!currentProject || !user) return;

    try {
      // Handle canvas organization suggestions
      if (suggestion.type === 'canvas-organize' || suggestion.type === 'canvas-layout' || suggestion.type === 'canvas-cleanup') {
        await handleCanvasAction(suggestion);
        return;
      }

      // Handle regular suggestions with conversation messages
      if (suggestion.actionData?.suggestedMessage) {
        await conversationsApi.sendMessage(
          currentProject.id,
          suggestion.actionData.suggestedMessage,
          user.id
        );

        setTimeout(() => {
          loadSuggestions();
        }, 1000);
      }

      handleDismiss(suggestion.id);
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const toggleExpanded = useCallback((suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      case 'low':
        return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <Target size={16} />;
      case 'decision':
        return <Lightbulb size={16} />;
      case 'insight':
        return <Zap size={16} />;
      case 'question':
        return <HelpCircle size={16} />;
      default:
        return <Sparkles size={16} />;
    }
  };

  // Filter and sort suggestions with memoization
  const filteredSuggestions = useMemo(() => {
    const filtered = suggestions.filter(s => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
      return true;
    });

    // Sort by priority: high > medium > low
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [suggestions, filterType, filterPriority]);

  // Group by type with memoization
  const groupedSuggestions = useMemo(() => {
    return filteredSuggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    }, {} as Record<string, Suggestion[]>);
  }, [filteredSuggestions]);

  const suggestionTypes = [
    { id: 'action', label: 'Actions', icon: Target },
    { id: 'decision', label: 'Decisions', icon: Lightbulb },
    { id: 'insight', label: 'Insights', icon: Zap },
    { id: 'question', label: 'Questions', icon: HelpCircle },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Side Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 h-full w-full sm:w-[400px] lg:w-[420px] z-50 ${
              isDarkMode ? 'glass-dark' : 'glass'
            } shadow-2xl border-l-2 border-cyan-primary/30 flex flex-col`}
          >
            {/* Header */}
            <div
              className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-white/10' : 'border-gray-200'
              } flex items-center justify-between`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-primary/20 flex items-center justify-center">
                  <Sparkles className="text-cyan-primary" size={20} />
                </div>
                <div>
                  <h2
                    className={`text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    AI Suggestions
                  </h2>
                  <p
                    className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {filteredSuggestions.length} active recommendation{filteredSuggestions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } transition-colors`}
                  aria-label="Minimize panel"
                  title="Minimize"
                >
                  <Minimize2 size={20} />
                </button>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } transition-colors`}
                  aria-label="Close panel"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div
              className={`px-6 py-3 border-b ${
                isDarkMode ? 'border-white/10' : 'border-gray-200'
              } space-y-3`}
            >
              {/* Type Filter */}
              <div className="flex items-center space-x-2 overflow-x-auto scrollbar-thin">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    filterType === 'all'
                      ? 'bg-cyan-primary text-white'
                      : isDarkMode
                      ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Types
                </button>
                {suggestionTypes.map(type => {
                  const Icon = type.icon;
                  const count = groupedSuggestions[type.id]?.length || 0;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setFilterType(type.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center space-x-1 ${
                        filterType === type.id
                          ? 'bg-cyan-primary text-white'
                          : isDarkMode
                          ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{type.label}</span>
                      <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center space-x-2">
                <Filter size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                <button
                  onClick={() => setFilterPriority('all')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    filterPriority === 'all'
                      ? 'bg-cyan-primary text-white'
                      : isDarkMode
                      ? 'bg-white/10 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPriority('high')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    filterPriority === 'high'
                      ? 'bg-red-500 text-white'
                      : 'text-red-500 bg-red-500/20'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterPriority('medium')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    filterPriority === 'medium'
                      ? 'bg-yellow-500 text-white'
                      : 'text-yellow-500 bg-yellow-500/20'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFilterPriority('low')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    filterPriority === 'low'
                      ? 'bg-blue-500 text-white'
                      : 'text-blue-500 bg-blue-500/20'
                  }`}
                >
                  Low
                </button>
              </div>
            </div>

            {/* Suggestions List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {/* Skeleton Loaders */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`${
                        isDarkMode ? 'bg-white/5' : 'bg-white/50'
                      } rounded-xl p-4 border ${
                        isDarkMode ? 'border-white/10' : 'border-gray-200'
                      } animate-pulse`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <div className={`w-20 h-6 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                          <div className={`w-16 h-4 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                        </div>
                        <div className={`w-4 h-4 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                      </div>
                      <div className={`w-3/4 h-5 rounded mb-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                      <div className={`w-full h-4 rounded mb-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                      <div className={`w-5/6 h-4 rounded mb-3 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                      <div className="flex items-center space-x-2">
                        <div className={`flex-1 h-9 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                        <div className={`flex-1 h-9 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles size={48} className={`mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No suggestions right now
                  </p>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Keep working and AI will generate helpful suggestions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSuggestions.map((suggestion, index) => {
                    const isExpanded = expandedSuggestions.has(suggestion.id);
                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ delay: index * 0.05 }}
                        className={`${
                          isDarkMode ? 'bg-white/5' : 'bg-white/50'
                        } rounded-xl p-4 border ${
                          isDarkMode ? 'border-white/10' : 'border-gray-200'
                        } hover:border-cyan-primary/50 transition-all`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 ${getPriorityColor(
                                suggestion.priority
                              )} border`}
                            >
                              {getTypeIcon(suggestion.type)}
                              <span className="capitalize">{suggestion.type}</span>
                            </span>
                            <span
                              className={`text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-600'
                              }`}
                            >
                              {suggestion.agentType}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleExpanded(suggestion.id)}
                            className={`p-1 rounded ${
                              isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </div>

                        {/* Title */}
                        <h4
                          className={`font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {suggestion.title}
                        </h4>

                        {/* Description */}
                        <p
                          className={`text-sm mb-3 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {suggestion.description}
                        </p>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div
                                className={`text-xs p-3 rounded-lg mb-3 ${
                                  isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                                }`}
                              >
                                <span className="font-semibold">Why: </span>
                                {suggestion.reasoning}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAccept(suggestion)}
                            className="flex-1 px-3 py-2 rounded-lg bg-cyan-primary hover:bg-cyan-primary/80 text-white text-sm font-medium transition-all flex items-center justify-center space-x-1"
                          >
                            <ThumbsUp size={14} />
                            <span>Apply</span>
                          </button>
                          <button
                            onClick={() => handleDismiss(suggestion.id)}
                            className={`flex-1 px-3 py-2 rounded-lg ${
                              isDarkMode
                                ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            } text-sm font-medium transition-all flex items-center justify-center space-x-1`}
                          >
                            <ThumbsDown size={14} />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`px-6 py-4 border-t ${
                isDarkMode ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <button
                onClick={loadSuggestions}
                disabled={isLoading}
                className={`w-full px-4 py-3 rounded-xl ${
                  isDarkMode
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-100 hover:bg-gray-200'
                } text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh Suggestions'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
