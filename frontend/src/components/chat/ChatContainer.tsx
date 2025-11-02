import React from 'react';
import { motion } from 'framer-motion';

interface ChatContainerProps {
  children: React.ReactNode;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ children }) => {
  return (
    <div className="flex flex-col gap-12">
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
      className={`flex-[7] ${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl shadow-glass h-[45vh] flex flex-col ${className}`}
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
      className={`w-full ${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl shadow-glass h-[45vh] overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const TrackingPanel: React.FC<ChatPanelProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex-[3] h-[45vh] ${className}`}
    >
      {children}
    </motion.div>
  );
};
