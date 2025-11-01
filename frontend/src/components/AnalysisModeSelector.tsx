import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, GitBranch, FileText, X } from 'lucide-react';
import { referencesApi } from '../services/api';
import { useThemeStore } from '../store/themeStore';

interface AnalysisModeSelectorProps {
  onClose: () => void;
  onSelectMode: (mode: 'basic' | 'context' | 'template', templateId?: string) => void;
  projectId?: string;
}

export const AnalysisModeSelector: React.FC<AnalysisModeSelectorProps> = ({
  onClose,
  onSelectMode,
  projectId,
}) => {
  const { isDarkMode } = useThemeStore();
  const [selectedMode, setSelectedMode] = useState<'basic' | 'context' | 'template'>('basic');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await referencesApi.getAnalysisTemplates();
      if (response.success) {
        setTemplates(response.templates);
        // Set first template as default
        if (response.templates.length > 0) {
          setSelectedTemplateId(response.templates[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAnalyze = () => {
    if (selectedMode === 'template' && !selectedTemplateId) {
      alert('Please select a template');
      return;
    }
    if (selectedMode === 'context' && !projectId) {
      alert('Project context is required for context-aware analysis');
      return;
    }
    onSelectMode(selectedMode, selectedTemplateId || undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`relative w-full max-w-2xl ${
          isDarkMode ? 'glass-dark' : 'glass'
        } rounded-2xl p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#00d4ff]/20">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Choose Analysis Mode
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Select how you want the AI to analyze this reference
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="space-y-4">
          {/* Mode 1: Basic */}
          <label
            className={`flex items-start space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
              selectedMode === 'basic'
                ? 'bg-[#00d4ff]/10 border-2 border-[#00d4ff] shadow-md shadow-[#00d4ff]/20'
                : isDarkMode
                ? 'border-2 border-white/10 hover:border-white/20'
                : 'border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="basic"
              checked={selectedMode === 'basic'}
              onChange={() => setSelectedMode('basic')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="text-[#00d4ff]" size={20} />
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Mode 1: Basic Analysis
                </h3>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Standard comprehensive analysis extracting requirements, constraints, design elements,
                and technical specifications with confidence scores.
              </p>
            </div>
          </label>

          {/* Mode 2: Context-Aware */}
          <label
            className={`flex items-start space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
              selectedMode === 'context'
                ? 'bg-[#00d4ff]/10 border-2 border-[#00d4ff] shadow-md shadow-[#00d4ff]/20'
                : isDarkMode
                ? 'border-2 border-white/10 hover:border-white/20'
                : 'border-2 border-gray-200 hover:border-gray-300'
            } ${!projectId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="context"
              checked={selectedMode === 'context'}
              onChange={() => setSelectedMode('context')}
              disabled={!projectId}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <GitBranch className="text-[#00d4ff]" size={20} />
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Mode 2: Context-Aware Analysis
                </h3>
                {!projectId && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                    Requires Project
                  </span>
                )}
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Compares reference against your project decisions to detect conflicts, confirmations,
                and new insights with relevance scoring.
              </p>
            </div>
          </label>

          {/* Mode 3: Template-Based */}
          <label
            className={`flex items-start space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
              selectedMode === 'template'
                ? 'bg-[#00d4ff]/10 border-2 border-[#00d4ff] shadow-md shadow-[#00d4ff]/20'
                : isDarkMode
                ? 'border-2 border-white/10 hover:border-white/20'
                : 'border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="template"
              checked={selectedMode === 'template'}
              onChange={() => setSelectedMode('template')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="text-[#00d4ff]" size={20} />
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Mode 3: Template-Based Analysis
                </h3>
              </div>
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Uses specialized templates for structured extraction (competitor analysis, technical specs,
                user research, market analysis).
              </p>

              {/* Template Selector */}
              {selectedMode === 'template' && (
                <div className="mt-3">
                  <label className={`text-sm font-medium block mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Template:
                  </label>
                  {loadingTemplates ? (
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading templates...
                    </div>
                  ) : (
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-black/20 border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-[#00d4ff]/20">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            className="px-6 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] text-[#0a1f1a] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#00d4ff]/30 transition-all"
          >
            Analyze Reference
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
