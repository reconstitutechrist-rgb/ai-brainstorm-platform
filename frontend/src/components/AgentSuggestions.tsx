import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import {
  Sparkles,
  X,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'action' | 'decision' | 'insight';
  title: string;
  description: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  agentType: string;
}

export const AgentSuggestions: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load suggestions when project changes
  useEffect(() => {
    if (currentProject && user) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setIsVisible(false);
    }
  }, [currentProject, user]);

  const loadSuggestions = async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      // Generate project-specific suggestions based on actual project state
      const projectSuggestions: Suggestion[] = [];

      // Suggestion 1: Based on project status
      if (currentProject.status === 'exploring') {
        projectSuggestions.push({
          id: '1',
          type: 'action',
          title: `Continue exploring "${currentProject.title}"`,
          description: 'Review recent brainstorming progress and make a decision',
          reasoning: `Project has been in exploring mode. Consider moving to decided phase.`,
          priority: 'high',
          agentType: 'decision-tracker'
        });
      } else if (currentProject.status === 'decided') {
        projectSuggestions.push({
          id: '1',
          type: 'insight',
          title: `"${currentProject.title}" is decided`,
          description: 'Great work! Consider documenting your decision rationale',
          reasoning: 'Documenting decisions helps with future reference and team alignment',
          priority: 'medium',
          agentType: 'documentation-advisor'
        });
      }

      // Suggestion 2: Based on project description
      if (currentProject.description) {
        const hasDescription = currentProject.description.length > 20;
        if (!hasDescription) {
          projectSuggestions.push({
            id: '2',
            type: 'action',
            title: 'Expand project description',
            description: 'Add more details to help AI agents understand your goals',
            reasoning: 'Detailed descriptions enable better AI suggestions and analysis',
            priority: 'medium',
            agentType: 'context-analyzer'
          });
        }
      }

      // Suggestion 3: Generic helpful tip
      projectSuggestions.push({
        id: '3',
        type: 'insight',
        title: 'Engage with AI agents',
        description: 'Use the chat to brainstorm ideas and explore options for this project',
        reasoning: '18 specialized agents are ready to help with architecture, features, and decisions',
        priority: 'low',
        agentType: 'collaboration-advisor'
      });

      // Filter to show only top 3 suggestions
      setSuggestions(projectSuggestions.slice(0, 3));
      setIsVisible(projectSuggestions.length > 0);
    } catch (error) {
      console.error('Load suggestions error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

    // Hide the widget if no suggestions left
    if (suggestions.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleAccept = (suggestion: Suggestion) => {
    // In a real implementation, this would trigger the suggested action
    console.log('Accepted suggestion:', suggestion);
    handleDismiss(suggestion.id);
  };

  const handleReject = (suggestionId: string) => {
    // In a real implementation, this would send feedback to improve future suggestions
    console.log('Rejected suggestion:', suggestionId);
    handleDismiss(suggestionId);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible || suggestions.length === 0) return null;

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
      default:
        return <Sparkles size={16} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed right-6 top-24 z-40 w-96 max-w-[calc(100vw-3rem)]"
      >
        <div
          className={`${
            isDarkMode ? 'glass-dark' : 'glass'
          } rounded-2xl shadow-glass-strong overflow-hidden border-2 border-green-metallic/30`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 border-b ${
              isDarkMode ? 'border-white/10' : 'border-gray-200'
            } flex items-center justify-between cursor-pointer`}
            onClick={toggleExpanded}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-metallic/20 flex items-center justify-center">
                <Sparkles className="text-green-metallic" size={16} />
              </div>
              <div>
                <h3
                  className={`font-bold text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  AI Suggestions
                </h3>
                <p
                  className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {suggestions.length} recommendation{suggestions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className={`p-1 rounded hover:bg-white/10 transition-colors`}
              aria-label="Close suggestions"
            >
              <X size={18} />
            </button>
          </div>

          {/* Suggestions List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${
                        isDarkMode ? 'bg-white/5' : 'bg-white/50'
                      } rounded-xl p-4 border ${
                        isDarkMode ? 'border-white/10' : 'border-gray-200'
                      }`}
                    >
                      {/* Type and Priority Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 ${getPriorityColor(
                              suggestion.priority
                            )}`}
                          >
                            {getTypeIcon(suggestion.type)}
                            <span className="capitalize">{suggestion.type}</span>
                          </span>
                        </div>
                        <span
                          className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-600'
                          }`}
                        >
                          {suggestion.agentType}
                        </span>
                      </div>

                      {/* Title */}
                      <h4
                        className={`font-semibold mb-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {suggestion.title}
                      </h4>

                      {/* Description */}
                      <p
                        className={`text-sm mb-2 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {suggestion.description}
                      </p>

                      {/* Reasoning */}
                      <div
                        className={`text-xs p-2 rounded-lg mb-3 ${
                          isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold">Why: </span>
                        {suggestion.reasoning}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAccept(suggestion)}
                          className="flex-1 px-3 py-2 rounded-lg bg-green-metallic hover:bg-green-metallic-dark text-white text-sm font-medium transition-all flex items-center justify-center space-x-1"
                        >
                          <ThumbsUp size={14} />
                          <span>Apply</span>
                        </button>
                        <button
                          onClick={() => handleReject(suggestion.id)}
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
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer - Refresh suggestions */}
          {isExpanded && (
            <div
              className={`px-4 py-2 border-t ${
                isDarkMode ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <button
                onClick={loadSuggestions}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-100 hover:bg-gray-200'
                } text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Sparkles size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh Suggestions'}</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};