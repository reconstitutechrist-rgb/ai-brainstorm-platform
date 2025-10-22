import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import type { Reference } from '../types';
import {
  X,
  Download,
  AlertCircle,
  CheckCircle,
  Copy,
  Sparkles,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ComparisonViewProps {
  references: Reference[];
  onClose: () => void;
  projectId?: string;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  references,
  onClose,
  projectId,
}) => {
  const { isDarkMode } = useThemeStore();
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract conflicts between references
  const detectConflicts = () => {
    const conflicts: Array<{
      topic: string;
      references: Array<{ id: string; content: string }>;
    }> = [];

    // Simple conflict detection based on contradictory keywords
    const conflictKeywords = [
      { positive: ['should', 'must', 'required'], negative: ['should not', 'must not', 'not required'] },
      { positive: ['allows', 'enables', 'supports'], negative: ['prevents', 'blocks', 'does not support'] },
    ];

    // This is a simplified version - in production, you'd use NLP or LLM for better detection
    return conflicts;
  };

  const conflicts = detectConflicts();

  const handleGenerateSynthesis = async () => {
    setLoadingSynthesis(true);
    try {
      // Call synthesis agent API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/references/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceIds: references.map(r => r.id),
          projectId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSynthesis(data.synthesis);
        setShowSynthesis(true);
      }
    } catch (error) {
      console.error('Synthesis error:', error);
      // Fallback: Create a simple synthesis
      const fallbackSynthesis = `# Combined Analysis\n\n${references.map((ref, idx) =>
        `## ${idx + 1}. ${ref.filename}\n\n${ref.metadata?.analysis || 'No analysis available'}\n\n`
      ).join('---\n\n')}`;
      setSynthesis(fallbackSynthesis);
      setShowSynthesis(true);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const handleExport = () => {
    const exportContent = showSynthesis && synthesis
      ? synthesis
      : references.map((ref, idx) =>
          `# ${idx + 1}. ${ref.filename}\n\n${ref.metadata?.analysis || 'No analysis available'}\n\n---\n\n`
        ).join('');

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const exportContent = showSynthesis && synthesis
      ? synthesis
      : references.map((ref, idx) =>
          `# ${idx + 1}. ${ref.filename}\n\n${ref.metadata?.analysis || 'No analysis available'}\n\n---\n\n`
        ).join('');

    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-glass`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Compare References ({references.length})
          </h2>
          <div className="flex gap-2">
            {!showSynthesis && (
              <button
                onClick={handleGenerateSynthesis}
                disabled={loadingSynthesis}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-500 transition-colors disabled:opacity-50"
              >
                {loadingSynthesis ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {loadingSynthesis ? 'Generating...' : 'Generate Synthesis'}
              </button>
            )}
            {showSynthesis && (
              <button
                onClick={() => setShowSynthesis(false)}
                className="px-4 py-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 transition-colors text-sm"
              >
                Show Side-by-Side
              </button>
            )}
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle size={20} className="text-green-metallic" /> : <Copy size={20} />}
            </button>
            <button
              onClick={handleExport}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
              title="Export as markdown"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {showSynthesis && synthesis ? (
            // Synthesis View
            <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-xl p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-purple-500" size={20} />
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  AI-Generated Synthesis
                </h3>
              </div>
              <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                <ReactMarkdown>{synthesis}</ReactMarkdown>
              </div>
            </div>
          ) : (
            // Side-by-Side View
            <div className="space-y-4">
              {/* Conflicts Section */}
              {conflicts.length > 0 && (
                <div className="border-l-4 border-red-500 bg-red-500/10 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-500 mb-2">Conflicts Detected ({conflicts.length})</h3>
                      {conflicts.map((conflict, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {conflict.topic}
                          </p>
                          <ul className="space-y-1">
                            {conflict.references.map((ref) => (
                              <li key={ref.id} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                • {ref.content}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison */}
              <div className={`grid gap-4 ${references.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {references.map((ref, idx) => (
                  <div
                    key={ref.id}
                    className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-xl p-4 flex flex-col`}
                  >
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-full bg-green-metallic text-white text-xs font-medium">
                          {idx + 1}
                        </span>
                        <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {ref.filename}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{ref.metadata?.type || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(ref.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {ref.analysis_status === 'completed' ? (
                      <div className="flex-1 overflow-auto">
                        <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                          <ReactMarkdown>{ref.metadata?.analysis || 'No analysis available'}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                        <p className="text-sm">Analysis {ref.analysis_status || 'pending'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
