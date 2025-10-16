import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useSandboxStore } from '../store/sandboxStore';
import { TestTube, X, AlertTriangle } from 'lucide-react';

// Sandbox Mode Banner - Shows when in sandbox mode
export const SandboxMode: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { isActive, exitSandbox } = useSandboxStore();

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div
            className={`${
              isDarkMode ? 'glass-dark' : 'glass'
            } rounded-xl p-4 shadow-glass-strong border-2 border-amber-500/50 pointer-events-auto`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TestTube className="text-amber-500 animate-pulse" size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3
                      className={`font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      Sandbox Mode Active
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600">
                      Experimental
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Changes here won't affect your main project until extracted
                  </p>
                </div>
              </div>

              <button
                onClick={exitSandbox}
                className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 font-medium transition-all flex items-center space-x-2"
              >
                <X size={18} />
                <span>Exit Sandbox</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Sandbox Toggle Button - Floating button to enter sandbox mode
export const SandboxToggleButton: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { isActive, enterSandbox } = useSandboxStore();

  if (!currentProject || isActive) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-24 right-6 z-40"
    >
      <button
        onClick={enterSandbox}
        className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Enter Sandbox Mode"
      >
        <TestTube className="text-white" size={24} />

        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Experiment Mode - Test ideas safely
          <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      </button>
    </motion.div>
  );
};