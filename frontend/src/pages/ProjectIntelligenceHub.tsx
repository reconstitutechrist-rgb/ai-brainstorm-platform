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

  // Shared state for documents across all tabs
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [pinnedDocIds, setPinnedDocIds] = useState<Set<string>>(new Set());
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  // Load all documents on mount
  useEffect(() => {
    if (currentProject) {
      loadAllDocuments();
    }
  }, [currentProject]);

  const loadAllDocuments = async () => {
    if (!currentProject) return;

    setLoadingDocs(true);
    try {
      const [generatedRes, userRes] = await Promise.all([
        generatedDocumentsApi.getByProject(currentProject.id),
        documentsApi.getByProject(currentProject.id)
      ]);

      setAllDocuments(generatedRes.documents || []);
      setUserDocuments(userRes.documents || []);
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const togglePinDocument = (docId: string) => {
    setPinnedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

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
    { id: 'generated-docs', label: `Generated Docs (${allDocuments.length})`, icon: Sparkles, description: 'Auto-generated' },
    { id: 'user-docs', label: `Your Documents (${userDocuments.length})`, icon: FolderOpen, description: 'Uploaded files' },
    { id: 'search', label: 'AI Assistant', icon: Search, description: 'Ask & generate' },
  ];

  return (
    <div className="min-h-screen max-w-[1800px] mx-auto">
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

      {/* Main Layout: Persistent Sidebar + Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Persistent Document Sidebar */}
        <div className="lg:col-span-3">
          <PersistentDocumentSidebar
            allDocuments={allDocuments}
            userDocuments={userDocuments}
            loadingDocs={loadingDocs}
            pinnedDocIds={pinnedDocIds}
            documentSearchQuery={documentSearchQuery}
            setDocumentSearchQuery={setDocumentSearchQuery}
            togglePinDocument={togglePinDocument}
            selectedDocumentId={selectedDocumentId}
            setSelectedDocumentId={setSelectedDocumentId}
            isDarkMode={isDarkMode}
            onRefresh={loadAllDocuments}
          />
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-9 min-h-[600px]">
          {activeTab === 'overview' && (
            <OverviewTab
              allDocuments={allDocuments}
              userDocuments={userDocuments}
              pinnedDocIds={pinnedDocIds}
              setSelectedDocumentId={setSelectedDocumentId}
            />
          )}
          {activeTab === 'activity' && <ActivityTab />}
          {activeTab === 'decisions' && <DecisionTrailTab />}
          {activeTab === 'generated-docs' && (
            <GeneratedDocsTab
              sharedDocuments={allDocuments}
              onDocumentsUpdate={loadAllDocuments}
            />
          )}
          {activeTab === 'user-docs' && (
            <UserDocsTab
              sharedDocuments={userDocuments}
              onDocumentsUpdate={loadAllDocuments}
            />
          )}
          {activeTab === 'search' && <SearchTab />}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PERSISTENT DOCUMENT SIDEBAR
// ============================================
interface PersistentDocumentSidebarProps {
  allDocuments: any[];
  userDocuments: any[];
  loadingDocs: boolean;
  pinnedDocIds: Set<string>;
  documentSearchQuery: string;
  setDocumentSearchQuery: (query: string) => void;
  togglePinDocument: (docId: string) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  isDarkMode: boolean;
  onRefresh: () => void;
}

const PersistentDocumentSidebar: React.FC<PersistentDocumentSidebarProps> = ({
  allDocuments,
  userDocuments,
  loadingDocs,
  pinnedDocIds,
  documentSearchQuery,
  setDocumentSearchQuery,
  togglePinDocument,
  selectedDocumentId,
  setSelectedDocumentId,
  isDarkMode,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'pinned' | 'recent' | 'all'>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['generated', 'uploaded']));

  const stripProjectName = (title: string): string => {
    const separatorIndex = title.indexOf(' - ');
    if (separatorIndex !== -1) {
      return title.substring(separatorIndex + 3).trim();
    }
    return title;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Filter documents based on search and view mode
  const filteredGeneratedDocs = allDocuments.filter(doc =>
    stripProjectName(doc.title).toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  const filteredUserDocs = userDocuments.filter(doc =>
    doc.filename.toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  const pinnedDocs = [...allDocuments, ...userDocuments].filter(doc =>
    pinnedDocIds.has(doc.id)
  );

  const recentDocs = [...allDocuments, ...userDocuments]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 5);

  const getDocIcon = (doc: any) => {
    if (doc.document_type) return '✨'; // Generated doc
    const filename = doc.filename?.toLowerCase() || '';
    if (filename.endsWith('.pdf')) return '📄';
    if (filename.endsWith('.docx') || filename.endsWith('.doc')) return '📝';
    return '📁';
  };

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass sticky top-6 max-h-[calc(100vh-200px)] flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            📚 Documents
          </h3>
          <button
            onClick={onRefresh}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'
            }`}
            title="Refresh documents"
          >
            <RefreshCw size={16} className={loadingDocs ? 'animate-spin text-cyan-primary' : ''} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={documentSearchQuery}
            onChange={(e) => setDocumentSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${
              isDarkMode
                ? 'bg-white/5 text-white placeholder-gray-500 border border-white/10'
                : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-cyan-primary/50`}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'all', label: 'All', count: allDocuments.length + userDocuments.length },
            { id: 'pinned', label: 'Pinned', count: pinnedDocs.length },
            { id: 'recent', label: 'Recent', count: recentDocs.length },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode.id
                  ? 'bg-cyan-primary text-white'
                  : isDarkMode
                  ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.label} ({mode.count})
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-cyan-primary" />
          </div>
        ) : (
          <>
            {/* Pinned View */}
            {viewMode === 'pinned' && (
              <>
                {pinnedDocs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No pinned documents
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                      Click the pin icon to pin documents
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pinnedDocs.map(doc => (
                      <DocumentSidebarItem
                        key={doc.id}
                        doc={doc}
                        isPinned={pinnedDocIds.has(doc.id)}
                        onTogglePin={togglePinDocument}
                        isSelected={selectedDocumentId === doc.id}
                        onClick={() => setSelectedDocumentId(doc.id)}
                        isDarkMode={isDarkMode}
                        icon={getDocIcon(doc)}
                        title={doc.document_type ? stripProjectName(doc.title) : doc.filename}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Recent View */}
            {viewMode === 'recent' && (
              <div className="space-y-2">
                {recentDocs.map(doc => (
                  <DocumentSidebarItem
                    key={doc.id}
                    doc={doc}
                    isPinned={pinnedDocIds.has(doc.id)}
                    onTogglePin={togglePinDocument}
                    isSelected={selectedDocumentId === doc.id}
                    onClick={() => setSelectedDocumentId(doc.id)}
                    isDarkMode={isDarkMode}
                    icon={getDocIcon(doc)}
                    title={doc.document_type ? stripProjectName(doc.title) : doc.filename}
                  />
                ))}
              </div>
            )}

            {/* All View */}
            {viewMode === 'all' && (
              <>
                {/* Generated Documents Section */}
                {filteredGeneratedDocs.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('generated')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg mb-2 ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-cyan-primary" />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Generated ({filteredGeneratedDocs.length})
                        </span>
                      </div>
                      {expandedSections.has('generated') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    {expandedSections.has('generated') && (
                      <div className="space-y-1 ml-2">
                        {filteredGeneratedDocs.map(doc => (
                          <DocumentSidebarItem
                            key={doc.id}
                            doc={doc}
                            isPinned={pinnedDocIds.has(doc.id)}
                            onTogglePin={togglePinDocument}
                            isSelected={selectedDocumentId === doc.id}
                            onClick={() => setSelectedDocumentId(doc.id)}
                            isDarkMode={isDarkMode}
                            icon="✨"
                            title={stripProjectName(doc.title)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* User Documents Section */}
                {filteredUserDocs.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('uploaded')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg mb-2 ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Upload size={14} className="text-blue-400" />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Uploaded ({filteredUserDocs.length})
                        </span>
                      </div>
                      {expandedSections.has('uploaded') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    {expandedSections.has('uploaded') && (
                      <div className="space-y-1 ml-2">
                        {filteredUserDocs.map(doc => (
                          <DocumentSidebarItem
                            key={doc.id}
                            doc={doc}
                            isPinned={pinnedDocIds.has(doc.id)}
                            onTogglePin={togglePinDocument}
                            isSelected={selectedDocumentId === doc.id}
                            onClick={() => setSelectedDocumentId(doc.id)}
                            isDarkMode={isDarkMode}
                            icon={getDocIcon(doc)}
                            title={doc.filename}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredGeneratedDocs.length === 0 && filteredUserDocs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {documentSearchQuery ? 'No documents found' : 'No documents yet'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Document Sidebar Item Component
interface DocumentSidebarItemProps {
  doc: any;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  isSelected: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  icon: string;
  title: string;
}

const DocumentSidebarItem: React.FC<DocumentSidebarItemProps> = ({
  doc,
  isPinned,
  onTogglePin,
  isSelected,
  onClick,
  isDarkMode,
  icon,
  title
}) => {
  return (
    <div
      className={`group relative p-2 rounded-lg cursor-pointer transition-all text-sm ${
        isSelected
          ? 'bg-cyan-primary text-white shadow-md'
          : isDarkMode
          ? 'hover:bg-white/10 text-gray-300'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" title={title}>
            {title}
          </div>
          {doc.completion_percent !== undefined && (
            <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
              {doc.completion_percent}% complete
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(doc.id);
          }}
          className={`flex-shrink-0 p-1 rounded transition-opacity ${
            isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isPinned ? '📌' : '📍'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// OVERVIEW TAB
// ============================================
interface OverviewTabProps {
  allDocuments: any[];
  userDocuments: any[];
  pinnedDocIds: Set<string>;
  setSelectedDocumentId: (id: string | null) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  allDocuments,
  userDocuments,
  pinnedDocIds,
  setSelectedDocumentId
}) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const stripProjectName = (title: string): string => {
    const separatorIndex = title.indexOf(' - ');
    if (separatorIndex !== -1) {
      return title.substring(separatorIndex + 3).trim();
    }
    return title;
  };

  const decidedCount = currentProject?.items?.filter((i: any) => i.state === 'decided').length || 0;
  const exploringCount = currentProject?.items?.filter((i: any) => i.state === 'exploring').length || 0;
  const parkedCount = currentProject?.items?.filter((i: any) => i.state === 'parked').length || 0;

  const completedDocs = allDocuments.filter(doc => doc.completion_percent === 100);
  const inProgressDocs = allDocuments.filter(doc => doc.completion_percent > 0 && doc.completion_percent < 100);

  const pinnedDocs = [...allDocuments, ...userDocuments].filter(doc => pinnedDocIds.has(doc.id));

  const recentDocs = [...allDocuments, ...userDocuments]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 6);

  const featuredDocs = [
    allDocuments.find(doc => doc.document_type === 'project_brief'),
    allDocuments.find(doc => doc.document_type === 'next_steps'),
    allDocuments.find(doc => doc.document_type === 'technical_specs'),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Project Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Sparkles}
          label="Generated Docs"
          value={allDocuments.length}
          color="cyan"
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={FolderOpen}
          label="Uploaded Docs"
          value={userDocuments.length}
          color="blue"
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={Check}
          label="Complete"
          value={completedDocs.length}
          color="green"
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={TrendingUp}
          label="Decisions Made"
          value={decidedCount}
          color="purple"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Featured Documents */}
      {featuredDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
        >
          <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            📌 Key Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredDocs.map((doc: any) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                title={stripProjectName(doc.title)}
                onClick={() => setSelectedDocumentId(doc.id)}
                isDarkMode={isDarkMode}
                isPinned={pinnedDocIds.has(doc.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Pinned Documents */}
      {pinnedDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
        >
          <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            📍 Pinned Documents
            <span className={`text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              ({pinnedDocs.length})
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedDocs.map((doc: any) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                title={doc.document_type ? stripProjectName(doc.title) : doc.filename}
                onClick={() => setSelectedDocumentId(doc.id)}
                isDarkMode={isDarkMode}
                isPinned={true}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
      >
        <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          🕒 Recent Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentDocs.map((doc: any) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              title={doc.document_type ? stripProjectName(doc.title) : doc.filename}
              onClick={() => setSelectedDocumentId(doc.id)}
              isDarkMode={isDarkMode}
              isPinned={pinnedDocIds.has(doc.id)}
              showTimestamp
            />
          ))}
        </div>
      </motion.div>

      {/* Document Browser */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
      >
        <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          📚 All Documents ({allDocuments.length + userDocuments.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAccessCard
            icon={Sparkles}
            label="View All Generated"
            count={allDocuments.length}
            isDarkMode={isDarkMode}
          />
          <QuickAccessCard
            icon={Upload}
            label="View Uploaded"
            count={userDocuments.length}
            isDarkMode={isDarkMode}
          />
          <QuickAccessCard
            icon={Check}
            label="Completed Docs"
            count={completedDocs.length}
            isDarkMode={isDarkMode}
          />
          <QuickAccessCard
            icon={Clock}
            label="In Progress"
            count={inProgressDocs.length}
            isDarkMode={isDarkMode}
          />
        </div>
      </motion.div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: 'cyan' | 'blue' | 'green' | 'purple';
  isDarkMode: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, isDarkMode }) => {
  const colorMap = {
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
    green: { text: 'text-green-400', bg: 'bg-green-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-5 shadow-glass`}
    >
      <div className={`w-12 h-12 rounded-xl ${colorMap[color].bg} flex items-center justify-center mb-3`}>
        <Icon size={24} className={colorMap[color].text} />
      </div>
      <div className={`text-3xl font-bold mb-1 ${colorMap[color].text}`}>
        {value}
      </div>
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </div>
    </motion.div>
  );
};

// Document Card Component
interface DocumentCardProps {
  doc: any;
  title: string;
  onClick: () => void;
  isDarkMode: boolean;
  isPinned: boolean;
  showTimestamp?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, title, onClick, isDarkMode, isPinned, showTimestamp }) => {
  const getDocIcon = () => {
    if (doc.document_type) return '✨';
    const filename = doc.filename?.toLowerCase() || '';
    if (filename.endsWith('.pdf')) return '📄';
    if (filename.endsWith('.docx') || filename.endsWith('.doc')) return '📝';
    return '📁';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all border ${
        isDarkMode
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-primary/50'
          : 'bg-white/50 border-gray-200 hover:bg-white hover:border-cyan-primary/50'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{getDocIcon()}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`} title={title}>
            {title}
          </h4>
          {doc.completion_percent !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex-1 h-1.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full ${
                    doc.completion_percent === 100
                      ? 'bg-cyan-500'
                      : doc.completion_percent >= 75
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${doc.completion_percent}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {doc.completion_percent}%
              </span>
            </div>
          )}
          {showTimestamp && (
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {format(new Date(doc.updated_at || doc.created_at), 'MMM d, h:mm a')}
            </div>
          )}
        </div>
        {isPinned && <span className="text-lg">📌</span>}
      </div>
    </motion.div>
  );
};

// Quick Access Card Component
interface QuickAccessCardProps {
  icon: any;
  label: string;
  count: number;
  isDarkMode: boolean;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ icon: Icon, label, count, isDarkMode }) => {
  return (
    <div className={`p-4 rounded-xl text-center transition-all ${
      isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white'
    }`}>
      <Icon size={28} className="mx-auto mb-2 text-cyan-primary" />
      <div className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        {count}
      </div>
      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
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
interface GeneratedDocsTabProps {
  sharedDocuments: any[];
  onDocumentsUpdate: () => void;
}

const GeneratedDocsTab: React.FC<GeneratedDocsTabProps> = ({ sharedDocuments, onDocumentsUpdate }) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [documents, setDocuments] = useState<any[]>(sharedDocuments);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [qualityScores, setQualityScores] = useState<Map<string, any>>(new Map());
  const [isQualityScoreExpanded, setIsQualityScoreExpanded] = useState(false);

  // Smart folder system state - EXPANDED BY DEFAULT for better visibility
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['complete', 'incomplete']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['complete-software_technical', 'complete-business', 'complete-development',
             'incomplete-software_technical', 'incomplete-business', 'incomplete-development'])
  );

  // Sync with shared documents
  useEffect(() => {
    setDocuments(sharedDocuments);
    if (sharedDocuments.length > 0 && !selectedDoc) {
      setSelectedDoc(sharedDocuments[0]);
    }
  }, [sharedDocuments]);

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
      loadRecommendations();
      loadQualityScores();
    }
  }, [currentProject, documents]);

  const loadQualityScores = async () => {
    documents.forEach(async (doc: any) => {
      try {
        const scoreResponse = await generatedDocumentsApi.getQualityScore(doc.id);
        setQualityScores(prev => new Map(prev).set(doc.id, scoreResponse.qualityScore));
      } catch (error) {
        console.error(`Failed to load quality score for ${doc.id}:`, error);
      }
    });
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
      await onDocumentsUpdate(); // Refresh shared documents

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
                                className={`w-full text-left p-2.5 rounded-lg transition-all text-sm ${
                                  selectedDoc?.id === doc.id
                                    ? 'bg-cyan-primary text-white'
                                    : isDarkMode
                                    ? 'hover:bg-white/10 text-gray-300'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate min-w-0 flex-1 font-medium" title={stripProjectName(doc.title)}>{stripProjectName(doc.title)}</span>
                                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
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
                                  className={`w-full text-left p-2.5 rounded-lg transition-all text-sm ${
                                    selectedDoc?.id === doc.id
                                      ? 'bg-cyan-primary text-white'
                                      : isDarkMode
                                      ? 'hover:bg-white/10 text-gray-300'
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate min-w-0 flex-1 font-medium" title={stripProjectName(doc.title)}>{stripProjectName(doc.title)}</span>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
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
interface UserDocsTabProps {
  sharedDocuments: any[];
  onDocumentsUpdate: () => void;
}

const UserDocsTab: React.FC<UserDocsTabProps> = ({ sharedDocuments, onDocumentsUpdate }) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>(sharedDocuments);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync with shared documents
  useEffect(() => {
    setDocuments(sharedDocuments);
  }, [sharedDocuments]);

  // Fetch folders and documents
  useEffect(() => {
    if (currentProject?.id) {
      loadFolders();
    }
  }, [currentProject?.id]);

  const loadFolders = async () => {
    if (!currentProject?.id) return;

    try {
      setLoading(true);
      setError(null);

      const foldersRes = await documentsApi.getFolders(currentProject.id);

      if (foldersRes.success) {
        setFolders(foldersRes.folders || []);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError('Failed to load folders');
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
        await onDocumentsUpdate(); // Refresh shared documents
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
        await onDocumentsUpdate(); // Refresh shared documents
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
