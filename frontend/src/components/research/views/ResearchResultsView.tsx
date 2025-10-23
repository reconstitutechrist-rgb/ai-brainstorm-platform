import React, { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import {
  Globe,
  FolderOpen,
  Sparkles,
  FileQuestion,
  AlertTriangle,
  ExternalLink,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ResearchResults } from '../../UnifiedResearchHub';

interface ResearchResultsViewProps {
  results: ResearchResults;
}

const ResearchResultsView: React.FC<ResearchResultsViewProps> = ({ results }) => {
  const { isDarkMode } = useThemeStore();
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggleSource = (index: number) => {
    setExpandedSources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const copySynthesis = () => {
    if (results.synthesis) {
      navigator.clipboard.writeText(results.synthesis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportResults = () => {
    const content = `# Research Results: ${results.query}\n\n${results.synthesis || 'No synthesis available'}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${results.query.slice(0, 30).replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Research Results
        </h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Query: {results.query}
        </p>
        {results.searchStrategy && (
          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
            isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
          }`}>
            Strategy: {results.searchStrategy}
          </span>
        )}
      </div>

      {/* Source Counts */}
      {(results.webSources || results.documentSources) && (
        <div className="grid grid-cols-2 gap-4">
          {results.webSources && results.webSources.length > 0 && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Globe size={20} className="text-blue-400" />
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {results.webSources.length} Web Sources
                </span>
              </div>
              <p className="text-xs text-gray-500">From web search</p>
            </div>
          )}
          {results.documentSources && results.documentSources.length > 0 && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen size={20} className="text-green-400" />
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {results.documentSources.length} Documents
                </span>
              </div>
              <p className="text-xs text-gray-500">From your project</p>
            </div>
          )}
        </div>
      )}

      {/* Synthesis */}
      {results.synthesis && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500" size={20} />
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Unified Synthesis
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copySynthesis}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                title="Copy synthesis"
              >
                {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
              <button
                onClick={exportResults}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                title="Export results"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
            <ReactMarkdown>{results.synthesis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Web Sources */}
      {results.webSources && results.webSources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="text-blue-500" size={20} />
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Web Sources ({results.webSources.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.webSources.map((source, idx) => (
              <div
                key={idx}
                className={`rounded-lg border ${
                  isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleSource(idx)}
                  className="w-full p-4 text-left flex items-start justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {source.title}
                    </h4>
                    <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {source.snippet}
                    </p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <span className="truncate">{source.url}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  {expandedSources.has(idx) ? (
                    <ChevronUp className="text-gray-400 flex-shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                  )}
                </button>
                {expandedSources.has(idx) && source.analysis && (
                  <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                      <ReactMarkdown>{source.analysis}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Sources */}
      {results.documentSources && results.documentSources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="text-green-500" size={20} />
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Relevant Documents ({results.documentSources.length})
            </h3>
          </div>
          <div className="space-y-2">
            {results.documentSources.map((doc, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {doc.filename}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {doc.type} • Relevance: {Math.round(doc.relevanceScore * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Documents */}
      {results.suggestedDocuments && results.suggestedDocuments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileQuestion className="text-green-500" size={20} />
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Suggested Documents ({results.suggestedDocuments.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.suggestedDocuments.map((doc, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  doc.priority === 'high'
                    ? isDarkMode ? 'border-red-500 bg-red-500/10' : 'border-red-500 bg-red-50'
                    : doc.priority === 'medium'
                    ? isDarkMode ? 'border-yellow-500 bg-yellow-500/10' : 'border-yellow-500 bg-yellow-50'
                    : isDarkMode ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {doc.templateName}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : doc.priority === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {doc.priority}
                  </span>
                </div>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {doc.reasoning}
                </p>
                <p className="text-xs text-gray-500">Category: {doc.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identified Gaps */}
      {results.identifiedGaps && results.identifiedGaps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-yellow-500" size={20} />
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Identified Gaps ({results.identifiedGaps.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.identifiedGaps.map((gap, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {gap.area}
                </h4>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {gap.description}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Suggested Action:</strong> {gap.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duration */}
      {results.duration && (
        <div className={`text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Research completed in {(results.duration / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
};

export default ResearchResultsView;
