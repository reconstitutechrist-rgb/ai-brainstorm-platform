/**
 * Research Suggestions Component - Phase 3.2
 *
 * Displays smart research suggestions based on project gaps.
 * Helps users discover what they should research next.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Users,
  Code,
  DollarSign,
  FileCheck,
  Target
} from 'lucide-react';
import api from '../services/api';

interface ResearchGap {
  category: 'competitor' | 'technology' | 'market' | 'user' | 'technical_specs' | 'pricing' | 'legal' | 'other';
  title: string;
  description: string;
  suggestedQuery: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface ResearchSuggestionsData {
  gaps: ResearchGap[];
  totalGaps: number;
  highPriorityCount: number;
  coverageScore: number;
  summary: string;
}

interface Props {
  projectId: string;
  onResearchClick?: (query: string) => void;
  className?: string;
}

const categoryIcons: Record<ResearchGap['category'], React.ReactNode> = {
  competitor: <Target className="w-4 h-4" />,
  technology: <Code className="w-4 h-4" />,
  market: <TrendingUp className="w-4 h-4" />,
  user: <Users className="w-4 h-4" />,
  technical_specs: <FileCheck className="w-4 h-4" />,
  pricing: <DollarSign className="w-4 h-4" />,
  legal: <AlertCircle className="w-4 h-4" />,
  other: <Lightbulb className="w-4 h-4" />,
};

const categoryColors: Record<ResearchGap['category'], string> = {
  competitor: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  technology: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  market: 'bg-green-500/20 text-green-600 border-green-500/30',
  user: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  technical_specs: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
  pricing: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  legal: 'bg-red-500/20 text-red-600 border-red-500/30',
  other: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

const ResearchSuggestions: React.FC<Props> = ({ projectId, onResearchClick, className = '' }) => {
  const [data, setData] = useState<ResearchSuggestionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGaps, setExpandedGaps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (projectId) {
      fetchSuggestions();
    }
  }, [projectId]);

  const validateProjectId = (id: string): boolean => {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation: Check if projectId is valid UUID
      if (!validateProjectId(projectId)) {
        setError('Invalid project ID format');
        setLoading(false);
        return;
      }

      // Create AbortController for timeout handling (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await api.get(`/api/research/suggestions/${projectId}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.data.success) {
          setData(response.data);
        } else {
          setError(response.data.error || 'Failed to fetch suggestions');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
          setError('Request timed out after 30 seconds. Please try again.');
          return;
        }

        throw err; // Re-throw for main catch block
      }
    } catch (err: any) {
      console.error('Error fetching research suggestions:', err);

      // Handle 404 - Project not found
      if (err.response?.status === 404) {
        setError('Project not found. Please select a valid project.');
      }
      // Handle 500 - Server error
      else if (err.response?.status === 500) {
        setError('Server error occurred. Please try again later.');
      }
      // Handle network errors
      else if (!err.response) {
        setError('Network error. Please check your connection and try again.');
      }
      // Generic error
      else {
        setError(err.response?.data?.error || err.message || 'Failed to load research suggestions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResearchClick = (query: string) => {
    if (onResearchClick) {
      onResearchClick(query);
    }
  };

  const toggleGapExpansion = (index: number) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGaps(newExpanded);
  };

  const getCoverageColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority: ResearchGap['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Analyzing research gaps...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchSuggestions}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Research Suggestions</h2>
          </div>
          <button
            onClick={fetchSuggestions}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh suggestions"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Coverage Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">{data.summary}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm text-gray-500">Research Coverage:</span>
              <span className={`text-2xl font-bold ${getCoverageColor(data.coverageScore)}`}>
                {data.coverageScore}%
              </span>
            </div>
          </div>
          {data.highPriorityCount > 0 && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{data.highPriorityCount}</div>
                <div className="text-xs text-red-600">High Priority</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Research Gaps */}
      <div className="p-6">
        {data.gaps.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Great Research Coverage!</h3>
            <p className="text-gray-600">
              Your project has comprehensive research. Keep up the good work!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.gaps.map((gap, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
              >
                <div className="p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`p-2 rounded-lg border ${categoryColors[gap.category]}`}>
                          {categoryIcons[gap.category]}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{gap.title}</h3>
                          <p className="text-sm text-gray-600">{gap.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getPriorityBadge(gap.priority)}
                    </div>
                  </div>

                  {/* Suggested Query */}
                  <div className="mt-3 flex items-center justify-between space-x-3">
                    <div className="flex-1 bg-white px-3 py-2 rounded border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{gap.suggestedQuery}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResearchClick(gap.suggestedQuery)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 whitespace-nowrap"
                    >
                      <Search className="w-4 h-4" />
                      <span>Research Now</span>
                    </button>
                  </div>

                  {/* Reasoning (expandable) */}
                  <button
                    onClick={() => toggleGapExpansion(index)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Info className="w-4 h-4" />
                    <span>{expandedGaps.has(index) ? 'Hide' : 'Show'} reasoning</span>
                  </button>

                  {expandedGaps.has(index) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700">{gap.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchSuggestions;
