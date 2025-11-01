import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectItem } from '../../types';

interface ArchiveSidebarProps {
  archivedCards: ProjectItem[];
  filteredCards: ProjectItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: 'all' | ProjectItem['state'];
  onFilterChange: (type: 'all' | ProjectItem['state']) => void;
  onRestore: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}

export const ArchiveSidebar: React.FC<ArchiveSidebarProps> = ({
  archivedCards,
  filteredCards,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  onRestore,
  onDelete,
  isOpen,
  onToggle,
  isDarkMode,
}) => {
  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 ${
          isDarkMode ? 'glass-dark' : 'glass'
        } border-l-2 border-t-2 border-b-2 ${
          isDarkMode ? 'border-cyan-400' : 'border-cyan-500'
        } rounded-l-2xl p-4 shadow-glass z-40 hover:shadow-glow-cyan transition-all`}
      >
        <div className="flex flex-col items-center gap-2">
          <motion.span
            animate={{ rotate: isOpen ? 0 : 180 }}
            className="text-2xl"
          >
            {isOpen ? '→' : '←'}
          </motion.span>
          <span className="text-2xl">📦</span>
          {archivedCards.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs bg-gradient-green text-white rounded-full px-2 py-1 font-bold shadow-lg"
            >
              {archivedCards.length}
            </motion.span>
          )}
        </div>
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 h-full w-96 ${
              isDarkMode ? 'glass-dark' : 'glass'
            } border-l-2 ${
              isDarkMode ? 'border-cyan-400' : 'border-cyan-500'
            } shadow-2xl z-30 backdrop-blur-2xl`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    📦 Archived Ideas
                  </h2>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    ({archivedCards.length})
                  </span>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Search archives..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                    isDarkMode
                      ? 'bg-gray-800/60 border border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white/80 border border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />

                {/* Filter Pills */}
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin pb-2">
                  {['all', 'decided', 'exploring', 'parked'].map((type) => (
                    <motion.button
                      key={type}
                      onClick={() => onFilterChange(type as any)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        filterType === type
                          ? 'bg-gradient-green text-white shadow-lg'
                          : isDarkMode
                          ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {filteredCards.length === 0 ? (
                  <div className="text-center mt-16">
                    <p className="text-6xl mb-4">📭</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No archived cards
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-2xl border-2 hover:shadow-lg transition-all ${
                          isDarkMode
                            ? 'bg-gray-800/40 border-gray-600 hover:border-cyan-400'
                            : 'bg-white/60 border-gray-200 hover:border-cyan-500'
                        }`}
                      >
                        {/* Card Type Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getTypeColor(card.state, isDarkMode)}`}>
                            {card.state}
                          </span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(card.archivedAt)}
                          </span>
                        </div>

                        {/* Card Content */}
                        <p className={`text-sm mb-3 line-clamp-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {card.text}
                        </p>

                        {/* Tags */}
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {card.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onRestore(card.id)}
                            className="flex-1 px-3 py-2 bg-gradient-green text-white text-xs font-semibold rounded-xl hover:shadow-lg transition-all"
                          >
                            ↩️ Restore
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onDelete(card.id)}
                            className="px-3 py-2 bg-red-500/20 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-500/30 transition-all"
                          >
                            🗑️
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Helper functions
function getTypeColor(type: ProjectItem['state'], isDarkMode: boolean): string {
  switch (type) {
    case 'decided':
      return isDarkMode ? 'bg-green-900/40 text-cyan-400 border border-green-600' : 'bg-green-100 text-green-700 border border-green-300';
    case 'exploring':
      return isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-600' : 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'parked':
      return isDarkMode ? 'bg-gray-700/40 text-gray-400 border border-gray-600' : 'bg-gray-100 text-gray-700 border border-gray-300';
    default:
      return isDarkMode ? 'bg-gray-700/40 text-gray-400' : 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
