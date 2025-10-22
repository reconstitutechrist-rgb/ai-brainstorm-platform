import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { researchApi } from '../services/api';
import ResearchSuggestions from '../components/ResearchSuggestions';
import '../styles/homepage.css';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchQuery {
  id: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  max_sources: number;
  results_count: number;
  metadata?: {
    synthesis?: string;
    sources?: Array<{
      url: string;
      title: string;
      snippet: string;
      content?: string;
      analysis?: string;
    }>;
    savedReferences?: string[];
    duration?: number;
    error?: string;
    followUpQuestions?: string[];
  };
  created_at: string;
  updated_at: string;
}

const LiveResearchPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [queries, setQueries] = useState<ResearchQuery[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [maxSources, setMaxSources] = useState(5);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Progress tracking state
  const [progressStates, setProgressStates] = useState<Record<string, {
    stage: 'searching' | 'crawling' | 'analyzing' | 'synthesizing';
    percent: number;
    message: string;
  }>>({});

  // Note: Homepage background is managed by parent ResearchHubPage

  useEffect(() => {
    if (currentProject) {
      loadQueries();
    }
  }, [currentProject]);

  // Poll for status updates every 5 seconds if any queries are processing
  useEffect(() => {
    const hasProcessing = queries.some(
      q => q.status === 'pending' || q.status === 'processing'
    );

    if (!hasProcessing || !currentProject) return;

    const pollInterval = setInterval(() => {
      loadQueries();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [queries, currentProject]);

  // Progress estimation for processing queries
  useEffect(() => {
    const processingQueries = queries.filter(q => q.status === 'processing');
    if (processingQueries.length === 0) return;

    const interval = setInterval(() => {
      const newProgressStates: Record<string, {
        stage: 'searching' | 'crawling' | 'analyzing' | 'synthesizing';
        percent: number;
        message: string;
      }> = {};

      processingQueries.forEach(query => {
        const elapsed = Date.now() - new Date(query.created_at).getTime();

        let stage: 'searching' | 'crawling' | 'analyzing' | 'synthesizing';
        let percent: number;
        let message: string;

        if (elapsed < 5000) {
          stage = 'searching';
          percent = Math.min((elapsed / 5000) * 25, 25);
          message = 'Searching the web for relevant sources...';
        } else if (elapsed < 15000) {
          stage = 'crawling';
          percent = 25 + Math.min(((elapsed - 5000) / 10000) * 25, 25);
          message = 'Crawling and extracting content from sources...';
        } else if (elapsed < 40000) {
          stage = 'analyzing';
          percent = 50 + Math.min(((elapsed - 15000) / 25000) * 35, 35);
          message = 'Analyzing content with AI...';
        } else {
          stage = 'synthesizing';
          percent = 85 + Math.min(((elapsed - 40000) / 10000) * 14, 14);
          message = 'Synthesizing final research report...';
        }

        newProgressStates[query.id] = { stage, percent: Math.min(percent, 99), message };
      });

      setProgressStates(newProgressStates);
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [queries]);

  const loadQueries = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const data = await researchApi.getProjectQueries(currentProject.id);
      if (data.success) {
        setQueries(data.queries || []);
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
      const data = await researchApi.submitQuery({
        query: searchInput,
        projectId: currentProject.id,
        userId: user.id,
        maxSources,
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
      await researchApi.deleteQuery(queryId);
      loadQueries();
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  const handleExportResults = (query: ResearchQuery) => {
    const synthesis = query.metadata?.synthesis || 'No synthesis available';
    const blob = new Blob([synthesis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${query.query.slice(0, 30).replace(/\s+/g, '-')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTransferToIntelligence = (query: ResearchQuery) => {
    if (!currentProject) return;
    // Navigate to Intelligence Hub with query context
    navigate('/intelligence', { state: { fromResearch: true, queryId: query.id } });
  };

  const handleFollowUpClick = (question: string) => {
    setSearchInput(question);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleSuggestedResearch = (query: string) => {
    setSearchInput(query);
    // Optionally auto-submit or just pre-fill
  };

  return (
    <div className="max-w-7xl mx-auto">
        {/* Embedded in Research Hub - no header needed */}

        {/* Smart Research Suggestions - Phase 3.2 */}
        {currentProject && (
          <div className="mb-6">
            <ResearchSuggestions
              projectId={currentProject.id}
              onResearchClick={handleSuggestedResearch}
            />
          </div>
        )}

        {/* Research Input */}
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 mb-6 shadow-glass`}>
          <form onSubmit={handleSubmitQuery}>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Research Query
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="e.g., Latest trends in React Server Components..."
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max Sources
                </label>
                <input
                  type="number"
                  value={maxSources}
                  onChange={(e) => setMaxSources(parseInt(e.target.value) || 5)}
                  min={1}
                  max={10}
                  className={`w-24 px-4 py-3 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
                />
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
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Start Research
                </>
              )}
            </button>
          </form>
        </div>

        {/* View Mode Toggle */}
        {queries.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {queries.length} research {queries.length === 1 ? 'query' : 'queries'}
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
                title="List view"
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
                title="Grid view"
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
            <Globe className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              No Research Queries Yet
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Submit your first research query above to get started
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
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
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{getStatusText(query.status)}</span>
                        <span>•</span>
                        <span>{new Date(query.created_at).toLocaleString()}</span>
                        {query.results_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{query.results_count} sources</span>
                          </>
                        )}
                        {query.metadata?.duration && (
                          <>
                            <span>•</span>
                            <span>{(query.metadata.duration / 1000).toFixed(1)}s</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar for Processing Queries */}
                      {query.status === 'processing' && progressStates[query.id] && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {progressStates[query.id].message}
                            </span>
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {Math.round(progressStates[query.id].percent)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-metallic to-blue-500 transition-all duration-500 ease-out"
                              style={{ width: `${progressStates[query.id].percent}%` }}
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            {['searching', 'crawling', 'analyzing', 'synthesizing'].map((stage) => (
                              <div
                                key={stage}
                                className={`flex-1 text-center text-xs py-1 px-2 rounded ${
                                  progressStates[query.id].stage === stage
                                    ? 'bg-green-metallic/20 text-green-metallic font-semibold'
                                    : isDarkMode
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }`}
                              >
                                {stage.charAt(0).toUpperCase() + stage.slice(1)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {query.status === 'completed' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTransferToIntelligence(query);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                            title="Transfer to Intelligence Hub"
                          >
                            <Database size={18} className="text-blue-500" />
                          </button>
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
                        </>
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
                    {/* Synthesis */}
                    {query.metadata.synthesis && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="text-purple-500" size={20} />
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            AI Synthesis
                          </h4>
                        </div>
                        <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                          <ReactMarkdown>{query.metadata.synthesis}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    {query.metadata.sources && query.metadata.sources.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="text-blue-500" size={20} />
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            Sources ({query.metadata.sources.length})
                          </h4>
                        </div>
                        <div className="grid gap-3">
                          {query.metadata.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg ${
                                isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'
                              } border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {source.title}
                                </h5>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-metallic hover:underline flex items-center gap-1 text-sm"
                                >
                                  <ExternalLink size={14} />
                                  Visit
                                </a>
                              </div>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                                {source.snippet}
                              </p>
                              {source.analysis && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mt-2 pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
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

                    {/* Saved References */}
                    {query.metadata.savedReferences && query.metadata.savedReferences.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-green-metallic/10 border border-green-metallic/30">
                        <p className="text-sm text-green-metallic">
                          ✓ {query.metadata.savedReferences.length} sources saved to Research Hub
                        </p>
                      </div>
                    )}

                    {/* Follow-Up Questions */}
                    {query.metadata.followUpQuestions && query.metadata.followUpQuestions.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="text-purple-500" size={20} />
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            Suggested Follow-Up Research
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {query.metadata.followUpQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFollowUpClick(question)}
                              className={`w-full text-left p-3 rounded-lg transition-colors ${
                                isDarkMode
                                  ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                                  : 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                              }`}
                            >
                              <span className="text-blue-400 mr-2">→</span>
                              <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                                {question}
                              </span>
                            </button>
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

export default LiveResearchPage;
