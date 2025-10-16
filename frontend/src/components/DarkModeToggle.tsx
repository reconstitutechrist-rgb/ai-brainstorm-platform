import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { motion } from 'framer-motion';

export const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <button
      onClick={toggleDarkMode}
      className={`fixed top-6 right-6 z-40 p-3 rounded-xl shadow-glass ${
        isDarkMode ? 'glass-dark' : 'glass'
      } hover:shadow-glass-hover transition-all`}
      aria-label="Toggle dark mode"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDarkMode ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDarkMode ? (
          <Sun size={20} className="text-yellow-300" />
        ) : (
          <Moon size={20} className="text-green-metallic" />
        )}
      </motion.div>
    </button>
  );
};
