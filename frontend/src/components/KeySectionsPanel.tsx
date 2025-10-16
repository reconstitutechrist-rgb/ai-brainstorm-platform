import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Target, HelpCircle, AlertTriangle } from 'lucide-react';
import type { ExtractedSection } from '../utils/markdownSectionExtractor';

interface KeySectionsPanelProps {
  nextSteps: ExtractedSection | null;
  openQuestions: ExtractedSection | null;
  riskAssessment: ExtractedSection | null;
  isDarkMode: boolean;
}

interface SectionCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'orange';
  isDarkMode: boolean;
  isEmpty: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  content,
  icon,
  color,
  isDarkMode,
  isEmpty
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Color schemes for each type
  const colorSchemes = {
    blue: {
      bg: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: isDarkMode ? 'border-blue-700' : 'border-blue-200',
      text: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      iconBg: isDarkMode ? 'bg-blue-800' : 'bg-blue-100'
    },
    yellow: {
      bg: isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
      border: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
      text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
      iconBg: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100'
    },
    orange: {
      bg: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      border: isDarkMode ? 'border-orange-700' : 'border-orange-200',
      text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      iconBg: isDarkMode ? 'bg-orange-800' : 'bg-orange-100'
    }
  };

  const scheme = colorSchemes[color];

  if (isEmpty) {
    return (
      <div
        className={`
          ${scheme.bg} ${scheme.border}
          border rounded-lg p-4 opacity-50
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`${scheme.iconBg} p-2 rounded-lg`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${scheme.text}`}>{title}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              No {title.toLowerCase()} found in this document
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parse content into list items
  const items = content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^[•\-*]\s*/, '').trim());

  const previewItems = items.slice(0, 2);
  const hasMore = items.length > 2;

  return (
    <motion.div
      className={`
        ${scheme.bg} ${scheme.border}
        border rounded-lg p-4
        transition-all duration-200
        hover:shadow-md
      `}
      layout
    >
      <div className="flex items-start gap-3">
        <div className={`${scheme.iconBg} p-2 rounded-lg flex-shrink-0`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-semibold ${scheme.text}`}>{title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${scheme.iconBg} ${scheme.text}`}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className={`mt-2 space-y-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {previewItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className={`${scheme.text} flex-shrink-0 mt-1`}>•</span>
                <span className="flex-1">{item}</span>
              </div>
            ))}

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  {items.slice(2).map((item, idx) => (
                    <div key={idx + 2} className="flex items-start gap-2 text-sm">
                      <span className={`${scheme.text} flex-shrink-0 mt-1`}>•</span>
                      <span className="flex-1">{item}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`
                mt-3 flex items-center gap-1 text-sm font-medium
                ${scheme.text} hover:underline
                transition-colors
              `}
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Show {items.length - 2} more</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const KeySectionsPanel: React.FC<KeySectionsPanelProps> = ({
  nextSteps,
  openQuestions,
  riskAssessment,
  isDarkMode
}) => {
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Check if we have any sections to display
  const hasSections = !!(nextSteps || openQuestions || riskAssessment);

  if (!hasSections) {
    return null; // Don't show panel if no sections found
  }

  return (
    <motion.div
      className={`
        ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-lg mb-6 overflow-hidden
      `}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className={`
          w-full px-6 py-4 flex items-center justify-between
          ${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}
            p-2 rounded-lg
          `}>
            <Target className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Key Insights
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Important sections extracted from this document
            </p>
          </div>
        </div>
        {isPanelExpanded ? (
          <ChevronUp className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
        ) : (
          <ChevronDown className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
        )}
      </button>

      <AnimatePresence>
        {isPanelExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <SectionCard
                title="Next Steps"
                content={nextSteps?.content || ''}
                icon={<Target className="w-5 h-5" />}
                color="blue"
                isDarkMode={isDarkMode}
                isEmpty={!nextSteps}
              />

              <SectionCard
                title="Open Questions"
                content={openQuestions?.content || ''}
                icon={<HelpCircle className="w-5 h-5" />}
                color="yellow"
                isDarkMode={isDarkMode}
                isEmpty={!openQuestions}
              />

              <SectionCard
                title="Risk Assessment"
                content={riskAssessment?.content || ''}
                icon={<AlertTriangle className="w-5 h-5" />}
                color="orange"
                isDarkMode={isDarkMode}
                isEmpty={!riskAssessment}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default KeySectionsPanel;
