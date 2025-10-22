import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { unifiedResearchApi } from '../services/api';
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Download,
  Sparkles,
  Globe,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Database,
  Grid3x3,
  List,
  Target,
  Brain,
  FileQuestion,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type ResearchSource = 'web' | 'documents' | 'all' | 'auto';
type ResearchIntent = 'research' | 'document_discovery' | 'gap_analysis';

interface UnifiedResearchQuery {
  id: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  session_type?: string;
  max_sources: number;
  results_count: number;
  metadata?: {
    researchType?: string;
    sources?: ResearchSource;
    intent?: ResearchIntent;
    synthesis?: string;
    webSources?: Array<{
      url: string;
      title: string;
      snippet: string;
      content?: string;
      analysis?: string;
      source: 'web';
    }>;
    documentSources?: Array<{
      id: string;
      filename: string;
      type: 'reference' | 'generated_document' | 'uploaded_file';
      relevanceScore: number;
    }>;
    suggestedDocuments?: Array<{
      templateId: string;
      templateName: string;
      category: string;
      reasoning: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    identifiedGaps?: Array<{
      area: string;
      description: string;
      suggestedAction: string;
    }>;
    searchStrategy?: string;
    duration?: number;
    error?: string;
    progress?: {
      stage: string;
      message: string;
    };
  };
  created_at: string;
  updated_at: string;
}

const UnifiedResearchInterface: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();

  const [queries, setQueries] = useState<UnifiedResearchQuery[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<ResearchSource>('auto');
  const [selectedIntent, setSelectedIntent] = useState<ResearchIntent>('research');
  const [maxWebSources, setMaxWebSources] = useState(5);
  const [maxDocumentSources, setMaxDocumentSources] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (currentProject) {
      loadQueries();
    }
  }, [currentProject]);

  // Poll for status updates every 3 seconds if any queries are processing
  useEffect(() => {
    const hasProcessing = queries.some(
      q => q.status === 'pending' || q.status === 'processing'
    );

    if (!hasProcessing || !currentProject) return;

    const pollInterval = setInterval(() => {
      loadQueries();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [queries, currentProject]);

  const loadQueries = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const data = await unifiedResearchApi.getProjectQueries(currentProject.id);
      if (data.success) {
        // Filter to only show unified research queries
        const unifiedQueries = (data.queries || []).filter(
          (q: any) => q.session_type === 'unified' || q.metadata?.researchType === 'unified'
        );
        setQueries(unifiedQueries);
      }
    } catch (error) {
      console.error('Error loading queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || !currentProject || !user) return;

    setSubmitting(true);
    try {
      const data = await unifiedResearchApi.submitQuery({
        query: searchInput,
        projectId: currentProject.id,
        userId: user.id,
        sources: selectedSources,
        intent: selectedIntent,
        maxWebSources,
        maxDocumentSources,
        saveResults: true,
      });
      if (data.success) {
        setSearchInput('');
        loadQueries();
      }
    } catch (error) {
      console.error('Error submitting query:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Delete this research query?')) return;

    try {
      await unifiedResearchApi.deleteQuery(queryId);
      loadQueries();
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  const handleExportResults = (query: UnifiedResearchQuery) => {
    const synthesis = query.metadata?.synthesis || 'No synthesis available';
    const blob = new Blob([synthesis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unified-research-${query.query.slice(0, 30).replace(/\s+/g, '-')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="animate-spin text-yellow-500" size={20} />;
      case 'completed':
        return <CheckCircle className="text-green-metallic" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Researching...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'web':
        return <Globe size={16} className="text-blue-400" />;
      case 'documents':
        return <FileText size={16} className="text-green-400" />;
      case 'all':
        return <Database size={16} className="text-purple-400" />;
      case 'auto':
        return <Brain size={16} className="text-yellow-400" />;
      default:
        return <Search size={16} className="text-gray-400" />;
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'research':
        return <Search size={16} className="text-blue-400" />;
      case 'document_discovery':
        return <FileQuestion size={16} className="text-green-400" />;
      case 'gap_analysis':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      default:
        return <Target size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Research Input */}
      <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 mb-6 shadow-glass`}>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-green-metallic" size={24} />
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Unified Research
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Search across web and project documents intelligently
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitQuery}>
          {/* Query Input */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Research Query
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ask anything... I'll search the web and your documents"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
              />
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Sources Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Sources
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'auto', label: 'Auto', icon: <Brain size={16} /> },
                  { value: 'web', label: 'Web', icon: <Globe size={16} /> },
                  { value: 'documents', label: 'Docs', icon: <FileText size={16} /> },
                  { value: 'all', label: 'Both', icon: <Database size={16} /> },
                ].map((source) => (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => setSelectedSources(source.value as ResearchSource)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      selectedSources === source.value
                        ? 'bg-green-metallic border-green-metallic text-white'
                        : isDarkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-white/10'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {source.icon}
                    <span className="text-sm">{source.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intent Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Intent
              </label>
              <div className="space-y-2">
                {[
                  { value: 'research', label: 'Research', icon: <Search size={16} /> },
                  { value: 'document_discovery', label: 'Find Docs', icon: <FileQuestion size={16} /> },
                  { value: 'gap_analysis', label: 'Find Gaps', icon: <AlertTriangle size={16} /> },
                ].map((intent) => (
                  <button
                    key={intent.value}
                    type="button"
                    onClick={() => setSelectedIntent(intent.value as ResearchIntent)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      selectedIntent === intent.value
                        ? 'bg-green-metallic border-green-metallic text-white'
                        : isDarkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-white/10'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {intent.icon}
                    <span className="text-sm">{intent.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max Web Sources
                </label>
                <input
                  type="number"
                  value={maxWebSources}
                  onChange={(e) => setMaxWebSources(parseInt(e.target.value) || 5)}
                  min={1}
                  max={10}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max Document Sources
                </label>
                <input
                  type="number"
                  value={maxDocumentSources}
                  onChange={(e) => setMaxDocumentSources(parseInt(e.target.value) || 10)}
                  min={1}
                  max={20}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !searchInput.trim() || !currentProject}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-metallic hover:bg-green-metallic/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Starting Research...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Start Unified Research
              </>
            )}
          </button>
        </form>
      </div>

      {/* View Mode Toggle */}
      {queries.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {queries.length} unified research {queries.length === 1 ? 'query' : 'queries'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-green-metallic text-white'
                  : isDarkMode
                  ? 'text-gray-400 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-green-metallic text-white'
                  : isDarkMode
                  ? 'text-gray-400 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3x3 size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Queries List */}
      {loading && queries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-green-metallic" size={32} />
        </div>
      ) : queries.length === 0 ? (
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-12 text-center shadow-glass`}>
          <Sparkles className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Unified Research Yet
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Start your first unified research query above
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {queries.map((query) => (
            <div
              key={query.id}
              className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass overflow-hidden`}
            >
              {/* Query Header */}
              <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedQuery(expandedQuery === query.id ? null : query.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(query.status)}
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {query.query}
                      </h3>
                      {expandedQuery === query.id ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>{getStatusText(query.status)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(query.metadata?.sources || 'auto')}
                        <span>{query.metadata?.sources || 'auto'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {getIntentIcon(query.metadata?.intent || 'research')}
                        <span>{query.metadata?.intent || 'research'}</span>
                      </div>
                      {query.metadata?.duration && (
                        <>
                          <span>•</span>
                          <span>{(query.metadata.duration / 1000).toFixed(1)}s</span>
                        </>
                      )}
                    </div>

                    {/* Progress */}
                    {query.status === 'processing' && query.metadata?.progress && (
                      <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <p className="text-sm text-blue-400">
                          {query.metadata.progress.message}
                        </p>
                      </div>
                    )}

                    {/* Search Strategy */}
                    {query.metadata?.searchStrategy && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                          Strategy: {query.metadata.searchStrategy}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {query.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportResults(query);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}
                        title="Export results"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuery(query.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                      title="Delete query"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Results */}
              {expandedQuery === query.id && query.status === 'completed' && query.metadata && (
                <div className="border-t border-gray-700 p-6">
                  {/* Source Counts */}
                  {(query.metadata.webSources || query.metadata.documentSources) && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {query.metadata.webSources && (
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Globe size={20} className="text-blue-400" />
                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {query.metadata.webSources.length} Web Sources
                            </span>
                          </div>
                        </div>
                      )}
                      {query.metadata.documentSources && (
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <FolderOpen size={20} className="text-green-400" />
                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {query.metadata.documentSources.length} Documents
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Synthesis */}
                  {query.metadata.synthesis && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-purple-500" size={20} />
                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          Unified Synthesis
                        </h4>
                      </div>
                      <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                        <ReactMarkdown>{query.metadata.synthesis}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Suggested Documents */}
                  {query.metadata.suggestedDocuments && query.metadata.suggestedDocuments.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <FileQuestion className="text-green-500" size={20} />
                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          Suggested Documents ({query.metadata.suggestedDocuments.length})
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {query.metadata.suggestedDocuments.map((doc, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg border-l-4 ${
                              doc.priority === 'high'
                                ? 'border-red-500 bg-red-500/10'
                                : doc.priority === 'medium'
                                ? 'border-yellow-500 bg-yellow-500/10'
                                : 'border-blue-500 bg-blue-500/10'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                {doc.templateName}
                              </h5>
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
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {doc.reasoning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Identified Gaps */}
                  {query.metadata.identifiedGaps && query.metadata.identifiedGaps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="text-yellow-500" size={20} />
                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          Identified Gaps ({query.metadata.identifiedGaps.length})
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {query.metadata.identifiedGaps.map((gap, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50'} border border-yellow-500/30`}
                          >
                            <h5 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {gap.area}
                            </h5>
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
                </div>
              )}

              {/* Failed State */}
              {expandedQuery === query.id && query.status === 'failed' && query.metadata?.error && (
                <div className="border-t border-gray-700 p-6">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-red-500 mb-1">Research Failed</h4>
                      <p className="text-sm text-red-400">{query.metadata.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnifiedResearchInterface;
