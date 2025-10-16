import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { documentsApi, agentsApi, generatedDocumentsApi } from '../services/api';
import type { Document, DocumentFolder } from '../types';
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
  Check
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Database className="text-green-metallic" size={32} />
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
                  ? 'bg-green-metallic text-white shadow-md'
                  : isDarkMode
                  ? 'glass-dark text-gray-300 hover:bg-white/10'
                  : 'glass text-gray-700 hover:bg-green-metallic/10'
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
    { label: 'Decided', value: decidedCount, icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-500/20' },
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
      <Icon size={24} className="mx-auto mb-2 text-green-metallic" />
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
          } border focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
        >
          <option value="all">All Agents</option>
          <option value="core">Core Agents</option>
          <option value="quality">Quality Agents</option>
          <option value="support">Support Agents</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw size={32} className="mx-auto mb-4 text-green-metallic animate-spin" />
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
    } hover:border-green-metallic/50 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {activity.agent_type}
            </span>
            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">
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
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-medium">
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
// GENERATED DOCS TAB (NEW)
// ============================================
const GeneratedDocsTab: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
    }
  }, [currentProject]);

  const loadDocuments = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const response = await generatedDocumentsApi.getByProject(currentProject.id);
      setDocuments(response.documents);
      if (response.documents.length > 0 && !selectedDoc) {
        setSelectedDoc(response.documents[0]);
      }
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateDocuments = async () => {
    if (!currentProject) return;

    setGenerating(true);
    try {
      await generatedDocumentsApi.generate(currentProject.id);
      await loadDocuments();
    } catch (error) {
      console.error('Regenerate error:', error);
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
    { type: 'technical_specs', label: '⚙️ Technical Specs', description: 'Technical details' },
    { type: 'rfp', label: '📄 Request for Proposal', description: 'Send to vendors' },
    { type: 'implementation_plan', label: '🗺️ Implementation Plan', description: 'Execution roadmap' },
    { type: 'vendor_comparison', label: '🔍 Vendor Comparison', description: 'Vendor options' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Document List Sidebar */}
      <div className="lg:col-span-1">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Documents
            </h3>
            <button
              onClick={regenerateDocuments}
              disabled={generating}
              className="p-2 rounded-lg hover:bg-green-metallic/20 transition-colors"
              title="Regenerate all"
            >
              <RefreshCw size={16} className={`text-green-metallic ${generating ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {documentTypes.map((docType) => {
              const doc = documents.find(d => d.document_type === docType.type);
              return (
                <button
                  key={docType.type}
                  onClick={() => setSelectedDoc(doc)}
                  disabled={!doc}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedDoc?.document_type === docType.type
                      ? 'bg-green-metallic text-white'
                      : isDarkMode
                      ? 'hover:bg-white/10 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium text-sm">{docType.label}</div>
                  <div className={`text-xs mt-1 ${
                    selectedDoc?.document_type === docType.type
                      ? 'text-white/80'
                      : isDarkMode
                      ? 'text-gray-500'
                      : 'text-gray-500'
                  }`}>
                    {docType.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="lg:col-span-3">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass`}>
          {selectedDoc && (
            <>
              <div className="p-6 border-b border-green-metallic/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedDoc.title}
                    </h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Last updated: {format(new Date(selectedDoc.updated_at), 'MMM d, yyyy h:mm a')}
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
                        <Check size={20} className="text-green-500" />
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
              </div>

              <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
                {/* Key Sections Panel - extracted insights */}
                {(() => {
                  const sections = extractKeySections(selectedDoc.content);
                  return (
                    <KeySectionsPanel
                      nextSteps={sections.nextSteps}
                      openQuestions={sections.openQuestions}
                      riskAssessment={sections.riskAssessment}
                      isDarkMode={isDarkMode}
                    />
                  );
                })()}

                {/* Full Document Content */}
                <div className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}>
                  <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
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
              <RefreshCw size={32} className="mx-auto mb-4 text-green-metallic animate-spin" />
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
        <Loader2 className="animate-spin text-green-metallic" size={32} />
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
                  ? 'bg-green-metallic text-white'
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
                    ? 'bg-green-metallic text-white'
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
              } focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
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
    } hover:border-green-metallic/50 transition-all`}>
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
  const [query, setQuery] = useState('');

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-8 shadow-glass`}>
      <div className="max-w-2xl mx-auto">
        <h2 className={`text-2xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Search Everything
        </h2>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, documents, activity..."
            className={`w-full pl-12 pr-4 py-4 rounded-xl ${
              isDarkMode
                ? 'bg-white/10 text-white placeholder-gray-400 border-white/20'
                : 'bg-white text-gray-800 placeholder-gray-500 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
          />
        </div>

        <div className="text-center py-12">
          <Search size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Start typing to search across all project data
          </p>
        </div>
      </div>
    </div>
  );
};
