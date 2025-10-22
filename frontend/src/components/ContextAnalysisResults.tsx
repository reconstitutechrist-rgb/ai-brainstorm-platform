import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Lightbulb, X } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

interface ContextAnalysisResultsProps {
  contextAnalysis: {
    conflicts: Array<{
      decidedItem: string;
      referenceContent: string;
      severity: 'critical' | 'high' | 'medium';
    }>;
    confirmations: Array<{
      decidedItem: string;
      referenceSupport: string;
    }>;
    newInsights: Array<{
      insight: string;
      relevance: 'high' | 'medium' | 'low';
    }>;
  };
  onClose?: () => void;
}

export const ContextAnalysisResults: React.FC<ContextAnalysisResultsProps> = ({
  contextAnalysis,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-600 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-gray-600 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'medium':
        return 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30';
      case 'low':
        return 'text-teal-600 bg-teal-500/10 border-teal-500/30';
      default:
        return 'text-gray-600 bg-gray-500/10 border-gray-500/30';
    }
  };

  const hasResults =
    contextAnalysis.conflicts.length > 0 ||
    contextAnalysis.confirmations.length > 0 ||
    contextAnalysis.newInsights.length > 0;

  if (!hasResults) {
    return (
      <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
        <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No conflicts, confirmations, or new insights detected.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-xl p-6 space-y-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#00ffaa]/20">
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Context-Aware Analysis Results
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Conflicts */}
      {contextAnalysis.conflicts.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="text-red-500" size={20} />
            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Conflicts Detected ({contextAnalysis.conflicts.length})
            </h4>
          </div>
          <div className="space-y-3">
            {contextAnalysis.conflicts.map((conflict, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(conflict.severity)} ${
                  isDarkMode ? 'bg-black/20' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-1 rounded ${getSeverityColor(
                      conflict.severity
                    )}`}
                  >
                    {conflict.severity}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Your Decision:
                    </span>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {conflict.decidedItem}
                    </p>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Reference Suggests:
                    </span>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {conflict.referenceContent}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmations */}
      {contextAnalysis.confirmations.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="text-green-500" size={20} />
            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Confirmations ({contextAnalysis.confirmations.length})
            </h4>
          </div>
          <div className="space-y-3">
            {contextAnalysis.confirmations.map((confirmation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 border-green-500/30 ${
                  isDarkMode ? 'bg-green-500/10' : 'bg-green-50'
                }`}
              >
                <div className="space-y-2">
                  <div>
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Your Decision:
                    </span>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {confirmation.decidedItem}
                    </p>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Reference Confirms:
                    </span>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {confirmation.referenceSupport}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New Insights */}
      {contextAnalysis.newInsights.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="text-[#00ffaa]" size={20} />
            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              New Insights ({contextAnalysis.newInsights.length})
            </h4>
          </div>
          <div className="space-y-3">
            {contextAnalysis.newInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${getRelevanceColor(insight.relevance)} ${
                  isDarkMode ? 'bg-black/20' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-1 rounded ${getRelevanceColor(
                      insight.relevance
                    )}`}
                  >
                    {insight.relevance} Relevance
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {insight.insight}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
