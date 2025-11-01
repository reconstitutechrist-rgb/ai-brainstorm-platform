import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronRight,
  Tag,
  User,
  Bot,
  Users,
} from 'lucide-react';

interface ExtractedIdea {
  id: string;
  source: 'user_mention' | 'ai_suggestion' | 'collaborative';
  idea: {
    title: string;
    description: string;
    reasoning: string;
    userIntent: string;
  };
  status: 'mentioned' | 'exploring' | 'refined' | 'ready_to_extract';
  tags: string[];
  innovationLevel: 'practical' | 'moderate' | 'experimental';
}

interface IdeaBoardPanelProps {
  ideas: ExtractedIdea[];
  selectedIdeaIds: Set<string>;
  onToggleSelect: (ideaId: string) => void;
  onExtract: () => void;
  onUpdateStatus: (ideaId: string, status: string) => void;
}

export const IdeaBoardPanel: React.FC<IdeaBoardPanelProps> = ({
  ideas,
  selectedIdeaIds,
  onToggleSelect,
  onExtract,
  onUpdateStatus,
}) => {
  const { isDarkMode } = useThemeStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['mentioned', 'exploring', 'refined', 'ready_to_extract'])
  );

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const groupedIdeas = {
    mentioned: ideas.filter((i) => i.status === 'mentioned'),
    exploring: ideas.filter((i) => i.status === 'exploring'),
    refined: ideas.filter((i) => i.status === 'refined'),
    ready_to_extract: ideas.filter((i) => i.status === 'ready_to_extract'),
  };

  const statusConfig = {
    mentioned: {
      label: 'Mentioned',
      icon: Lightbulb,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      emoji: '🌱',
    },
    exploring: {
      label: 'Exploring',
      icon: Sparkles,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      emoji: '🔍',
    },
    refined: {
      label: 'Refined',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      emoji: '✨',
    },
    ready_to_extract: {
      label: 'Ready to Extract',
      icon: CheckCircle2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      emoji: '✅',
    },
  };

  const sourceIcons = {
    user_mention: User,
    ai_suggestion: Bot,
    collaborative: Users,
  };

  const innovationColors = {
    practical: 'text-blue-400 bg-blue-500/20',
    moderate: 'text-purple-400 bg-purple-500/20',
    experimental: 'text-orange-400 bg-orange-500/20',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Ideas from Conversation
          </h3>
          <div
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ideas.length} total
          </div>
        </div>

        {/* Extract Button */}
        {selectedIdeaIds.size > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onExtract}
            className="w-full px-4 py-2.5 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all flex items-center justify-center space-x-2"
          >
            <Download size={18} />
            <span>Extract {selectedIdeaIds.size} to Project</span>
          </motion.button>
        )}
      </div>

      {/* Ideas List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {Object.entries(groupedIdeas).map(([status, groupIdeas]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const isExpanded = expandedGroups.has(status);

          if (groupIdeas.length === 0) return null;

          return (
            <div key={status} className="space-y-2">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(status)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  ) : (
                    <ChevronRight size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                  <span className="text-lg">{config.emoji}</span>
                  <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                  <div
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {groupIdeas.length}
                  </div>
                </div>
              </button>

              {/* Group Ideas */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pl-2"
                  >
                    {groupIdeas.map((idea) => {
                      const SourceIcon = sourceIcons[idea.source];
                      const isSelected = selectedIdeaIds.has(idea.id);

                      return (
                        <motion.div
                          key={idea.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className={`relative rounded-xl p-3 cursor-pointer transition-all ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                          } ${isSelected ? 'ring-2 ring-cyan-primary' : ''}`}
                          onClick={() => onToggleSelect(idea.id)}
                        >
                          {/* Selection Checkbox */}
                          <div
                            className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-cyan-primary border-cyan-primary'
                                : isDarkMode
                                ? 'border-white/30'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Idea Content */}
                          <div className="pr-8">
                            {/* Title */}
                            <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {idea.idea.title}
                            </h4>

                            {/* Description */}
                            <p
                              className={`text-xs mb-2 line-clamp-2 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}
                            >
                              {idea.idea.description}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {/* Source */}
                                <SourceIcon
                                  size={12}
                                  className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}
                                />

                                {/* Innovation Level */}
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    innovationColors[idea.innovationLevel]
                                  }`}
                                >
                                  {idea.innovationLevel}
                                </span>

                                {/* Tags */}
                                {idea.tags.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Tag size={10} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {idea.tags.slice(0, 2).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Actions */}
                            <div className="mt-2 flex gap-1">
                              {idea.status === 'mentioned' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(idea.id, 'exploring');
                                  }}
                                  className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                >
                                  Explore
                                </button>
                              )}
                              {idea.status === 'exploring' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(idea.id, 'refined');
                                  }}
                                  className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
                                >
                                  Refine
                                </button>
                              )}
                              {idea.status === 'refined' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(idea.id, 'ready_to_extract');
                                  }}
                                  className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                                >
                                  Mark Ready
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Empty State */}
        {ideas.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Lightbulb size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              No ideas yet
            </h4>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Ideas will appear here as you chat with AI
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
