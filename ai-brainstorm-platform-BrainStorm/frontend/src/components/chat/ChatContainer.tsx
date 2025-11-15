import React from 'react';
import { motion } from 'framer-motion';

interface ChatContainerProps {
  children: React.ReactNode;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ children }) => {
  return (
    <div className="flex flex-col gap-6">
      {children}
    </div>
  );
};

interface ChatPanelProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ children, isDarkMode, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex-[7] ${isDarkMode ? 'glass-dark border-gray-700/50' : 'glass border-white/50'} rounded-3xl shadow-glass border h-[70vh] flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const CanvasPanel: React.FC<ChatPanelProps> = ({ children, isDarkMode, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`w-full ${isDarkMode ? 'glass-dark border-gray-700/50' : 'glass border-white/50'} rounded-3xl shadow-glass border h-[55vh] overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const TrackingPanel: React.FC<ChatPanelProps> = ({ children, isDarkMode, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex-[3] h-[70vh] ${isDarkMode ? 'glass-dark border-gray-700/50' : 'glass border-white/50'} rounded-3xl shadow-glass border ${className}`}
    >
      {children}
    </motion.div>
  );
};
