import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../store/agentStore';
import { useThemeStore } from '../store/themeStore';
import { getAgentConfig } from '../utils/agentConfig';

interface FloatingAgentBubblesProps {
  onBubbleClick: (agentType: string) => void;
}

export const FloatingAgentBubbles: React.FC<FloatingAgentBubblesProps> = ({ onBubbleClick }) => {
  const { isDarkMode } = useThemeStore();
  const { agentWindows } = useAgentStore();

  // Get all minimized agents (whether they have pending questions or not)
  const activeAgents = Object.keys(agentWindows).filter(
    (agentType) => agentWindows[agentType].state === 'minimized'
  );

  return (
    <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-4">
      <AnimatePresence>
        {activeAgents.map((agentType, index) => {
          const window = agentWindows[agentType];
          const config = getAgentConfig(agentType);
          const Icon = config?.icon;

          return (
            <motion.button
              key={agentType}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { delay: index * 0.1 },
              }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onBubbleClick(agentType)}
              className="relative group"
              style={{
                width: '64px',
                height: '64px',
              }}
            >
              {/* Pulsing Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    `0 0 10px ${config?.glowColor || 'rgba(107, 114, 128, 0.5)'}`,
                    `0 0 25px ${config?.glowColor || 'rgba(107, 114, 128, 0.5)'}`,
                    `0 0 10px ${config?.glowColor || 'rgba(107, 114, 128, 0.5)'}`,
                  ],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Bubble Container */}
              <div
                className={`absolute inset-0 rounded-full flex items-center justify-center backdrop-blur-sm ${
                  isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
                } border-2 shadow-lg transition-all`}
                style={{
                  borderColor: config?.color || '#6B7280',
                }}
              >
                {Icon && (
                  <Icon
                    size={28}
                    style={{ color: config?.color || '#6B7280' }}
                  />
                )}
              </div>

              {/* Question Count Badge */}
              {window.pendingQuestions > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg"
                >
                  {window.pendingQuestions}
                </motion.div>
              )}

              {/* Tooltip on Hover */}
              <div
                className={`absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
                }`}
              >
                <div className="font-medium">{config?.displayName || agentType}</div>
                <div className="text-xs text-gray-500">
                  {window.pendingQuestions} question{window.pendingQuestions !== 1 ? 's' : ''}
                </div>
                {/* Arrow */}
                <div
                  className={`absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-8 border-transparent ${
                    isDarkMode ? 'border-l-gray-800' : 'border-l-white'
                  }`}
                />
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
