import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { extractFromMultipleDocuments } from '../utils/markdownSectionExtractor';

interface OverviewQuickInsightsProps {
  documents: Array<{ document_type: string; content: string; title: string }>;
  isDarkMode: boolean;
  onViewDocument?: (documentType: string) => void;
}

const OverviewQuickInsights: React.FC<OverviewQuickInsightsProps> = ({
  documents,
  isDarkMode,
  onViewDocument
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (documents.length === 0) {
    return null;
  }

  // Extract all key sections from all documents
  const allSections = extractFromMultipleDocuments(documents);

  // Check if we have any sections
  const hasSections =
    allSections.nextSteps.length > 0 ||
    allSections.openQuestions.length > 0 ||
    allSections.riskAssessment.length > 0;

  if (!hasSections) {
    return null;
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionSummaryCard = ({
    title,
    icon,
    color,
    items,
    sectionKey
  }: {
    title: string;
    icon: React.ReactNode;
    color: 'blue' | 'yellow' | 'orange';
    items: Array<any>;
    sectionKey: string;
  }) => {
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
    const isExpanded = expandedSection === sectionKey;
    const totalItems = items.reduce((sum, section) => {
      const lines = section.content.split('\n').filter((l: string) => l.trim().length > 0);
      return sum + lines.length;
    }, 0);

    if (items.length === 0) {
      return null;
    }

    return (
      <motion.div
        className={`
          ${scheme.bg} ${scheme.border}
          border rounded-xl overflow-hidden
        `}
        layout
      >
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className={`${scheme.iconBg} p-2 rounded-lg`}>
              {icon}
            </div>
            <div className="text-left">
              <h3 className={`font-semibold ${scheme.text}`}>{title}</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} across {items.length} {items.length === 1 ? 'document' : 'documents'}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className={scheme.text} size={20} />
          ) : (
            <ChevronDown className={scheme.text} size={20} />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {items.map((section, idx) => {
                  const lines = section.content
                    .split('\n')
                    .filter((l: string) => l.trim().length > 0)
                    .map((l: string) => l.replace(/^[•\-*]\s*/, '').trim());

                  return (
                    <div key={idx} className={`
                      ${isDarkMode ? 'bg-white/5' : 'bg-white/50'}
                      rounded-lg p-3
                    `}>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={14} className={`${scheme.text} flex-shrink-0`} />
                          <span
                            className={`text-xs font-medium ${scheme.text} truncate`}
                            title={section.source}
                          >
                            {section.source}
                          </span>
                        </div>
                        {onViewDocument && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const docType = documents.find(d => d.title === section.source)?.document_type;
                              if (docType) onViewDocument(docType);
                            }}
                            className={`text-xs ${scheme.text} hover:underline flex-shrink-0 whitespace-nowrap`}
                          >
                            View →
                          </button>
                        )}
                      </div>
                      <div className={`space-y-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {lines.map((line: string, lineIdx: number) => (
                          <div key={lineIdx} className="flex items-start gap-2">
                            <span className={`${scheme.text} flex-shrink-0 mt-1`}>•</span>
                            <span className="flex-1">{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`
          ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}
          p-2 rounded-lg
        `}>
          <Target size={24} />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Quick Insights
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Key sections from your generated documents
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <SectionSummaryCard
          title="Next Steps"
          icon={<Target size={18} />}
          color="blue"
          items={allSections.nextSteps}
          sectionKey="next_steps"
        />

        <SectionSummaryCard
          title="Open Questions"
          icon={<HelpCircle size={18} />}
          color="yellow"
          items={allSections.openQuestions}
          sectionKey="open_questions"
        />

        <SectionSummaryCard
          title="Risk Assessment"
          icon={<AlertTriangle size={18} />}
          color="orange"
          items={allSections.riskAssessment}
          sectionKey="risks"
        />
      </div>
    </motion.div>
  );
};

export default OverviewQuickInsights;
