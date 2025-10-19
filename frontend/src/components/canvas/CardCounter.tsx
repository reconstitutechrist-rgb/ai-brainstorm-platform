import React from 'react';
import { motion } from 'framer-motion';
import type { CardCapacityState } from '../../types/canvas.types';
import { CAPACITY_LIMITS } from '../../types/canvas.types';

interface CardCounterProps {
  capacityState: CardCapacityState;
  className?: string;
  isDarkMode: boolean;
}

export const CardCounter: React.FC<CardCounterProps> = ({
  capacityState,
  className = '',
  isDarkMode
}) => {
  const { activeCards, archivedCards, capacityPercentage, warningLevel } = capacityState;

  const getColorClasses = () => {
    switch (warningLevel) {
      case 'critical':
        return {
          border: 'border-red-400',
          text: 'text-red-500',
          bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-50/80',
          progress: 'bg-gradient-to-r from-red-500 to-red-600'
        };
      case 'warning':
        return {
          border: 'border-amber-400',
          text: 'text-amber-500',
          bg: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50/80',
          progress: 'bg-gradient-to-r from-amber-500 to-amber-600'
        };
      case 'info':
        return {
          border: 'border-blue-400',
          text: 'text-blue-500',
          bg: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50/80',
          progress: 'bg-gradient-to-r from-blue-500 to-blue-600'
        };
      default:
        return {
          border: 'border-green-400',
          text: 'text-green-500',
          bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-50/80',
          progress: 'bg-gradient-to-r from-green-500 to-green-600'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${colors.border} ${colors.bg} backdrop-blur-lg ${className}`}
    >
      {/* Active Cards Count */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Active:
        </span>
        <span className={`text-2xl font-bold ${colors.text}`}>
          {activeCards}
        </span>
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          / {CAPACITY_LIMITS.HARD_LIMIT}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${colors.progress} shadow-lg`}
        />
      </div>

      {/* Archived Cards (if any) */}
      {archivedCards > 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Archived:
          </span>
          <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>
            {archivedCards}
          </span>
        </div>
      )}

      {/* Warning Icon */}
      {warningLevel !== 'none' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="flex items-center"
        >
          {warningLevel === 'critical' && <span className="text-2xl">⚠️</span>}
          {warningLevel === 'warning' && <span className="text-2xl">⚡</span>}
          {warningLevel === 'info' && <span className="text-2xl">💡</span>}
        </motion.div>
      )}
    </motion.div>
  );
};
