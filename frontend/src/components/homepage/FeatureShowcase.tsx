import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, Database, TestTube } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  gradient: string;
}

export const FeatureShowcase: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const navigate = useNavigate();

  const features: Feature[] = [
    {
      icon: <MessageSquare size={64} strokeWidth={1.5} />,
      title: '8 AI Agents',
      description: 'Collaborate with specialized AI agents that work together to brainstorm, verify, and refine your ideas with zero assumptions.',
      path: '/agents',
      gradient: 'linear-gradient(135deg, #00ffaa 0%, #1affcc 100%)',
    },
    {
      icon: <TestTube size={64} strokeWidth={1.5} />,
      title: 'Sandbox Mode',
      description: 'Safely experiment with ideas in isolation. Test concepts, explore alternatives, and iterate without affecting your main project.',
      path: '/sandbox',
      gradient: 'linear-gradient(135deg, #1affcc 0%, #00cc88 100%)',
    },
    {
      icon: <Database size={64} strokeWidth={1.5} />,
      title: 'Intelligence Hub',
      description: 'Track all decisions, review conversations, and access generated documents with full citations and reasoning.',
      path: '/intelligence',
      gradient: 'linear-gradient(135deg, #00cc88 0%, #00ffaa 100%)',
    },
    {
      icon: <FileText size={64} strokeWidth={1.5} />,
      title: 'Research Hub',
      description: 'Upload documents, analyze content, and let AI agents extract insights to inform your brainstorming sessions.',
      path: '/research',
      gradient: 'linear-gradient(135deg, #00ffaa 0%, #00cc88 100%)',
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-white'
          }`}>
            Powerful <span className="text-gradient">Features</span>
          </h2>
          <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
            Everything you need to transform ideas into actionable plans
          </p>
        </motion.div>

        {/* Feature Grid - 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => navigate(feature.path)}
              className="glass-card p-8 cursor-pointer group"
            >
              {/* 64x64 Metallic Gradient Icon */}
              <div
                className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: feature.gradient,
                  boxShadow: `0 8px 24px rgba(0, 255, 170, 0.3)`,
                }}
              >
                <div style={{ color: '#0a1f1a' }}>
                  {feature.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-white'
              }`}>
                {feature.title}
              </h3>

              {/* Description */}
              <p className={`text-lg leading-relaxed mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-200'
              }`}>
                {feature.description}
              </p>

              {/* Hover Arrow */}
              <div className={`flex items-center gap-2 text-green-metallic group-hover:gap-4 transition-all ${
                isDarkMode ? 'opacity-80' : 'opacity-90'
              }`}>
                <span className="font-medium">Explore</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="transition-transform group-hover:translate-x-1"
                >
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
