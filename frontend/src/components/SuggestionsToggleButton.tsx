import React from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

interface SuggestionsToggleButtonProps {
  onClick: () => void;
  suggestionCount: number;
  hasNewSuggestions?: boolean;
}

export const SuggestionsToggleButton: React.FC<SuggestionsToggleButtonProps> = ({
  onClick,
  suggestionCount,
  hasNewSuggestions = false,
}) => {
  const { isDarkMode } = useThemeStore();
  const isEmpty = suggestionCount === 0;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`fixed top-24 right-6 z-30 w-14 h-14 rounded-full shadow-lg ${
        isEmpty
          ? isDarkMode
            ? 'bg-gray-800/80 backdrop-blur-md border-2 border-gray-600/40'
            : 'bg-gray-100 border-2 border-gray-300/50'
          : isDarkMode
          ? 'bg-green-metallic/20 backdrop-blur-md border-2 border-green-metallic/40'
          : 'bg-white border-2 border-green-metallic/30'
      } flex items-center justify-center transition-all hover:shadow-xl group`}
      aria-label="Toggle suggestions panel"
    >
      {/* Pulse Animation for New Suggestions */}
      {hasNewSuggestions && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-metallic/30"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Bell Icon */}
      <Bell
        size={24}
        className={`${
          isEmpty
            ? isDarkMode
              ? 'text-gray-500'
              : 'text-gray-400'
            : 'text-green-metallic'
        } group-hover:scale-110 transition-transform ${
          isEmpty ? 'opacity-60' : 'opacity-100'
        }`}
      />

      {/* Badge with Count */}
      {suggestionCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
        >
          <span className="text-white text-xs font-bold">
            {suggestionCount > 9 ? '9+' : suggestionCount}
          </span>
        </motion.div>
      )}
    </motion.button>
  );
};
