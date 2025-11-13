import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CapacityWarning as CapacityWarningType } from '../../types/canvas.types';

interface CapacityWarningProps {
  warning: CapacityWarningType;
  onDismiss: () => void;
  onAction?: (action: string) => void;
  isDarkMode: boolean;
}

export const CapacityWarning: React.FC<CapacityWarningProps> = ({
  warning,
  onDismiss,
  onAction,
  isDarkMode,
}) => {
  const getBackgroundClasses = () => {
    const base = isDarkMode ? 'glass-dark' : 'glass';
    switch (warning.level) {
      case 'critical':
        return `${base} border-2 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]`;
      case 'warning':
        return `${base} border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]`;
      case 'info':
        return `${base} border-2 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]`;
      default:
        return `${base} border-2 border-gray-400`;
    }
  };

  const getTextColorClass = () => {
    switch (warning.level) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getIcon = () => {
    switch (warning.level) {
      case 'critical':
        return { emoji: '⚠️', title: 'Canvas at Capacity' };
      case 'warning':
        return { emoji: '⚡', title: 'Canvas Getting Crowded' };
      case 'info':
        return { emoji: '💡', title: 'Organization Suggestion' };
      default:
        return { emoji: 'ℹ️', title: 'Notice' };
    }
  };

  const icon = getIcon();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-24 right-6 max-w-md p-5 rounded-3xl z-50 ${getBackgroundClasses()}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-3xl ${getTextColorClass()}`}>
              {icon.emoji}
            </span>
            <h3 className={`font-bold text-lg ${getTextColorClass()}`}>
              {icon.title}
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors text-xl`}
          >
            ✕
          </button>
        </div>

        {/* Message */}
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {warning.message}
        </p>

        {/* Suggestions */}
        <div className="space-y-2">
          <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Suggestions:
          </p>
          {warning.suggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              onClick={() => onAction?.(suggestion)}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left text-sm p-3 rounded-xl transition-all ${
                isDarkMode
                  ? 'bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600'
                  : 'bg-white/80 hover:bg-white border border-gray-200'
              }`}
            >
              <span className={getTextColorClass()}>•</span> {suggestion}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
