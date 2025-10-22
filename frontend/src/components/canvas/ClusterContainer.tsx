import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';

interface ClusterContainerProps {
  clusterId: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  cardCount: number;
  isDarkMode: boolean;
  children: React.ReactNode;
}

export const ClusterContainer: React.FC<ClusterContainerProps> = ({
  clusterId,
  name,
  color,
  position,
  cardCount,
  isDarkMode,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Calculate container dimensions based on children
  // Assuming 3 cards per row, with card width ~240px + spacing
  const cardsPerRow = 3;
  const cardWidth = 260;
  const cardHeight = 180;
  const padding = 20;
  const headerHeight = 50;

  const rows = Math.ceil(cardCount / cardsPerRow);
  const cols = Math.min(cardCount, cardsPerRow);

  const containerWidth = (cols * cardWidth) + (padding * 2);
  const calcContainerHeight = isExpanded
    ? (rows * cardHeight) + headerHeight + (padding * 2)
    : headerHeight;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute' as const,
        left: position.x - padding,
        top: position.y - headerHeight - padding,
        width: containerWidth,
        minWidth: 320,
        zIndex: 0,
      }}
      className={`rounded-xl border-2 transition-all duration-300 ${
        isDarkMode ? 'bg-gray-900/40' : 'bg-white/40'
      }`}
      data-cluster-id={clusterId}
    >
      {/* Colored border and background */}
      <div
        className="absolute inset-0 rounded-xl opacity-20"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
          border: `2px solid ${color}`,
        }}
      />

      {/* Cluster Header */}
      <div
        className={`relative flex items-center justify-between px-4 py-3 rounded-t-xl cursor-pointer ${
          isDarkMode ? 'bg-gray-800/60' : 'bg-white/60'
        }`}
        style={{
          borderBottom: isExpanded ? `2px solid ${color}40` : 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            {isExpanded ? (
              <ChevronDown size={18} style={{ color }} />
            ) : (
              <ChevronRight size={18} style={{ color }} />
            )}
          </motion.div>

          {/* Cluster Name */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3
              className={`font-semibold text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              {name}
            </h3>
          </div>

          {/* Card Count Badge */}
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </div>
        </div>

        {/* Minimize/Maximize Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(!isMinimized);
          }}
          className={`p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors`}
        >
          {isMinimized ? (
            <Maximize2 size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          ) : (
            <Minimize2 size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          )}
        </button>
      </div>

      {/* Cluster Content - Cards Container */}
      <AnimatePresence>
        {isExpanded && !isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized State */}
      {isMinimized && (
        <div
          className={`relative px-4 py-2 text-xs text-center ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          Click to restore
        </div>
      )}
    </motion.div>
  );
};
