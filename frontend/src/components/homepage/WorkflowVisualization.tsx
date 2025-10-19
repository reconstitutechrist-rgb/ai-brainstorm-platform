import React from 'react';
import { motion } from 'framer-motion';
import { User, Network, FileCheck, FileText, CheckCircle } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const workflowSteps = [
  { icon: User, label: 'User Input', description: 'Share your ideas naturally' },
  { icon: Network, label: 'Orchestrator', description: 'AI decides which workflow' },
  { icon: FileCheck, label: 'Agent Execution', description: '8 agents collaborate' },
  { icon: FileText, label: 'Record Decisions', description: 'Save with full citations' },
  { icon: CheckCircle, label: 'Actionable Plan', description: 'Ready to implement' },
];

export const WorkflowVisualization: React.FC = () => {
  const { isDarkMode } = useThemeStore();

  return (
    <div className="homepage-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-white'}`}>
          How It <span className="text-gradient">Works</span>
        </h2>
        <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
          From idea to action in five simple steps
        </p>
      </motion.div>

      <div className="glass-card p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.label}>
              {/* Step */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="flex flex-col items-center text-center flex-1"
              >
                {/* Icon */}
                <div className="metallic-icon-sm w-16 h-16 mb-4">
                  <step.icon size={28} color="#0a1f1a" strokeWidth={2.5} />
                </div>

                {/* Label */}
                <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-white'}`}>
                  {step.label}
                </h3>

                {/* Description */}
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
                  {step.description}
                </p>
              </motion.div>

              {/* Arrow */}
              {index < workflowSteps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  whileInView={{ opacity: 1, scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                  className="hidden md:block"
                >
                  <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                    <path
                      d="M0 12H38M38 12L28 2M38 12L28 22"
                      stroke="#00ffaa"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
