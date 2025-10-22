import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { CheckCircle2, Brain, Archive, ChevronDown, ChevronRight, Clock, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ProjectItem } from '../types';

export const SessionTrackingPanel: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'decided' | 'exploring' | 'parked'>('decided');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (!currentProject) return null;

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Find related items based on citation timestamp proximity and text similarity
  const findRelatedItems = (item: ProjectItem): ProjectItem[] => {
    if (!item.citation) return [];

    return currentProject.items
      .filter(otherItem => {
        if (otherItem.id === item.id || !otherItem.citation) return false;

        // Check if citations are within 5 minutes of each other
        const timeDiff = Math.abs(
          new Date(item.citation!.timestamp).getTime() -
          new Date(otherItem.citation.timestamp).getTime()
        );
        const fiveMinutes = 5 * 60 * 1000;

        // Check for text similarity (simple word overlap)
        const itemWords = new Set(item.text.toLowerCase().split(/\s+/));
        const otherWords = otherItem.text.toLowerCase().split(/\s+/);
        const commonWords = otherWords.filter(word => itemWords.has(word)).length;

        return timeDiff < fiveMinutes || commonWords >= 3;
      })
      .slice(0, 3); // Limit to 3 related items
  };

  const tabs = [
    {
      id: 'decided' as const,
      label: 'Decisions',
      icon: CheckCircle2,
      color: 'green',
      count: currentProject.items.filter(i => i.state === 'decided').length
    },
    {
      id: 'exploring' as const,
      label: 'Exploring',
      icon: Brain,
      color: 'blue',
      count: currentProject.items.filter(i => i.state === 'exploring').length
    },
    {
      id: 'parked' as const,
      label: 'Parked',
      icon: Archive,
      color: 'yellow',
      count: currentProject.items.filter(i => i.state === 'parked').length
    }
  ];

  const currentItems = currentProject.items.filter(item => item.state === activeTab);

  return (
    <div
      className={`${
        isDarkMode ? 'glass-dark' : 'glass'
      } rounded-3xl shadow-glass h-[calc(100vh-20rem)] flex flex-col`}
    >
      {/* Header */}
      <div className="p-6 border-b border-green-metallic/20">
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Session Tracking
        </h3>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Real-time view of your project progress
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-green-metallic/20">
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
                    ? 'text-green-500'
                    : tab.color === 'blue'
                    ? 'text-blue-500'
                    : 'text-yellow-500'
                }`}
              />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {tab.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  tab.color === 'green'
                    ? 'bg-green-500/20 text-green-400'
                    : tab.color === 'blue'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-yellow-500/20 text-yellow-600'
                }`}
              >
                {tab.count}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-1 ${
                    tab.color === 'green'
                      ? 'bg-green-500'
                      : tab.color === 'blue'
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence mode="wait">
          {currentItems.length === 0 ? (
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
                {activeTab === 'decided' && 'No decisions made yet'}
                {activeTab === 'exploring' && 'No ideas being explored'}
                {activeTab === 'parked' && 'No ideas parked'}
              </p>
              <p className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Start chatting to see items appear here
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
                  relatedItems={findRelatedItems(item)}
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
  relatedItems: ProjectItem[];
}

const SessionItemCard: React.FC<SessionItemCardProps> = ({
  item,
  index,
  type,
  isDarkMode,
  isExpanded,
  onToggleExpand,
  relatedItems
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

                {/* Cross-References to Related Items */}
                {relatedItems.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Link2 size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Related Decisions ({relatedItems.length}):
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {relatedItems.map((relatedItem) => {
                        const stateColor = relatedItem.state === 'decided'
                          ? 'text-green-400'
                          : relatedItem.state === 'exploring'
                          ? 'text-blue-400'
                          : 'text-yellow-600';

                        return (
                          <div
                            key={relatedItem.id}
                            className={`text-xs p-2 rounded-lg ${
                              isDarkMode ? 'bg-white/5' : 'bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <span className={`${stateColor} flex-shrink-0 mt-0.5`}>•</span>
                              <div className="flex-1">
                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                                  {relatedItem.text}
                                </p>
                                {relatedItem.citation && (
                                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    {format(new Date(relatedItem.citation.timestamp), 'MMM d, h:mm a')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
