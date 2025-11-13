import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import {
  CheckCircle2,
  FileText,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface SessionSummary {
  success: boolean;
  sessionId: string;
  sessionName: string;
  documentsCreated: any[];
  documentsUpdated: any[];
  projectItemsAdded: number;
  itemsDetails: {
    decided: number;
    exploring: number;
  };
  sandboxStatus: string;
}

interface SessionCompleteSummaryProps {
  summary: SessionSummary;
  onViewDocs: () => void;
  onNewSession: () => void;
  onClose: () => void;
}

export const SessionCompleteSummary: React.FC<SessionCompleteSummaryProps> = ({
  summary,
  onViewDocs,
  onNewSession,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${
          isDarkMode ? 'glass-dark' : 'glass'
        }`}
      >
        {/* Success Header */}
        <div className="px-6 py-8 bg-gradient-to-r from-cyan-primary to-cyan-primary-dark text-white">
          <div className="flex items-center justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 size={64} />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Session Complete!</h2>
          <p className="text-center text-green-100">
            Your brainstorm session has been finalized and documents have been generated
          </p>
        </div>

        {/* Summary Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Session Name */}
          <div
            className={`p-4 rounded-xl ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Session Name
            </div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {summary.sessionName}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Documents Created */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`p-4 rounded-xl ${
                isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <FileText size={24} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {summary.documentsCreated.length}
                </div>
              </div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                Documents Created
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Session records generated
              </div>
            </motion.div>

            {/* Documents Updated */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className={`p-4 rounded-xl ${
                isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <RefreshCw size={24} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {summary.documentsUpdated.length}
                </div>
              </div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                Documents Updated
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                Live docs regenerated
              </div>
            </motion.div>

            {/* Ideas Added */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className={`p-4 rounded-xl ${
                isDarkMode ? 'bg-cyan-500/10' : 'bg-green-50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp size={24} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {summary.projectItemsAdded}
                </div>
              </div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                Ideas Added
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                To your main project
              </div>
            </motion.div>

            {/* Decided Items */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className={`p-4 rounded-xl ${
                isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle2 size={24} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {summary.itemsDetails.decided}
                </div>
              </div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                Marked Decided
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Ready to implement
              </div>
            </motion.div>
          </div>

          {/* Documents Created List */}
          {summary.documentsCreated.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                New Documents
              </h3>
              <div className="space-y-2">
                {summary.documentsCreated.map((doc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isDarkMode ? 'bg-white/5' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {doc.title || doc.document_type}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      New
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Updated List */}
          {summary.documentsUpdated.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Updated Documents
              </h3>
              <div className="space-y-2">
                {summary.documentsUpdated.map((doc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isDarkMode ? 'bg-white/5' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <RefreshCw size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {doc.title || doc.document_type}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      v{doc.version}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onViewDocs}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              <ExternalLink size={18} />
              <span>View in Intelligence Hub</span>
            </button>
            <button
              onClick={onNewSession}
              className="flex-1 px-4 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>New Session</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className={`w-full text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'} transition-colors`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
