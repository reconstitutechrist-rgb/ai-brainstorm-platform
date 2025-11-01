import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';

interface Stat {
  value: number;
  label: string;
  suffix?: string;
}

const stats: Stat[] = [
  { value: 8, label: 'AI Agents' },
  { value: 8, label: 'Workflows' },
  { value: 15, label: 'Doc Types', suffix: '+' },
  { value: 100, label: 'Accuracy', suffix: '%' },
];

export const StatsSection: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [counts, setCounts] = useState(stats.map(() => 0));

  // Animated counter
  useEffect(() => {
    if (!isInView) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setCounts(
        stats.map((stat) => Math.floor(stat.value * progress))
      );

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounts(stats.map((stat) => stat.value));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isInView]);

  return (
    <div className="homepage-section" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-card p-12"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              {/* Number */}
              <div className="text-5xl md:text-6xl font-bold mb-2">
                <span className="text-gradient">
                  {counts[index]}
                  {stat.suffix}
                </span>
              </div>

              {/* Label */}
              <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Zero Assumptions Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-deep/30 to-blue-mid/30 border-2 border-cyan-400/50">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
              Zero Assumptions Policy
            </p>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
              100% Citation Tracking • Full Traceability
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
