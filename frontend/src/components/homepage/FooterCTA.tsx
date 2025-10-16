import React from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';

export const FooterCTA: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const navigate = useNavigate();

  return (
    <div className="homepage-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-card p-16 text-center"
      >
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-4xl md:text-5xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-white'}`}
        >
          Ready to Transform Your{' '}
          <span className="text-gradient">Ideas?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className={`text-xl mb-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}
        >
          Join the future of AI-powered brainstorming
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={() => navigate('/chat')}
            className="btn-metallic-primary inline-flex items-center gap-3 text-xl px-12 py-6"
          >
            <Rocket size={28} />
            <span>Get Started Now</span>
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className={`text-sm mt-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'}`}
        >
          No credit card required • Start brainstorming in seconds
        </motion.p>
      </motion.div>
    </div>
  );
};
