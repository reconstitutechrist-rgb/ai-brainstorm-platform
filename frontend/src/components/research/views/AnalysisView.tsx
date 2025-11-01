import React, { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { useProjectStore } from '../../../store/projectStore';
import { referencesApi } from '../../../services/api';
import {
  AlertCircle,
  CheckCircle,
  Info,
  Star,
  Tag,
  X,
  RefreshCw,
  Trash2,
  Copy,
  Download,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Reference } from '../../../types';

interface AnalysisViewProps {
  reference: Reference;
  onReferenceUpdate: (reference: Reference) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ reference, onReferenceUpdate }) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const [tagInput, setTagInput] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      await referencesApi.toggleFavorite(reference.id, !reference.is_favorite);
      onReferenceUpdate({ ...reference, is_favorite: !reference.is_favorite });
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    const currentTags = reference.tags || [];
    if (currentTags.includes(tagInput.trim())) return;

    try {
      const newTags = [...currentTags, tagInput.trim()];
      await referencesApi.updateTags(reference.id, newTags);
      onReferenceUpdate({ ...reference, tags: newTags });
      setTagInput('');
    } catch (error) {
      console.error('Add tag error:', error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    const currentTags = reference.tags || [];
    try {
      const newTags = currentTags.filter((t) => t !== tag);
      await referencesApi.updateTags(reference.id, newTags);
      onReferenceUpdate({ ...reference, tags: newTags });
    } catch (error) {
      console.error('Remove tag error:', error);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await referencesApi.retriggerAnalysis(reference.id);
    } catch (error) {
      console.error('Re-analyze error:', error);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleResolveConflict = async (conflictIndex: number, resolution: 'update' | 'keep' | 'clarify') => {
    if (!currentProject) return;
    setResolvingConflict(true);
    try {
      await referencesApi.resolveConflict({
        referenceId: reference.id,
        projectId: currentProject.id,
        conflictIndex,
        resolution,
      });
    } catch (error) {
      console.error('Resolve conflict error:', error);
    } finally {
      setResolvingConflict(false);
    }
  };

  const copyAnalysis = () => {
    if (!reference.metadata?.analysis) return;
    navigator.clipboard.writeText(reference.metadata.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Toolbar */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {reference.filename}
          </h2>
          <p className="text-sm text-gray-500">
            {reference.metadata?.type || 'Unknown type'} • {new Date(reference.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            title={reference.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={20} className={reference.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} />
          </button>
          <button
            onClick={copyAnalysis}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            title="Copy analysis"
          >
            {copied ? <CheckCircle size={20} className="text-cyan-primary" /> : <Copy size={20} />}
          </button>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} disabled:opacity-50`}
            title="Re-analyze document"
          >
            <RefreshCw size={20} className={reanalyzing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag size={16} className="text-gray-500" />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tags</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {reference.tags && reference.tags.length > 0 ? (
            reference.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">No tags yet</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add a tag..."
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
              isDarkMode ? 'bg-white/5 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
            }`}
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Analysis Content */}
      {reference.analysis_status === 'completed' ? (
        <div className="space-y-6">
          {/* Conflicts */}
          {reference.metadata?.contextualAnalysis?.projectAlignment?.conflicts?.length > 0 && (
            <div className="border-l-4 border-red-500 bg-red-500/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-red-500 mb-2">Conflicts Detected</h3>
                  {reference.metadata.contextualAnalysis.projectAlignment.conflicts.map((conflict: any, idx: number) => (
                    <div key={idx} className="mb-4 last:mb-0">
                      <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {conflict.decidedItem}
                      </p>
                      <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Reference says: {conflict.referenceContent}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleResolveConflict(idx, 'update')}
                          disabled={resolvingConflict}
                          className="text-xs px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors disabled:opacity-50"
                        >
                          Update to match reference
                        </button>
                        <button
                          onClick={() => handleResolveConflict(idx, 'keep')}
                          disabled={resolvingConflict}
                          className="text-xs px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 transition-colors disabled:opacity-50"
                        >
                          Keep current decision
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Confirmations */}
          {reference.metadata?.contextualAnalysis?.projectAlignment?.confirmations?.length > 0 && (
            <div className="border-l-4 border-cyan-500 bg-cyan-500/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-cyan-500 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-cyan-500 mb-2">Confirmations</h3>
                  {reference.metadata.contextualAnalysis.projectAlignment.confirmations.map((confirmation: any, idx: number) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        ✓ {confirmation.decidedItem}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* New Insights */}
          {reference.metadata?.contextualAnalysis?.projectAlignment?.newInsights?.length > 0 && (
            <div className="border-l-4 border-blue-500 bg-blue-500/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-blue-500 mb-2">New Insights</h3>
                  {reference.metadata.contextualAnalysis.projectAlignment.newInsights.map((insight: any, idx: number) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        • {insight.insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Markdown */}
          {reference.metadata?.analysis && (
            <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
              <ReactMarkdown>{reference.metadata.analysis}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : reference.analysis_status === 'processing' ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-cyan-primary animate-spin mb-4" />
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Analyzing reference...</p>
        </div>
      ) : reference.analysis_status === 'failed' ? (
        <div className="flex flex-col items-center justify-center py-16 text-red-500">
          <AlertCircle size={48} className="mb-4" />
          <p>Analysis failed</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Info size={48} className="mb-4" />
          <p>Analysis pending...</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
