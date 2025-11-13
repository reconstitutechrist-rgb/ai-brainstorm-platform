import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import '../styles/homepage.css';
import {
  TestTube,
  Sparkles,
  Lightbulb,
  Shuffle,
  Download,
  Save,
  Trash2,
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';
import { sandboxApi } from '../services/api';

export const SandboxPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [activeSandbox, setActiveSandbox] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [direction, setDirection] = useState<'innovative' | 'practical' | 'budget' | 'premium' | 'experimental'>('innovative');

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadOrCreateSandbox();
    }
  }, [currentProject]);

  const loadOrCreateSandbox = async () => {
    if (!currentProject) return;

    try {
      // Try to get active sandbox
      const response = await sandboxApi.getByProject(currentProject.id);
      const activeSandboxes = response.sandboxes.filter((s: any) => s.status === 'active');

      if (activeSandboxes.length > 0) {
        const sandbox = activeSandboxes[0];
        setActiveSandbox(sandbox);
        setIdeas(sandbox.sandbox_state.ideas || []);
      } else {
        // Create new sandbox
        const createResponse = await sandboxApi.create({
          projectId: currentProject.id,
          userId: 'demo-user-123',
          name: `Sandbox - ${new Date().toLocaleDateString()}`,
        });
        setActiveSandbox(createResponse.sandbox);
      }
    } catch (error) {
      console.error('Load sandbox error:', error);
    }
  };

  const generateIdeas = async () => {
    if (!activeSandbox || !currentProject) return;

    setGenerating(true);
    try {
      const response = await sandboxApi.generateIdeas({
        sandboxId: activeSandbox.id,
        projectContext: `Project: ${currentProject.title}\nDescription: ${currentProject.description}`,
        currentDecisions: currentProject.items?.filter((i: any) => i.state === 'decided') || [],
        direction: direction,
        quantity: 5,
      });

      setIdeas(prev => [...prev, ...response.ideas]);
    } catch (error) {
      console.error('Generate ideas error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const toggleIdeaSelection = (ideaId: string) => {
    setSelectedIdeas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const extractSelectedIdeas = async () => {
    if (!activeSandbox || selectedIdeas.size === 0) return;

    try {
      await sandboxApi.extractIdeas({
        sandboxId: activeSandbox.id,
        selectedIdeaIds: Array.from(selectedIdeas),
      });
      alert(`Extracted ${selectedIdeas.size} ideas to main project!`);
      setSelectedIdeas(new Set());
    } catch (error) {
      console.error('Extract ideas error:', error);
    }
  };

  const saveAsAlternative = async () => {
    if (!activeSandbox) return;

    const name = prompt('Name this alternative version:');
    if (!name) return;

    try {
      await sandboxApi.saveAsAlternative({
        sandboxId: activeSandbox.id,
        alternativeName: name,
      });
      alert('Saved as alternative version!');
      loadOrCreateSandbox();
    } catch (error) {
      console.error('Save alternative error:', error);
    }
  };

  const discardSandbox = async () => {
    if (!activeSandbox) return;

    if (!confirm('Discard all ideas in this sandbox? This cannot be undone.')) return;

    try {
      await sandboxApi.discard(activeSandbox.id);
      setActiveSandbox(null);
      setIdeas([]);
      loadOrCreateSandbox();
    } catch (error) {
      console.error('Discard sandbox error:', error);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <TestTube size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a project to start exploring ideas in the sandbox
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass border-2 border-amber-500/30`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <TestTube className="text-amber-500" size={32} />
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Creative Sandbox
              </h1>
            </div>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Explore wild ideas risk-free with AI-powered idea generation
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Nothing here affects your main project until you extract ideas
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={extractSelectedIdeas}
              disabled={selectedIdeas.size === 0}
              className="px-4 py-2 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download size={18} />
              <span>Extract ({selectedIdeas.size})</span>
            </button>
            <button
              onClick={saveAsAlternative}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all flex items-center space-x-2"
            >
              <Save size={18} />
              <span>Save as Alternative</span>
            </button>
            <button
              onClick={discardSandbox}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all flex items-center space-x-2"
            >
              <Trash2 size={18} />
              <span>Discard All</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Idea Generator Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 mb-8 shadow-glass`}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Sparkles className="text-cyan-primary" size={24} />
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            AI Idea Generator
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Direction Selector */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className={`w-full px-4 py-3 rounded-xl ${
                isDarkMode
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-white text-gray-800 border-gray-300'
              } border focus:outline-none focus:ring-2 focus:ring-cyan-primary/50`}
            >
              <option value="innovative">🚀 Innovative - Cutting-edge ideas</option>
              <option value="practical">⚙️ Practical - Realistic solutions</option>
              <option value="budget">💰 Budget - Cost-effective options</option>
              <option value="premium">💎 Premium - High-end luxury</option>
              <option value="experimental">🔬 Experimental - Wild & unconventional</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generateIdeas}
              disabled={generating}
              className="w-full px-6 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Generating Ideas...</span>
                </>
              ) : (
                <>
                  <Lightbulb size={20} />
                  <span>Generate 5 Ideas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-all flex items-center space-x-1">
            <Shuffle size={14} />
            <span>Combine Ideas</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-all flex items-center space-x-1">
            <TrendingUp size={14} />
            <span>Refine Selected</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/30 transition-all flex items-center space-x-1">
            <Zap size={14} />
            <span>Generate Variations</span>
          </button>
        </div>
      </motion.div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {ideas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={index}
              isSelected={selectedIdeas.has(idea.id)}
              onToggleSelect={() => toggleIdeaSelection(idea.id)}
            />
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {ideas.length === 0 && !generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-12"
          >
            <Lightbulb size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Ready to Generate Ideas!
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Click "Generate 5 Ideas" to start exploring with AI
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Idea Card Component
const IdeaCard: React.FC<{
  idea: any;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
}> = ({ idea, index, isSelected, onToggleSelect }) => {
  const { isDarkMode } = useThemeStore();

  const innovationColors = {
    practical: 'text-blue-400 bg-blue-500/20',
    moderate: 'text-purple-400 bg-purple-500/20',
    experimental: 'text-orange-400 bg-orange-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`${
        isDarkMode ? 'glass-dark' : 'glass'
      } rounded-2xl p-6 shadow-glass hover:shadow-glass-hover transition-all relative ${
        isSelected ? 'ring-2 ring-cyan-primary' : ''
      }`}
    >
      {/* Selection Checkbox */}
      <button
        onClick={onToggleSelect}
        className={`absolute top-4 right-4 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-cyan-primary border-cyan-primary'
            : isDarkMode
            ? 'border-white/30 hover:border-cyan-primary/50'
            : 'border-gray-300 hover:border-cyan-primary/50'
        }`}
      >
        {isSelected && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-cyan-primary/20 flex items-center justify-center mb-4">
        <Lightbulb size={24} className="text-cyan-primary" />
      </div>

      {/* Title */}
      <h3 className={`text-lg font-bold mb-2 pr-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        {idea.title}
      </h3>

      {/* Description */}
      <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {idea.description}
      </p>

      {/* Reasoning */}
      {idea.reasoning && (
        <div className={`text-xs mb-3 p-3 rounded-lg ${
          isDarkMode ? 'bg-white/5' : 'bg-gray-100'
        }`}>
          <span className="font-semibold">Why it works: </span>
          {idea.reasoning}
        </div>
      )}

      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {idea.tags.map((tag: string, i: number) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-xs ${
                isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Innovation Level */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          innovationColors[idea.innovationLevel as keyof typeof innovationColors] || innovationColors.moderate
        }`}>
          {idea.innovationLevel}
        </span>
        <button className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'} transition-colors`}>
          Refine →
        </button>
      </div>
    </motion.div>
  );
};
