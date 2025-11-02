import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { documentsApi, agentsApi, generatedDocumentsApi, intelligenceHubApi } from '../services/api';
import type { Document, DocumentFolder } from '../types';
import '../styles/homepage.css';
import {
  Database,
  Activity,
  FileText,
  Clock,
  TrendingUp,
  Eye,
  Download,
  Search,
  FolderOpen,
  Upload,
  Trash2,
  Loader2,
  Plus,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import KeySectionsPanel from '../components/KeySectionsPanel';
import OverviewQuickInsights from '../components/OverviewQuickInsights';
import { extractKeySections } from '../utils/markdownSectionExtractor';

export const ProjectIntelligenceHub: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'decisions' | 'generated-docs' | 'user-docs' | 'search'>('overview');

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <Database size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a project to view its intelligence hub
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Database, description: 'Project dashboard' },
    { id: 'activity', label: 'Activity Log', icon: Activity, description: 'All agent actions' },
    { id: 'decisions', label: 'Decision Trail', icon: TrendingUp, description: 'Version history' },
    { id: 'generated-docs', label: 'Generated Docs', icon: Sparkles, description: 'Auto-generated' },
    { id: 'user-docs', label: 'Your Documents', icon: FolderOpen, description: 'Uploaded files' },
    { id: 'search', label: 'Search', icon: Search, description: 'Find anything' },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Database className="text-cyan-primary" size={32} />
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Project Intelligence Hub
          </h1>
        </div>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Complete visibility into everything tracked, decided, and documented
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 mb-8 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-primary text-white shadow-md'
                  : isDarkMode
                  ? 'glass-dark text-gray-300 hover:bg-white/10'
                  : 'glass text-gray-700 hover:bg-cyan-primary/10'
              }`}
            >
              <Icon size={20} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'opacity-60'}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'decisions' && <DecisionTrailTab />}
        {activeTab === 'generated-docs' && <GeneratedDocsTab />}
        {activeTab === 'user-docs' && <UserDocsTab />}
        {activeTab === 'search' && <SearchTab />}
      </div>
    </div>
  );
};

// ============================================
// OVERVIEW TAB
// ============================================
const OverviewTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
    }
  }, [currentProject]);

  const loadDocuments = async () => {
    if (!currentProject) return;

    setLoadingDocs(true);
    try {
      const response = await generatedDocumentsApi.getByProject(currentProject.id);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const decidedCount = currentProject?.items?.filter((i: any) => i.state === 'decided').length || 0;
  const exploringCount = currentProject?.items?.filter((i: any) => i.state === 'exploring').length || 0;
  const parkedCount = currentProject?.items?.filter((i: any) => i.state === 'parked').length || 0;

  const stats = [
    { label: 'Decided', value: decidedCount, icon: TrendingUp, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    { label: 'Exploring', value: exploringCount, icon: Eye, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { label: 'Parked', value: parkedCount, icon: FolderOpen, color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Project Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-8 shadow-glass`}
      >
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {currentProject?.title}
        </h2>
        {currentProject?.description && (
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            {currentProject.description}
          </p>
        )}
        <div className="flex items-center space-x-4 text-sm">
          <span className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            <Clock size={14} />
            <span>Created {format(new Date(currentProject?.created_at || new Date()), 'MMM d, yyyy')}</span>
          </span>
          <span className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            <Activity size={14} />
            <span>Updated {format(new Date(currentProject?.updated_at || new Date()), 'MMM d, yyyy')}</span>
          </span>
        </div>
      </motion.div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass text-center`}
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mx-auto mb-3`}>
                <Icon size={24} className={stat.color} />
              </div>
              <div className={`text-4xl font-bold mb-1 ${stat.color}`}>
                {stat.value}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Insights from Generated Documents */}
      {!loadingDocs && documents.length > 0 && (
        <OverviewQuickInsights
          documents={documents}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
      >
        <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Quick Access
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAccessButton icon={Sparkles} label="View Generated Docs" />
          <QuickAccessButton icon={Activity} label="Activity Log" />
          <QuickAccessButton icon={TrendingUp} label="Decision Trail" />
          <QuickAccessButton icon={Download} label="Export All" />
        </div>
      </motion.div>
    </div>
  );
};

const QuickAccessButton: React.FC<{ icon: any; label: string }> = ({ icon: Icon, label }) => {
  const { isDarkMode } = useThemeStore();

  return (
    <button className={`p-4 rounded-xl text-center transition-all ${
      isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white/70'
    }`}>
      <Icon size={24} className="mx-auto mb-2 text-cyan-primary" />
      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        {label}
      </span>
    </button>
  );
};

// ============================================
// ACTIVITY TAB
// ============================================
const ActivityTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const [filter, setFilter] = useState<'all' | 'core' | 'quality' | 'support'>('all');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentProject } = useProjectStore();

  useEffect(() => {
    loadActivities();
  }, [currentProject]);

  const loadActivities = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const response = await agentsApi.getActivity(currentProject.id, 50);
      setActivities(response.activity || []);
    } catch (error) {
      console.error('Load activities error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Complete Agent Activity Log
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className={`px-4 py-2 rounded-xl ${
            isDarkMode
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-white text-gray-800 border-gray-300'
          } border focus:outline-none focus:ring-2 focus:ring-cyan-primary/50`}
        >
          <option value="all">All Agents</option>
          <option value="core">Core Agents</option>
          <option value="quality">Quality Agents</option>
          <option value="support">Support Agents</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw size={32} className="mx-auto mb-4 text-cyan-primary animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            No activity logged yet
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
          {activities.map((activity, index) => (
            <ActivityLogEntry key={index} activity={activity} isDarkMode={isDarkMode} />
          ))}
        </div>
      )}
    </div>
  );
};

const ActivityLogEntry: React.FC<{ activity: any; isDarkMode: boolean }> = ({ activity, isDarkMode }) => {
  return (
    <div className={`p-4 rounded-xl border ${
      isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/30'
    } hover:border-cyan-primary/50 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {activity.agent_type}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs font-medium">
              {activity.action}
            </span>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {JSON.stringify(activity.details)}
          </p>
        </div>
        <div className="text-right ml-4">
          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DECISION TRAIL TAB
// ============================================
const DecisionTrailTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const decidedItems = currentProject?.items?.filter((i: any) => i.state === 'decided') || [];

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}>
      <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        Complete Decision Trail & Version History
      </h2>

      {decidedItems.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            No decisions made yet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {decidedItems.map((item: any, index: number) => (
            <DecisionTrailItem key={item.id} item={item} index={index} isDarkMode={isDarkMode} />
          ))}
        </div>
      )}
    </div>
  );
};

const DecisionTrailItem: React.FC<{ item: any; index: number; isDarkMode: boolean }> = ({ item, index, isDarkMode }) => {
  return (
    <div className={`border rounded-xl ${
      isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                Decision #{index + 1}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {item.id}
              </span>
            </div>
            <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {item.text}
            </p>
            {item.citation && (
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div><strong>User said:</strong> "{item.citation.userQuote}"</div>
                <div><strong>When:</strong> {format(new Date(item.citation.timestamp), 'MMM d, yyyy h:mm a')}</div>
                <div><strong>Confidence:</strong> {item.citation.confidence}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// GENERATED DOCS TAB (NEW) - Smart File System
// ============================================
const GeneratedDocsTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [qualityScores, setQualityScores] = useState<Map<string, any>>(new Map());
  const [isQualityScoreExpanded, setIsQualityScoreExpanded] = useState(false);

  // Smart folder system state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['complete', 'incomplete']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  /**
   * Strip project name from document title for cleaner display
   * Handles format: "Project Name - Document Type" → "Document Type"
   * Returns original if no separator found (already clean)
   */
  const stripProjectName = (title: string): string => {
    const separatorIndex = title.indexOf(' - ');
    if (separatorIndex !== -1) {
      return title.substring(separatorIndex + 3).trim();
    }
    return title;
  };

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
      loadRecommendations();
    }
  }, [currentProject]);

  const loadDocuments = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const response = await generatedDocumentsApi.getByProject(currentProject.id);

      // Filter out deprecated document types (vendor_comparison) as a safety net
      const validDocuments = (response.documents || []).filter(
        (doc: any) => doc.document_type !== 'vendor_comparison'
      );

      setDocuments(validDocuments);
      if (validDocuments.length > 0 && !selectedDoc) {
        setSelectedDoc(validDocuments[0]);
      }

      // Load quality scores for all documents
      validDocuments.forEach(async (doc: any) => {
        try {
          const scoreResponse = await generatedDocumentsApi.getQualityScore(doc.id);
          setQualityScores(prev => new Map(prev).set(doc.id, scoreResponse.qualityScore));
        } catch (error) {
          console.error(`Failed to load quality score for ${doc.id}:`, error);
        }
      });
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!currentProject) return;

    try {
      const response = await generatedDocumentsApi.getRecommendations(currentProject.id);
      setRecommendations(response.recommendations);
    } catch (error) {
      console.error('Load recommendations error:', error);
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  // Toggle category expansion
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  // Organize documents by completion and category
  const organizeDocuments = () => {
    const completeDocsMap: Record<string, any[]> = {
      software_technical: [],
      business: [],
      development: [],
    };
    const incompleteDocsMap: Record<string, any[]> = {
      software_technical: [],
      business: [],
      development: [],
    };

    documents.forEach((doc) => {
      const completionPercent = doc.completion_percent ?? 0;
      const category = doc.folder_category || 'development'; // Default to development if not set

      if (completionPercent === 100) {
        if (completeDocsMap[category]) {
          completeDocsMap[category].push(doc);
        }
      } else {
        if (incompleteDocsMap[category]) {
          incompleteDocsMap[category].push(doc);
        }
      }
    });

    return { completeDocsMap, incompleteDocsMap };
  };

  const { completeDocsMap, incompleteDocsMap } = organizeDocuments();

  // Count documents in each category
  const completeCount = Object.values(completeDocsMap).flat().length;
  const incompleteCount = Object.values(incompleteDocsMap).flat().length;

  const regenerateDocuments = async () => {
    if (!currentProject) return;

    setGenerating(true);
    setGeneratingProgress('Preparing to generate documents...');

    try {
      setGeneratingProgress('Analyzing project context...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI feedback

      setGeneratingProgress('Generating all documents with AI...');
      const response = await generatedDocumentsApi.generate(currentProject.id);

      setGeneratingProgress('Loading updated documents...');
      await loadDocuments();

      setGeneratingProgress(`Successfully generated ${response.documents?.length || 11} documents!`);
      setTimeout(() => setGeneratingProgress(''), 3000);
    } catch (error) {
      console.error('Regenerate error:', error);
      setGeneratingProgress('Error generating documents. Please try again.');
      setTimeout(() => setGeneratingProgress(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!selectedDoc) return;

    const blob = new Blob([selectedDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!selectedDoc) return;

    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const documentTypes = [
    { type: 'project_establishment', label: '🏗️ Project Establishment', description: 'What you\'ve defined' },
    { type: 'decision_log', label: '✅ Decision Log', description: 'All decisions' },
    { type: 'rejection_log', label: '❌ Rejection Log', description: 'What you don\'t want' },
    { type: 'project_brief', label: '📋 Project Brief', description: 'Complete summary' },
    { type: 'next_steps', label: '🎯 Next Steps', description: 'Action items' },
    { type: 'open_questions', label: '❓ Open Questions', description: 'Unanswered questions' },
    { type: 'risk_assessment', label: '⚠️ Risk Assessment', description: 'Risks & mitigation' },
    { type: 'technical_specs', label: '⚙️ Technical Specs', description: 'Technical details' },
    { type: 'rfp', label: '📄 Request for Proposal', description: 'Send to vendors' },
    { type: 'implementation_plan', label: '🗺️ Implementation Plan', description: 'Execution roadmap' },
  ];

  // Category labels
  const categoryLabels: Record<string, string> = {
    software_technical: '⚙️ Software & Technical',
    business: '💼 Business',
    development: '👨‍💻 Development',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Smart Folder Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Regenerate All Button */}
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass`}>
          <button
            onClick={regenerateDocuments}
            disabled={generating}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
              generating
                ? 'bg-cyan-primary/50 cursor-not-allowed'
                : 'bg-cyan-primary hover:bg-cyan-primary/90 shadow-lg hover:shadow-xl'
            } text-white`}
          >
            <Sparkles size={18} className={generating ? 'animate-pulse' : ''} />
            <span>{generating ? 'Generating...' : 'Regenerate All Docs'}</span>
            {generating && <Loader2 size={16} className="animate-spin" />}
          </button>

          {/* Progress Indicator */}
          {generatingProgress && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 p-3 rounded-lg ${
                isDarkMode ? 'bg-cyan-primary/10' : 'bg-cyan-primary/20'
              }`}
            >
              <div className="flex items-center space-x-2">
                {generating ? (
                  <Loader2 size={14} className="text-cyan-primary animate-spin flex-shrink-0" />
                ) : (
                  <Check size={14} className="text-cyan-primary flex-shrink-0" />
                )}
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {generatingProgress}
                </p>
              </div>
            </motion.div>
          )}

          <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-center`}>
            {documents.length} documents • {completeCount} complete • {incompleteCount} incomplete
          </div>
        </div>

        {/* Smart Folder Structure */}
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin`}>
          <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Smart Folders
          </h3>
          <div className="space-y-2">
            {/* Complete Folder */}
            <div>
              <button
                onClick={() => toggleFolder('complete')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FolderOpen size={18} className="text-cyan-400" />
                  <span className="text-sm font-medium">Complete (100%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                    {completeCount}
                  </span>
                  <span className={`transform transition-transform ${expandedFolders.has('complete') ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              {/* Complete Categories */}
              {expandedFolders.has('complete') && (
                <div className="ml-6 mt-2 space-y-2">
                  {Object.entries(completeDocsMap).map(([category, docs]) => {
                    if (docs.length === 0) return null;
                    const categoryKey = `complete-${category}`;
                    return (
                      <div key={categoryKey}>
                        <button
                          onClick={() => toggleCategory(categoryKey)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-sm ${
                            isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {categoryLabels[category]}
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs opacity-60">{docs.length}</span>
                            <span className={`transform transition-transform text-xs ${expandedCategories.has(categoryKey) ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                          </div>
                        </button>

                        {/* Documents in category */}
                        {expandedCategories.has(categoryKey) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {docs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`w-full text-left p-2 rounded-lg transition-all text-xs ${
                                  selectedDoc?.id === doc.id
                                    ? 'bg-cyan-primary text-white'
                                    : isDarkMode
                                    ? 'hover:bg-white/10 text-gray-400'
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate min-w-0 flex-1" title={stripProjectName(doc.title)}>{stripProjectName(doc.title)}</span>
                                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${
                                    selectedDoc?.id === doc.id
                                      ? 'bg-white/20 text-white'
                                      : 'bg-cyan-500/20 text-cyan-400'
                                  }`}>
                                    100%
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incomplete Folder */}
            <div>
              <button
                onClick={() => toggleFolder('incomplete')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FolderOpen size={18} className="text-yellow-400" />
                  <span className="text-sm font-medium">Incomplete (&lt;100%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    {incompleteCount}
                  </span>
                  <span className={`transform transition-transform ${expandedFolders.has('incomplete') ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              {/* Incomplete Categories */}
              {expandedFolders.has('incomplete') && (
                <div className="ml-6 mt-2 space-y-2">
                  {Object.entries(incompleteDocsMap).map(([category, docs]) => {
                    if (docs.length === 0) return null;
                    const categoryKey = `incomplete-${category}`;
                    return (
                      <div key={categoryKey}>
                        <button
                          onClick={() => toggleCategory(categoryKey)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-sm ${
                            isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {categoryLabels[category]}
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs opacity-60">{docs.length}</span>
                            <span className={`transform transition-transform text-xs ${expandedCategories.has(categoryKey) ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                          </div>
                        </button>

                        {/* Documents in category */}
                        {expandedCategories.has(categoryKey) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {docs.map((doc) => {
                              const completionPercent = doc.completion_percent ?? 0;
                              const completionColor =
                                completionPercent >= 75 ? 'text-cyan-400 bg-cyan-500/20' :
                                completionPercent >= 50 ? 'text-yellow-400 bg-yellow-500/20' :
                                'text-red-400 bg-red-500/20';
                              return (
                                <button
                                  key={doc.id}
                                  onClick={() => setSelectedDoc(doc)}
                                  className={`w-full text-left p-2 rounded-lg transition-all text-xs ${
                                    selectedDoc?.id === doc.id
                                      ? 'bg-cyan-primary text-white'
                                      : isDarkMode
                                      ? 'hover:bg-white/10 text-gray-400'
                                      : 'hover:bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate min-w-0 flex-1" title={stripProjectName(doc.title)}>{stripProjectName(doc.title)}</span>
                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${
                                      selectedDoc?.id === doc.id
                                        ? 'bg-white/20 text-white'
                                        : completionColor
                                    }`}>
                                      {completionPercent}%
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="lg:col-span-3">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass`}>
          {selectedDoc && (
            <>
              <div className="p-6 border-b border-cyan-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {stripProjectName(selectedDoc.title)}
                      </h2>
                      {/* Completion Badge */}
                      {selectedDoc.completion_percent !== undefined && (
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedDoc.completion_percent === 100
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                            : selectedDoc.completion_percent >= 75
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : selectedDoc.completion_percent >= 50
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}>
                          {selectedDoc.completion_percent}% Complete
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Last updated: {format(new Date(selectedDoc.updated_at), 'MMM d, yyyy h:mm a')} • Version {selectedDoc.version}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      } transition-colors`}
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check size={20} className="text-cyan-500" />
                      ) : (
                        <Copy size={20} />
                      )}
                    </button>
                    <button
                      onClick={downloadDocument}
                      className={`p-2 rounded-lg ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      } transition-colors`}
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                {/* Missing Fields Panel for Incomplete Documents */}
                {selectedDoc.completion_percent !== undefined &&
                 selectedDoc.completion_percent < 100 &&
                 selectedDoc.missing_fields &&
                 selectedDoc.missing_fields.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="text-yellow-500 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                          Missing Information
                        </h3>
                        <p className={`text-sm mb-3 ${isDarkMode ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
                          This document needs more information from your project's decided items. Add these details to reach 100% completion:
                        </p>
                        <div className="space-y-1.5">
                          {selectedDoc.missing_fields.map((field: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-sm">
                              <span className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}>•</span>
                              <span className={isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}>
                                {field}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={regenerateDocuments}
                          disabled={generating}
                          className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            generating
                              ? 'bg-yellow-500/30 cursor-not-allowed'
                              : 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50'
                          } ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}
                        >
                          {generating ? 'Regenerating...' : 'Re-examine with Current Decisions'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quality Score Panel - Expandable */}
                {qualityScores.get(selectedDoc.id) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}
                  >
                    {/* Clickable Header Button */}
                    <button
                      onClick={() => setIsQualityScoreExpanded(!isQualityScoreExpanded)}
                      className={`w-full p-4 flex items-center justify-between transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          Document Quality Score: {qualityScores.get(selectedDoc.id)?.overall_score}/100
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-cyan-primary">
                          {qualityScores.get(selectedDoc.id)?.overall_score}
                        </div>
                        {isQualityScoreExpanded ? (
                          <ChevronUp className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                        ) : (
                          <ChevronDown className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                        )}
                      </div>
                    </button>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isQualityScoreExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                              {[
                                { label: 'Complete', value: qualityScores.get(selectedDoc.id)?.completeness },
                                { label: 'Consistent', value: qualityScores.get(selectedDoc.id)?.consistency },
                                { label: 'Citations', value: qualityScores.get(selectedDoc.id)?.citation_coverage },
                                { label: 'Readable', value: qualityScores.get(selectedDoc.id)?.readability },
                                { label: 'Confidence', value: qualityScores.get(selectedDoc.id)?.confidence },
                              ].map((metric) => (
                                <div key={metric.label} className="text-center p-3 rounded-lg bg-white/5">
                                  <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {metric.label}
                                  </div>
                                  <div className={`text-2xl font-bold ${
                                    metric.value >= 80 ? 'text-cyan-500' :
                                    metric.value >= 60 ? 'text-yellow-500' :
                                    'text-red-500'
                                  }`}>
                                    {metric.value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Issues */}
                            {qualityScores.get(selectedDoc.id)?.issues?.length > 0 && (
                              <div className={`p-3 rounded-lg mb-3 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                                <div className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                                  Issues Detected:
                                </div>
                                <ul className={`text-sm space-y-1 list-disc list-inside ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                                  {qualityScores.get(selectedDoc.id)?.issues.map((issue: string, idx: number) => (
                                    <li key={idx}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Suggestions */}
                            {qualityScores.get(selectedDoc.id)?.suggestions?.length > 0 && (
                              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}>
                                <div className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                  Suggestions for Improvement:
                                </div>
                                <ul className={`text-sm space-y-1 list-disc list-inside ${isDarkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                                  {qualityScores.get(selectedDoc.id)?.suggestions.map((suggestion: string, idx: number) => (
                                    <li key={idx}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>

              <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
                {/* Key Sections Panel - Hidden per user request */}
                {/* {!['next_steps', 'open_questions', 'risk_assessment'].includes(selectedDoc.document_type) && (() => {
                  const sections = extractKeySections(selectedDoc.content);
                  return (
                    <KeySectionsPanel
                      nextSteps={sections.nextSteps}
                      openQuestions={sections.openQuestions}
                      riskAssessment={sections.riskAssessment}
                      isDarkMode={isDarkMode}
                    />
                  );
                })()} */}

                {/* Full Document Content with Enhanced Section Styling */}
                <div className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none prose-headings:scroll-mt-4`}>
                  <ReactMarkdown
                    components={{
                      // Custom H2 component with visual separator
                      h2: ({ children, ...props }) => (
                        <div className="mt-12 mb-6 first:mt-0">
                          <div className={`border-t-2 ${isDarkMode ? 'border-cyan-500/30' : 'border-cyan-500/40'} mb-4`} />
                          <h2
                            className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} pb-2 border-b-2 ${isDarkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}
                            {...props}
                          >
                            {children}
                          </h2>
                        </div>
                      ),
                      // Custom H3 component with subtle styling
                      h3: ({ children, ...props }) => (
                        <h3
                          className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mt-8 mb-4 pl-4 border-l-4 ${isDarkMode ? 'border-cyan-500/40' : 'border-cyan-500/50'}`}
                          {...props}
                        >
                          {children}
                        </h3>
                      ),
                      // Enhanced paragraph spacing
                      p: ({ children, ...props }) => (
                        <p className="mb-4 leading-relaxed" {...props}>
                          {children}
                        </p>
                      ),
                      // Enhanced list styling
                      ul: ({ children, ...props }) => (
                        <ul className="mb-6 space-y-2 list-disc pl-6" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="mb-6 space-y-2 list-decimal pl-6" {...props}>
                          {children}
                        </ol>
                      ),
                      // Enhanced code blocks
                      code: ({ inline, children, ...props }: any) => (
                        inline ? (
                          <code className={`px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-gray-100 text-cyan-600'}`} {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className={`block p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} overflow-x-auto`} {...props}>
                            {children}
                          </code>
                        )
                      ),
                    }}
                  >
                    {selectedDoc.content}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {!selectedDoc && !loading && (
            <div className="p-12 text-center">
              <Sparkles size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a document to view
              </p>
            </div>
          )}

          {loading && (
            <div className="p-12 text-center">
              <RefreshCw size={32} className="mx-auto mb-4 text-cyan-primary animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// USER DOCS TAB (Renamed from DocumentsTab)
// ============================================
const UserDocsTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch folders and documents
  useEffect(() => {
    if (currentProject?.id) {
      loadData();
    }
  }, [currentProject?.id]);

  const loadData = async () => {
    if (!currentProject?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [foldersRes, docsRes] = await Promise.all([
        documentsApi.getFolders(currentProject.id),
        documentsApi.getByProject(currentProject.id)
      ]);

      if (foldersRes.success) {
        setFolders(foldersRes.folders || []);
      }

      if (docsRes.success) {
        setDocuments(docsRes.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!currentProject?.id || !user?.id || !newFolderName.trim()) return;

    try {
      const result = await documentsApi.createFolder(
        currentProject.id,
        user.id,
        newFolderName.trim()
      );

      if (result.success && result.folder) {
        setFolders([...folders, result.folder]);
        setNewFolderName('');
        setShowNewFolderModal(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError('Failed to create folder');
    }
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject?.id || !user?.id) return;

    try {
      setUploading(true);
      setError(null);

      const folderId = selectedFolder !== 'all' ? selectedFolder : undefined;
      const result = await documentsApi.upload(
        currentProject.id,
        user.id,
        file,
        folderId
      );

      if (result.success && result.document) {
        setDocuments([result.document, ...documents]);
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const result = await documentsApi.delete(documentId);
      if (result.success) {
        setDocuments(documents.filter(d => d.id !== documentId));
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document');
    }
  };

  // Filter documents by folder
  const filteredDocuments = selectedFolder === 'all'
    ? documents
    : documents.filter(doc => doc.folder_id === selectedFolder);

  // Get folder counts
  const getFolderCount = (folderId: string) => {
    if (folderId === 'all') return documents.length;
    return documents.filter(doc => doc.folder_id === folderId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-cyan-primary" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Sidebar */}
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass lg:col-span-1`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Folders
          </h3>
          <div className="space-y-2">
            {/* All Documents */}
            <button
              onClick={() => setSelectedFolder('all')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                selectedFolder === 'all'
                  ? 'bg-cyan-primary text-white'
                  : isDarkMode
                  ? 'hover:bg-white/10 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={18} />
                <span className="text-sm font-medium">All Documents</span>
              </div>
              <span className="text-xs opacity-70">
                {getFolderCount('all')}
              </span>
            </button>

            {/* Custom Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedFolder === folder.id
                    ? 'bg-cyan-primary text-white'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FolderOpen size={18} />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <span className="text-xs opacity-70">
                  {getFolderCount(folder.id)}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="w-full mt-4 btn-secondary py-2 text-sm flex items-center justify-center space-x-1"
          >
            <Plus size={16} />
            <span>New Folder</span>
          </button>
        </div>

        {/* Documents List */}
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass lg:col-span-3`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Your Documents
            </h3>
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Upload Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No documents yet. Upload your first document to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDelete={() => handleDeleteDocument(doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewFolderModal(false)}>
          <div
            className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 max-w-md w-full mx-4 shadow-glass`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Create New Folder
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className={`w-full px-4 py-2 rounded-xl border ${
                isDarkMode
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-cyan-primary/50`}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />

            <div className="flex items-center space-x-2 mt-4">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="btn-primary flex-1"
              >
                Create Folder
              </button>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Document Item Component
const DocumentItem: React.FC<{
  document: Document;
  onDelete: () => void;
}> = ({ document, onDelete }) => {
  const { isDarkMode } = useThemeStore();

  const getFileIcon = () => {
    const filename = document.filename.toLowerCase();
    if (filename.endsWith('.pdf')) return '📄';
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return '📊';
    if (filename.endsWith('.docx') || filename.endsWith('.doc')) return '📝';
    if (filename.endsWith('.pptx') || filename.endsWith('.ppt')) return '📊';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png') || filename.endsWith('.gif') || filename.endsWith('.webp')) return '🖼️';
    if (filename.endsWith('.zip') || filename.endsWith('.rar')) return '📦';
    if (filename.endsWith('.txt') || filename.endsWith('.md')) return '📝';
    return '📁';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownload = () => {
    window.open(document.file_url, '_blank');
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${
      isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/30'
    } hover:border-cyan-primary/50 transition-all`}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <span className="text-2xl">{getFileIcon()}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {document.filename}
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
            {document.description && (
              <span className="ml-2 text-xs italic">"{document.description}"</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDownload}
          className={`p-2 rounded-lg ${
            isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          } transition-colors`}
          title="Download"
        >
          <Download size={18} />
        </button>
        <button
          onClick={onDelete}
          className={`p-2 rounded-lg ${
            isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
          } transition-colors text-red-500`}
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// SEARCH TAB
// ============================================
const SearchTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    type: 'qa' | 'document';
    timestamp: Date;
    metadata?: any;
  }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<{
    type: 'empty' | 'answer' | 'document';
    data: any;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentProject || isProcessing) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    // Add user message to chat
    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      type: 'qa' as const,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await intelligenceHubApi.conversation(
        currentProject.id,
        userMessage,
        messages.map(m => ({ role: m.role, content: m.content }))
      );

      if (response.success) {
        // Add AI response to chat
        const aiMessage = {
          role: 'assistant' as const,
          content: response.response.content,
          type: response.response.type,
          timestamp: new Date(),
          metadata: response.response.metadata
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update right panel
        if (response.response.type === 'qa') {
          setRightPanelContent({
            type: 'answer',
            data: {
              content: response.response.content,
              sources: response.response.metadata.sources || [],
              relatedTopics: response.response.metadata.relatedTopics || []
            }
          });
        } else {
          setRightPanelContent({
            type: 'document',
            data: {
              content: response.response.content,
              ...response.response.metadata
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Conversation error:', error);

      // Extract error message
      let errorText = 'Sorry, I encountered an error processing your request. Please try again.';
      if (error.response?.data?.details) {
        errorText = `Error: ${error.response.data.details}`;
      } else if (error.message) {
        errorText = `Error: ${error.message}`;
      }

      const errorMessage = {
        role: 'assistant' as const,
        content: errorText,
        type: 'qa' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!rightPanelContent || rightPanelContent.type !== 'document') return;

    const blob = new Blob([rightPanelContent.data.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rightPanelContent.data.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const examplePrompts = [
    { type: 'qa', text: "What are our main technical decisions?", icon: "💬" },
    { type: 'qa', text: "Show me all security-related concerns", icon: "💬" },
    { type: 'qa', text: "What's the status of our implementation?", icon: "💬" },
    { type: 'doc', text: "Create a vendor proposal for database providers", icon: "📄" },
    { type: 'doc', text: "Generate investor documentation", icon: "📄" },
    { type: 'doc', text: "Build API documentation for developers", icon: "📄" },
  ];

  // Show message if no project is selected
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)]">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-12 shadow-glass text-center max-w-md`}>
          <Database size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please create or select a project to use the conversational intelligence feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)]">
      {/* Left Panel - Chat Interface (60%) */}
      <div className={`w-[60%] ${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass flex flex-col`}>
        <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Conversational Intelligence
        </h2>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles size={64} className={`mb-4 ${isDarkMode ? 'text-cyan-primary' : 'text-cyan-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Ask Questions or Generate Documents
              </h3>
              <p className={`mb-6 max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                I can help you understand your project or create custom documents for any audience.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {examplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(prompt.text)}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      isDarkMode
                        ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{prompt.icon}</span>
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-cyan-primary text-white'
                    : isDarkMode
                    ? 'bg-white/5 text-gray-200'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                    <span>{message.type === 'qa' ? '💬 Answer' : '📄 Document'}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content.substring(0, 300)}{message.content.length > 300 ? '...' : ''}</p>
                {message.role === 'assistant' && message.content.length > 300 && (
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-cyan-100' : 'opacity-70'}`}>
                    View full response in the preview panel →
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-primary" />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask a question or request a document..."
            disabled={isProcessing}
            className={`flex-1 px-4 py-3 rounded-xl ${
              isDarkMode
                ? 'bg-white/10 text-white placeholder-gray-500'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-cyan-primary disabled:opacity-50`}
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !inputMessage.trim()}
            className="px-6 py-3 rounded-xl bg-cyan-primary text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Sparkles size={18} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Right Panel - Dynamic Display (40%) */}
      <div className={`w-[40%] ${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass flex flex-col`}>
        {/* Empty State */}
        {(!rightPanelContent || rightPanelContent.type === 'empty') && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Database size={64} className={`mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Preview Panel
            </h3>
            <p className={`text-sm max-w-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Send a message to see answers with sources or generated documents displayed here.
            </p>
            <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              <div className="text-xs space-y-2">
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>💬</span>
                  <span>Q&A answers with source citations</span>
                </div>
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>📄</span>
                  <span>Generated documents with metadata</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Q&A Answer Display */}
        {rightPanelContent && rightPanelContent.type === 'answer' && (
            <div className="flex-1 overflow-y-auto">
              <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Answer
              </h3>
              <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {rightPanelContent.data.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Sources */}
              {rightPanelContent.data.sources && rightPanelContent.data.sources.length > 0 && (
                <div className="mt-4">
                  <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sources:
                  </h4>
                  <div className="space-y-2">
                    {rightPanelContent.data.sources.map((source: any, idx: number) => (
                      <div key={idx} className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                          {source.title}
                        </div>
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          {source.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Document Display */}
        {rightPanelContent && rightPanelContent.type === 'document' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {rightPanelContent.data.title || 'Generated Document'}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      {rightPanelContent.data.documentType}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                      {rightPanelContent.data.audience}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadDocument}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  title="Download document"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {rightPanelContent.data.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Document Metadata */}
              {rightPanelContent.data.sources && rightPanelContent.data.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200/10">
                  <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Generated from {rightPanelContent.data.sources.length} source{rightPanelContent.data.sources.length !== 1 ? 's' : ''}
                  </h4>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
};
