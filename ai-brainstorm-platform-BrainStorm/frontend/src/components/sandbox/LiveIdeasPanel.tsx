import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import {
  Lightbulb,
  ChevronDown,
  ChevronRight,
  User,
  Bot,
  Users,
  Clock,
} from 'lucide-react';

interface ExtractedIdea {
  id: string;
  source: 'user_mention' | 'ai_suggestion' | 'collaborative';
  conversationContext: {
    messageId: string;
    timestamp: string;
    leadingQuestions: string[];
    topic?: string;
    topicConfidence?: number;
    relatedMessageIds?: string[];
  };
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

interface TopicGroup {
  topic: string;
  icon: string;
  ideas: ExtractedIdea[];
  messageRange: {
    start: string;
    end: string;
  };
}

interface LiveIdeasPanelProps {
  ideas: ExtractedIdea[];
  conversationId?: string;
  onEndSession?: () => void;
  onReviewConversation?: () => void;
}

export const LiveIdeasPanel: React.FC<LiveIdeasPanelProps> = ({
  ideas,
  conversationId: _conversationId,
  onEndSession,
  onReviewConversation,
}) => {
  const { isDarkMode } = useThemeStore();
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());
  const [isGrouping, setIsGrouping] = useState(false);

  // Group ideas by conversation context/topic
  useEffect(() => {
    if (ideas.length > 0) {
      groupIdeasByContext();
    } else {
      setTopicGroups([]);
    }
  }, [ideas]);

  const groupIdeasByContext = () => {
    setIsGrouping(true);

    // Group by topic if available, otherwise create a single group
    const grouped: { [topic: string]: ExtractedIdea[] } = {};
    const topicIcons: { [topic: string]: string } = {};

    for (const idea of ideas) {
      const topic = idea.conversationContext.topic || 'General Ideas';
      if (!grouped[topic]) {
        grouped[topic] = [];
        // Default icons for common topics
        topicIcons[topic] = getTopicIcon(topic);
      }
      grouped[topic].push(idea);
    }

    const groups: TopicGroup[] = Object.entries(grouped).map(([topic, ideas]) => ({
      topic,
      icon: topicIcons[topic],
      ideas,
      messageRange: {
        start: ideas[0]?.conversationContext.timestamp || '',
        end: ideas[ideas.length - 1]?.conversationContext.timestamp || '',
      },
    }));

    // Sort by first idea timestamp
    groups.sort((a, b) => {
      const aTime = a.ideas[0]?.conversationContext.timestamp || '';
      const bTime = b.ideas[0]?.conversationContext.timestamp || '';
      return aTime.localeCompare(bTime);
    });

    setTopicGroups(groups);

    // Auto-expand all topics initially
    setExpandedTopics(new Set(groups.map(g => g.topic)));

    setIsGrouping(false);
  };

  const getTopicIcon = (topic: string): string => {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('auth') || lowerTopic.includes('login')) return '🔐';
    if (lowerTopic.includes('mobile') || lowerTopic.includes('responsive')) return '📱';
    if (lowerTopic.includes('ui') || lowerTopic.includes('design')) return '🎨';
    if (lowerTopic.includes('performance') || lowerTopic.includes('speed')) return '⚡';
    if (lowerTopic.includes('data') || lowerTopic.includes('database')) return '💾';
    if (lowerTopic.includes('api') || lowerTopic.includes('endpoint')) return '🔌';
    if (lowerTopic.includes('security')) return '🛡️';
    if (lowerTopic.includes('test') || lowerTopic.includes('qa')) return '🧪';
    if (lowerTopic.includes('deploy') || lowerTopic.includes('infrastructure')) return '🚀';
    if (lowerTopic.includes('document') || lowerTopic.includes('doc')) return '📄';
    return '💡';
  };

  const toggleTopic = (topic: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleIdea = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
    }
    setExpandedIdeas(newExpanded);
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

  const statusEmojis = {
    mentioned: '🌱',
    exploring: '🔍',
    refined: '✨',
    ready_to_extract: '✅',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Live Ideas
          </h3>
          <div
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ideas.length} total
          </div>
        </div>

        <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Ideas organized by conversation context
        </p>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Review Conversation Button */}
          {onReviewConversation && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onReviewConversation}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium transition-all flex items-center justify-center space-x-2 border border-blue-500/30"
            >
              <Lightbulb size={18} />
              <span>Review for Missed Ideas</span>
            </motion.button>
          )}

          {/* End Session Button */}
          {ideas.length > 0 && onEndSession && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onEndSession}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium transition-all flex items-center justify-center space-x-2 border border-amber-500/30"
            >
              <Clock size={18} />
              <span>End Session & Review</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Topic Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isGrouping && (
          <div className="text-center py-8">
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Grouping ideas by context...
            </div>
          </div>
        )}

        {!isGrouping && topicGroups.map((group) => {
          const isExpanded = expandedTopics.has(group.topic);

          return (
            <div key={group.topic} className="space-y-2">
              {/* Topic Header */}
              <button
                onClick={() => toggleTopic(group.topic)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  ) : (
                    <ChevronRight size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                  <span className="text-xl">{group.icon}</span>
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {group.topic}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {group.ideas.length} {group.ideas.length === 1 ? 'idea' : 'ideas'}
                    </div>
                  </div>
                </div>
              </button>

              {/* Topic Ideas */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pl-2"
                  >
                    {group.ideas.map((idea) => {
                      const SourceIcon = sourceIcons[idea.source];
                      const isIdeaExpanded = expandedIdeas.has(idea.id);

                      return (
                        <motion.div
                          key={idea.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className={`rounded-xl p-3 transition-all cursor-pointer ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleIdea(idea.id)}
                        >
                          {/* Idea Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                {isIdeaExpanded ? (
                                  <ChevronDown size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                ) : (
                                  <ChevronRight size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                )}
                                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {idea.idea.title}
                                </h4>
                              </div>
                              {!isIdeaExpanded && (
                                <p
                                  className={`text-xs line-clamp-2 ml-5 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}
                                >
                                  {idea.idea.description}
                                </p>
                              )}
                            </div>
                            <span className="text-lg ml-2">{statusEmojis[idea.status]}</span>
                          </div>

                          {/* Expanded Details */}
                          {isIdeaExpanded && (
                            <div className="ml-5 space-y-2 mt-3">
                              {/* Full Description */}
                              <div>
                                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Description:
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {idea.idea.description}
                                </p>
                              </div>

                              {/* User Quote */}
                              {idea.idea.userIntent && idea.idea.userIntent !== 'Review analysis' && (
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    What you said:
                                  </p>
                                  <p className={`text-xs italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    "{idea.idea.userIntent}"
                                  </p>
                                </div>
                              )}

                              {/* Reasoning */}
                              {idea.idea.reasoning && (
                                <div>
                                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Why:
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {idea.idea.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Meta Info */}
                          <div className="flex items-center justify-between mt-2">
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
                            </div>

                            {/* Topic Confidence */}
                            {idea.conversationContext.topicConfidence && (
                              <div
                                className={`text-xs px-2 py-0.5 rounded ${
                                  isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {idea.conversationContext.topicConfidence}% match
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {idea.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2 flex-wrap gap-1">
                              {idea.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    isDarkMode
                                      ? 'bg-white/5 text-gray-500'
                                      : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
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
        {!isGrouping && ideas.length === 0 && (
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
