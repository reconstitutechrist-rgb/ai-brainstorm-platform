import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, BarChart, Beaker, Shield,
  TrendingUp, MessageSquare, Download, Target
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface Capability {
  icon: React.ElementType;
  title: string;
  description: string;
}

const capabilities: Capability[] = [
  {
    icon: FileText,
    title: 'Generate Documents',
    description: 'RFPs, Implementation Plans, Technical Specs auto-formatted in markdown',
  },
  {
    icon: Search,
    title: 'Analyze Files',
    description: 'Images, Videos, PDFs, Documents with background AI analysis',
  },
  {
    icon: BarChart,
    title: 'Track Decisions',
    description: 'Full citation tracking with user quotes preserved',
  },
  {
    icon: Beaker,
    title: 'Sandbox Ideas',
    description: 'Explore without commitment and extract the best',
  },
  {
    icon: Shield,
    title: 'Zero Assumptions',
    description: 'Verification layer active to block hallucinations',
  },
  {
    icon: TrendingUp,
    title: 'Session Tracking',
    description: 'Progress since last time with suggested next steps',
  },
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description: 'Agents respond instantly with streaming responses',
  },
  {
    icon: Download,
    title: 'Export Everything',
    description: 'Download decisions and share documents',
  },
  {
    icon: Target,
    title: 'Smart Suggestions',
    description: 'AI detects blockers and recommends actions',
  },
];

export const CapabilitiesGrid: React.FC = () => {
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
          What You <span className="text-gradient">Can Do</span>
        </h2>
        <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
          Powerful capabilities at your fingertips
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((capability, index) => (
          <motion.div
            key={capability.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.5 }}
            className="glass-card p-6 group"
          >
            {/* Icon */}
            <div className="flex justify-start mb-4">
              <div className="metallic-icon-sm w-12 h-12">
                <capability.icon size={20} color="#0a1f1a" strokeWidth={2.5} />
              </div>
            </div>

            {/* Title */}
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-white'}`}>
              {capability.title}
            </h3>

            {/* Description */}
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
              {capability.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
