import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, HelpCircle, FileText, Settings, Briefcase,
  CheckCircle, AlertTriangle, MessageCircle, Target, Shield,
  GitBranch, Languages, ListOrdered, GitCommit, Search,
  FolderOpen, Network
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface Agent {
  name: string;
  icon: React.ElementType;
  description: string;
  category: 'core' | 'quality' | 'support' | 'orchestrator';
}

const agents: Agent[] = [
  // Core Agents (5)
  { name: 'Brainstorming', icon: Sparkles, description: 'Reflects and organizes user ideas naturally', category: 'core' },
  { name: 'Questioner', icon: HelpCircle, description: 'Asks strategic clarifying questions', category: 'core' },
  { name: 'Recorder', icon: FileText, description: 'Documents decisions with full context', category: 'core' },
  { name: 'Context Manager', icon: Settings, description: 'Classifies intent and manages state', category: 'core' },
  { name: 'Development', icon: Briefcase, description: 'Research and vendor recommendations', category: 'core' },

  // Quality Agents (6)
  { name: 'Verification', icon: CheckCircle, description: 'Gatekeeps against assumptions', category: 'quality' },
  { name: 'Gap Detection', icon: AlertTriangle, description: 'Identifies missing information', category: 'quality' },
  { name: 'Clarification', icon: MessageCircle, description: 'Asks targeted questions', category: 'quality' },
  { name: 'Accuracy Auditor', icon: Target, description: 'Continuous accuracy validation', category: 'quality' },
  { name: 'Assumption Blocker', icon: Shield, description: 'Zero tolerance for assumptions', category: 'quality' },
  { name: 'Reference Analysis', icon: Search, description: 'Analyzes uploaded files', category: 'quality' },

  // Support Agents (6)
  { name: 'Consistency Guardian', icon: GitBranch, description: 'Detects contradictions', category: 'support' },
  { name: 'Translation', icon: Languages, description: 'Converts vision to technical specs', category: 'support' },
  { name: 'Prioritization', icon: ListOrdered, description: 'Sequences decisions logically', category: 'support' },
  { name: 'Version Control', icon: GitCommit, description: 'Tracks changes with reasoning', category: 'support' },
  { name: 'Reviewer', icon: Search, description: 'Comprehensive QA validation', category: 'support' },
  { name: 'Resource Manager', icon: FolderOpen, description: 'Organizes references', category: 'support' },

  // Orchestrator (1)
  { name: 'Orchestrator', icon: Network, description: 'Coordinates all 17 agents seamlessly', category: 'orchestrator' },
];

const categoryColors = {
  core: {
    bg: 'rgba(0, 255, 170, 0.1)',
    border: 'rgba(0, 255, 170, 0.3)',
    text: '#00ffaa',
  },
  quality: {
    bg: 'rgba(26, 255, 204, 0.1)',
    border: 'rgba(26, 255, 204, 0.3)',
    text: '#1affcc',
  },
  support: {
    bg: 'rgba(0, 204, 136, 0.1)',
    border: 'rgba(0, 204, 136, 0.3)',
    text: '#00cc88',
  },
  orchestrator: {
    bg: 'rgba(255, 170, 0, 0.1)',
    border: 'rgba(255, 170, 0, 0.3)',
    text: '#ffaa00',
  },
};

export const AgentShowcase: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

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
          Meet the <span className="text-gradient">18 AI Agents</span>
        </h2>
        <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
          Each agent is a specialist working together to transform your ideas
        </p>
      </motion.div>

      {/* Category Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: categoryColors.core.text }} />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-200'}>Core (5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: categoryColors.quality.text }} />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-200'}>Quality (6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: categoryColors.support.text }} />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-200'}>Support (6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: categoryColors.orchestrator.text }} />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-200'}>Orchestrator (1)</span>
        </div>
      </div>

      {/* Agent Grid - 3x6 responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {agents.map((agent, index) => {
          const colors = categoryColors[agent.category];
          const isHovered = hoveredAgent === agent.name;

          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03, duration: 0.4 }}
              onHoverStart={() => setHoveredAgent(agent.name)}
              onHoverEnd={() => setHoveredAgent(null)}
              className="relative group"
            >
              <div
                className={`
                  p-4 rounded-2xl cursor-pointer
                  transition-all duration-300
                  ${isHovered ? 'transform scale-105' : ''}
                `}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Icon */}
                <div className="flex justify-center mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${colors.text} 0%, ${colors.text}dd 100%)`,
                      boxShadow: isHovered
                        ? `0 4px 20px ${colors.text}80, inset 0 2px 0 rgba(255, 255, 255, 0.4)`
                        : `0 2px 10px ${colors.text}40, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                    }}
                  >
                    <agent.icon size={24} color="#0a1f1a" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Name */}
                <h3
                  className="text-sm font-semibold text-center"
                  style={{ color: colors.text }}
                >
                  {agent.name}
                </h3>

                {/* Description Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className={`
                        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                        px-4 py-2 rounded-lg text-xs font-medium text-center
                        whitespace-nowrap z-50 pointer-events-none
                      `}
                      style={{
                        background: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(13, 61, 48, 0.95)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        backdropFilter: 'blur(10px)',
                        boxShadow: `0 4px 20px ${colors.text}40`,
                        minWidth: '200px',
                      }}
                    >
                      {agent.description}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
