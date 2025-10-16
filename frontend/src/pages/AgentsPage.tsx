import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { agentsApi } from '../services/api';
import type { Agent } from '../types';
import { Bot, Activity, CheckCircle, Loader2 } from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAgents();
    loadStats();
  }, []);

  const loadAgents = async () => {
    try {
      console.log('[AgentsPage] Fetching agents from API...');
      const response = await agentsApi.getList();
      console.log('[AgentsPage] API Response:', response);
      if (response.success) {
        console.log('[AgentsPage] Successfully loaded', response.agents.length, 'agents');
        setAgents(response.agents);
      } else {
        console.error('[AgentsPage] API returned success: false');
      }
    } catch (error) {
      console.error('[AgentsPage] Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await agentsApi.getStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const categories = [
    { id: 'all', label: 'All Agents', count: agents.length },
    { id: 'core', label: 'Core', count: agents.filter(a => a.category === 'core').length },
    { id: 'quality', label: 'Quality', count: agents.filter(a => a.category === 'quality').length },
    { id: 'support', label: 'Support', count: agents.filter(a => a.category === 'support').length },
    { id: 'meta', label: 'Meta', count: agents.filter(a => a.category === 'meta').length },
  ];

  const filteredAgents = selectedCategory === 'all'
    ? agents
    : agents.filter(a => a.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'text-blue-400 bg-blue-500/20';
      case 'quality': return 'text-green-400 bg-green-500/20';
      case 'support': return 'text-purple-400 bg-purple-500/20';
      case 'meta': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              AI Agents
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              18 specialized agents working together to perfect your ideas
            </p>
          </div>

          {stats && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                All agents online
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-wrap gap-3"
      >
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedCategory === category.id
                ? 'bg-green-metallic text-white shadow-md'
                : isDarkMode
                ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {category.label}
            <span className="ml-2 opacity-70">({category.count})</span>
          </button>
        ))}
      </motion.div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={48} className="text-green-metallic animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass hover:shadow-glass-hover transition-all`}
            >
              {/* Agent Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-metallic/20 flex items-center justify-center">
                  <Bot size={24} className="text-green-metallic" />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(agent.category)}`}>
                  {agent.category}
                </span>
              </div>

              {/* Agent Info */}
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {agent.name}
              </h3>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {agent.description}
              </p>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {agent.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
