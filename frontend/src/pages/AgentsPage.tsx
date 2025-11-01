import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { agentsApi } from '../services/api';
import type { Agent } from '../types';
import { Bot, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import '../styles/homepage.css';

export const AgentsPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    loadAgents();
    loadStats();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[AgentsPage] Fetching agents from API...');
      const response = await agentsApi.getList();
      console.log('[AgentsPage] API Response:', response);
      if (response.success) {
        console.log('[AgentsPage] Successfully loaded', response.agents.length, 'agents');
        setAgents(response.agents);
        setError(null);
      } else {
        console.error('[AgentsPage] API returned success: false');
        setError('Failed to load agents. Please try again.');
      }
    } catch (error: any) {
      console.error('[AgentsPage] Failed to load agents:', error);

      // Provide more specific error messages
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running on http://localhost:3001');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please sign in again.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load agents. Please check your connection and try again.');
      }
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
      case 'quality': return 'text-cyan-400 bg-cyan-500/20';
      case 'support': return 'text-purple-400 bg-purple-500/20';
      case 'meta': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto">
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
              8 specialized agents working together to perfect your ideas
            </p>
          </div>

          {stats && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
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
                ? 'bg-cyan-primary text-white shadow-md'
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
        <div className="flex flex-col justify-center items-center h-64">
          <Loader2 size={48} className="text-cyan-primary animate-spin" />
          <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading agents...
          </p>
        </div>
      ) : error ? (
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-12 shadow-glass text-center`}>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Failed to Load Agents
            </h3>
            <p className={`text-sm mb-6 max-w-md ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {error}
            </p>
            <button
              onClick={loadAgents}
              className="px-6 py-3 rounded-xl bg-cyan-primary text-white hover:bg-cyan-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-12 shadow-glass text-center`}>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mb-4">
              <Bot size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              No Agents Found
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No agents are currently configured.
            </p>
          </div>
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
                <div className="w-12 h-12 rounded-xl bg-cyan-primary/20 flex items-center justify-center">
                  <Bot size={24} className="text-cyan-primary" />
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
                <CheckCircle size={16} className="text-cyan-500" />
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
