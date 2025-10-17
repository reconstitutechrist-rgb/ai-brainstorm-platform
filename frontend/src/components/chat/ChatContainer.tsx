import React from 'react';
import { motion } from 'framer-motion';

interface ChatContainerProps {
  children: React.ReactNode;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      className={`lg:col-span-2 ${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl shadow-glass h-[calc(100vh-20rem)] flex flex-col ${className}`}
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
      className={`lg:col-span-1 ${className}`}
    >
      {children}
    </motion.div>
  );
};
