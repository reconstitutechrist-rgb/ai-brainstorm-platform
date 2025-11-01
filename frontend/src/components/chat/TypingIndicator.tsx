import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  isDarkMode: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isDarkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center space-x-2"
    >
      <div className={`${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} rounded-full px-4 py-2`}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </motion.div>
  );
};
