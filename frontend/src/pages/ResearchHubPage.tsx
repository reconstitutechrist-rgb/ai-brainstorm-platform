import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { referencesApi } from '../services/api';
import type { Reference } from '../types';
import ComparisonView from '../components/ComparisonView';
import LiveResearchPage from './LiveResearchPage';
import DocumentResearchChat from '../components/DocumentResearchChat';
import UnifiedResearchInterface from '../components/UnifiedResearchInterface';
import { AnalysisModeSelector } from '../components/AnalysisModeSelector';
import { ContextAnalysisResults } from '../components/ContextAnalysisResults';
import { TemplateAnalysisResults } from '../components/TemplateAnalysisResults';
import '../styles/homepage.css';
import {
  Upload,
  FileText,
  Image,
  Video,
  File,
  Search,
  Grid,
  List,
  Download,
  Copy,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronRight,
  Tag,
  Trash2,
  RefreshCw,
  Star,
  X,
  Loader2,
  CheckSquare,
  Square,
  ArrowLeftRight,
  Globe,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ResearchHubPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'references' | 'live-research' | 'document-research' | 'unified-research'>('unified-research');
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('date-desc');
  const [filterAnalysisStatus, setFilterAnalysisStatus] = useState<string>('all');
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Batch upload state
  const [uploadQueue, setUploadQueue] = useState<Array<{
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
  }>>([]);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadReferences();
    }
  }, [currentProject]);

  // Poll for reference status updates every 3 seconds if any are pending/processing
  useEffect(() => {
    const hasPendingAnalysis = references.some(
      ref => ref.analysis_status === 'pending' || ref.analysis_status === 'processing'
    );

    if (!hasPendingAnalysis || !currentProject) return;

    const pollInterval = setInterval(() => {
      loadReferences();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [references, currentProject]);

  const loadReferences = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const response = await referencesApi.getByProject(currentProject.id);
      setReferences(response.references);

      // Update selected reference if it's currently selected (to show latest status)
      if (selectedReference) {
        const updatedRef = response.references.find(r => r.id === selectedReference.id);
        if (updatedRef) {
          setSelectedReference(updatedRef);
        }
      }

      // Auto-select first reference if none selected
      if (response.references.length > 0 && !selectedReference) {
        setSelectedReference(response.references[0]);
      }
    } catch (error) {
      console.error('Load references error:', error);
      setReferences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!currentProject || !user?.id || files.length === 0) return;

    // Initialize upload queue with pending status
    const initialQueue = files.map(file => ({
      file,
      status: 'pending' as const,
    }));
    setUploadQueue(initialQueue);
    setUploading(true);

    try {
      // Update queue to show uploading status
      setUploadQueue(prev => prev.map(item => ({ ...item, status: 'uploading' as const })));

      // Use batch upload API for multiple files
      const response = await referencesApi.uploadBatch(
        currentProject.id,
        user.id,
        files
      );

      console.log('[BatchUpload] Response:', response);

      // Update queue based on results
      setUploadQueue(prev =>
        prev.map((item, index) => {
          const result = response.results[index];
          return {
            ...item,
            status: result.success ? 'success' as const : 'error' as const,
            error: result.error,
          };
        })
      );

      // Trigger validation for successful uploads if project has existing decisions
      if (currentProject.items && currentProject.items.length > 0) {
        const successfulUploads = response.results.filter(r => r.success && r.reference);
        for (const result of successfulUploads) {
          if (result.reference) {
            await referencesApi.validateReference(
              result.reference.id,
              currentProject.id
            );
          }
        }
      }

      // Reload references to show newly uploaded files
      await loadReferences();

      // Clear upload queue after 3 seconds
      setTimeout(() => setUploadQueue([]), 3000);
    } catch (error) {
      console.error('Batch upload error:', error);
      // Mark all as error
      setUploadQueue(prev =>
        prev.map(item => ({
          ...item,
          status: 'error' as const,
          error: 'Upload failed',
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <File size={20} />;
    if (type.includes('image')) return <Image size={20} />;
    if (type.includes('video')) return <Video size={20} />;
    if (type.includes('pdf')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const copyToClipboard = () => {
    if (!selectedReference?.metadata?.analysis) return;
    navigator.clipboard.writeText(selectedReference.metadata.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolveConflict = async (
    conflictIndex: number,
    resolution: 'update' | 'keep' | 'clarify'
  ) => {
    if (!selectedReference || !currentProject) return;

    setResolvingConflict(true);
    try {
      const response = await referencesApi.resolveConflict({
        referenceId: selectedReference.id,
        projectId: currentProject.id,
        conflictIndex,
        resolution,
      });

      // Reload references to get updated conflict status
      await loadReferences();

      // Show success message
      console.log('Conflict resolved:', response.message);
    } catch (error) {
      console.error('Resolve conflict error:', error);
    } finally {
      setResolvingConflict(false);
    }
  };

  const handleDeleteReference = async () => {
    if (!selectedReference) return;

    setDeleting(true);
    try {
      await referencesApi.delete(selectedReference.id);

      // Clear selection
      setSelectedReference(null);

      // Reload references
      await loadReferences();

      // Hide confirmation dialog
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete reference error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleReanalyze = () => {
    if (!selectedReference) return;
    setShowModeSelector(true);
  };

  const handleAnalysisWithMode = async (mode: 'basic' | 'context' | 'template', templateId?: string) => {
    if (!selectedReference) return;

    setShowModeSelector(false);
    setReanalyzing(true);

    try {
      if (mode === 'basic') {
        await referencesApi.retriggerAnalysis(selectedReference.id);
      } else if (mode === 'context') {
        if (!currentProject) {
          alert('Project context is required for context-aware analysis');
          return;
        }
        await referencesApi.analyzeWithContext(selectedReference.id, currentProject.id);
      } else if (mode === 'template') {
        if (!templateId) {
          alert('Template ID is required for template-based analysis');
          return;
        }
        await referencesApi.analyzeWithTemplate(selectedReference.id, templateId);
      }

      // Refresh to show updated analysis
      await loadReferences();
    } catch (error) {
      console.error('Re-analyze error:', error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleToggleFavorite = async (referenceId: string, currentStatus: boolean) => {
    try {
      await referencesApi.toggleFavorite(referenceId, !currentStatus);
      await loadReferences();
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedReference || !tag.trim()) return;

    const currentTags = selectedReference.tags || [];
    if (currentTags.includes(tag.trim())) return; // Don't add duplicates

    const newTags = [...currentTags, tag.trim()];

    try {
      await referencesApi.updateTags(selectedReference.id, newTags);
      await loadReferences();
      setTagInput('');
    } catch (error) {
      console.error('Add tag error:', error);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedReference) return;

    const currentTags = selectedReference.tags || [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove);

    try {
      await referencesApi.updateTags(selectedReference.id, newTags);
      await loadReferences();
    } catch (error) {
      console.error('Remove tag error:', error);
    }
  };

  // Multi-select handlers
  const handleToggleSelect = (referenceId: string) => {
    setSelectedReferences(prev =>
      prev.includes(referenceId)
        ? prev.filter(id => id !== referenceId)
        : [...prev, referenceId]
    );
  };

  const handleSelectAll = (filtered: any[]) => {
    if (selectedReferences.length === filtered.length) {
      setSelectedReferences([]);
    } else {
      setSelectedReferences(filtered.map(ref => ref.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedReferences([]);
  };

  const handleBulkDelete = async () => {
    if (selectedReferences.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedReferences.length} references? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedReferences.map(refId => referencesApi.delete(refId))
      );
      await loadReferences();
      setSelectedReferences([]);
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const handleBulkReanalyze = async () => {
    if (selectedReferences.length === 0) return;

    try {
      // Re-analyze each selected reference
      await Promise.all(
        selectedReferences.map(refId => referencesApi.retriggerAnalysis(refId))
      );
      await loadReferences();
    } catch (error) {
      console.error('Bulk re-analyze error:', error);
    }
  };

  const handleBulkTag = async (tag: string) => {
    if (selectedReferences.length === 0 || !tag.trim()) return;

    try {
      await Promise.all(
        selectedReferences.map(async (refId) => {
          const ref = references.find(r => r.id === refId);
          if (ref) {
            const currentTags = ref.tags || [];
            if (!currentTags.includes(tag.trim())) {
              const newTags = [...currentTags, tag.trim()];
              await referencesApi.updateTags(refId, newTags);
            }
          }
        })
      );
      await loadReferences();
      setSelectedReferences([]);
    } catch (error) {
      console.error('Bulk tag error:', error);
    }
  };

  // Get all unique tags across all references for autocomplete
  const allTags = Array.from(new Set(references.flatMap(ref => ref.tags || [])));

  const filteredReferences = references
    .filter(ref => {
      const matchesSearch = ref.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || ref.metadata?.type === filterType;
      const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => ref.tags?.includes(tag));
      const matchesFavorites = !showFavoritesOnly || ref.is_favorite;
      const matchesAnalysisStatus = filterAnalysisStatus === 'all' || ref.analysis_status === filterAnalysisStatus;
      return matchesSearch && matchesFilter && matchesTags && matchesFavorites && matchesAnalysisStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return a.filename.localeCompare(b.filename);
        case 'name-desc':
          return b.filename.localeCompare(a.filename);
        case 'size-desc':
          return (b.metadata?.fileSize || 0) - (a.metadata?.fileSize || 0);
        case 'size-asc':
          return (a.metadata?.fileSize || 0) - (b.metadata?.fileSize || 0);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Research Hub
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Gather and analyze references for your project
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-2 shadow-glass inline-flex gap-2`}>
          <button
            onClick={() => setActiveTab('unified-research')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'unified-research'
                ? 'bg-green-metallic text-white shadow-lg'
                : isDarkMode
                ? 'text-gray-400 hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={20} />
            <span>Unified Research</span>
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'references'
                ? 'bg-green-metallic text-white shadow-lg'
                : isDarkMode
                ? 'text-gray-400 hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload size={20} />
            <span>References</span>
          </button>
          <button
            onClick={() => setActiveTab('live-research')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'live-research'
                ? 'bg-green-metallic text-white shadow-lg'
                : isDarkMode
                ? 'text-gray-400 hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe size={20} />
            <span>Live Web Research</span>
          </button>
          <button
            onClick={() => setActiveTab('document-research')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'document-research'
                ? 'bg-green-metallic text-white shadow-lg'
                : isDarkMode
                ? 'text-gray-400 hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={20} />
            <span>Document Research</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'unified-research' ? (
        <UnifiedResearchInterface />
      ) : activeTab === 'live-research' ? (
        <LiveResearchPage />
      ) : activeTab === 'document-research' ? (
        <div className="h-[calc(100vh-250px)]">
          <DocumentResearchChat />
        </div>
      ) : (
        <>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Reference Library */}
        <div className="lg:col-span-3">
          <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass`}>
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 mb-4 transition-all cursor-pointer ${
                dragActive
                  ? 'border-green-metallic bg-green-metallic/10'
                  : isDarkMode
                  ? 'border-gray-600 hover:border-green-metallic/50'
                  : 'border-gray-300 hover:border-green-metallic/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
              />
              <div className="flex flex-col items-center text-center">
                <Upload className={`mb-2 ${dragActive ? 'text-green-metallic' : 'text-gray-400'}`} size={24} />
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {uploading ? 'Uploading...' : 'Drop files or click to upload'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Images, PDFs, Videos, URLs
                </p>
              </div>
            </div>

            {/* Upload Queue Progress */}
            {uploadQueue.length > 0 && (
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-3 mb-4 space-y-2`}>
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Uploading {uploadQueue.filter(q => q.status === 'uploading').length > 0 ?
                    `${uploadQueue.filter(q => q.status === 'success').length}/${uploadQueue.length}` :
                    'Complete'}
                </div>
                {uploadQueue.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isDarkMode ? 'bg-white/5' : 'bg-white'
                    }`}
                  >
                    {item.status === 'uploading' && (
                      <Loader2 size={14} className="text-blue-500 animate-spin" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle size={14} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                    {item.status === 'pending' && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{item.file.name}</p>
                      {item.error && (
                        <p className="text-xs text-red-500 truncate">{item.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search & Filter */}
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search references..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-white/5 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-white/5 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="pdf">PDFs</option>
                <option value="video">Videos</option>
                <option value="url">URLs</option>
              </select>

              {/* Analysis Status Filter */}
              <select
                value={filterAnalysisStatus}
                onChange={(e) => setFilterAnalysisStatus(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-white/5 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              {/* Sort Options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-white/5 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>

              {/* Favorites Filter */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFavoritesOnly
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                    : isDarkMode
                    ? 'bg-white/5 border-gray-600 text-gray-400 hover:bg-white/10'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Star size={16} className={showFavoritesOnly ? 'fill-yellow-500' : ''} />
                <span className="text-sm">
                  {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites'}
                </span>
              </button>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Filter by tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-green-metallic text-white'
                            : isDarkMode
                            ? 'bg-white/10 text-gray-400 hover:bg-white/20'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-red-500 hover:text-red-600 mt-2"
                    >
                      Clear tag filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-green-metallic text-white'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Grid size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-green-metallic text-white'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <List size={16} className="mx-auto" />
              </button>
            </div>

            {/* Selection Controls */}
            {filteredReferences.length > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => handleSelectAll(filteredReferences)}
                  className={`flex items-center gap-2 text-sm ${
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                  } transition-colors`}
                >
                  {selectedReferences.length === filteredReferences.length && selectedReferences.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>
                    {selectedReferences.length === filteredReferences.length && selectedReferences.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
                {selectedReferences.length > 0 && (
                  <span className="text-sm text-green-metallic font-medium">
                    {selectedReferences.length} selected
                  </span>
                )}
              </div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedReferences.length > 0 && (
              <div className={`${isDarkMode ? 'bg-white/10' : 'bg-gray-100'} rounded-xl p-3 mb-3 space-y-2`}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors text-sm"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedReferences.length})
                  </button>
                  <button
                    onClick={handleBulkReanalyze}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 transition-colors text-sm"
                  >
                    <RefreshCw size={14} />
                    Re-analyze ({selectedReferences.length})
                  </button>
                  <button
                    onClick={() => setShowBulkTagInput(!showBulkTagInput)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors text-sm"
                  >
                    <Tag size={14} />
                    Add Tag
                  </button>
                  {selectedReferences.length >= 2 && selectedReferences.length <= 3 && (
                    <button
                      onClick={() => setShowComparison(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-500 transition-colors text-sm"
                    >
                      <ArrowLeftRight size={14} />
                      Compare ({selectedReferences.length})
                    </button>
                  )}
                </div>
                {showBulkTagInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bulkTagInput}
                      onChange={(e) => setBulkTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBulkTag(bulkTagInput);
                          setBulkTagInput('');
                          setShowBulkTagInput(false);
                        }
                      }}
                      placeholder="Enter tag name..."
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
                        isDarkMode
                          ? 'bg-white/5 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        handleBulkTag(bulkTagInput);
                        setBulkTagInput('');
                        setShowBulkTagInput(false);
                      }}
                      disabled={!bulkTagInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-green-metallic text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-metallic/90 transition-colors text-sm"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reference List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
              {loading ? (
                <div className="col-span-2 text-center py-8 text-gray-500">Loading...</div>
              ) : filteredReferences.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No references uploaded yet
                </div>
              ) : (
                filteredReferences.map((ref) => (
                  <div key={ref.id} className="relative group">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(ref.id);
                        }}
                        className={`mt-3 flex-shrink-0 ${
                          isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                        } transition-colors`}
                      >
                        {selectedReferences.includes(ref.id) ? (
                          <CheckSquare size={16} className="text-green-metallic" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedReference(ref)}
                        className={`flex-1 p-3 pr-10 rounded-xl transition-all text-left ${
                          selectedReference?.id === ref.id
                            ? 'bg-green-metallic text-white'
                            : isDarkMode
                            ? 'hover:bg-white/10 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getFileIcon(ref.metadata?.type)}
                        {ref.analysis_status === 'completed' && (
                          <CheckCircle size={14} className="text-green-500" />
                        )}
                        {ref.analysis_status === 'processing' && (
                          <div className="w-3 h-3 border-2 border-t-transparent border-green-metallic rounded-full animate-spin" />
                        )}
                        {ref.analysis_status === 'failed' && (
                          <AlertCircle size={14} className="text-red-500" />
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">{ref.filename}</div>
                      {ref.tags && ref.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {ref.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                selectedReference?.id === ref.id
                                  ? 'bg-white/20 text-white'
                                  : isDarkMode
                                  ? 'bg-white/10 text-gray-400'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                          {ref.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{ref.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                      {viewMode === 'list' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(ref.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(ref.id, ref.is_favorite || false);
                      }}
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label={ref.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        size={14}
                        className={ref.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}
                      />
                    </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center - Analysis Viewer */}
        <div className="lg:col-span-6">
          <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass min-h-[600px]`}>
            {selectedReference ? (
              <>
                {/* Reference Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedReference.filename}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {getFileIcon(selectedReference.metadata?.type)}
                      <span>{selectedReference.metadata?.type || 'Unknown type'}</span>
                      <span>•</span>
                      <span>{new Date(selectedReference.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleFavorite(selectedReference.id, selectedReference.is_favorite || false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                      title={selectedReference.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        size={20}
                        className={selectedReference.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}
                      />
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                      title="Copy analysis"
                    >
                      {copied ? <CheckCircle size={20} className="text-green-metallic" /> : <Copy size={20} />}
                    </button>
                    <button
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing || selectedReference.analysis_status === 'processing'}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Re-analyze document"
                    >
                      <RefreshCw
                        size={20}
                        className={reanalyzing ? 'animate-spin' : ''}
                      />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={`p-2 rounded-lg transition-colors hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-400 hover:text-red-500' : 'text-gray-600 hover:text-red-500'
                      }`}
                      title="Delete reference"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={16} className="text-gray-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedReference.tags && selectedReference.tags.length > 0 ? (
                      selectedReference.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            isDarkMode
                              ? 'bg-white/10 text-gray-300'
                              : 'bg-gray-200 text-gray-700'
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
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder="Add a tag (e.g., competitor, requirement, design)"
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                        isDarkMode
                          ? 'bg-white/5 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                      }`}
                    />
                    <button
                      onClick={() => handleAddTag(tagInput)}
                      disabled={!tagInput.trim()}
                      className="px-4 py-2 rounded-lg bg-green-metallic text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-metallic/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {allTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500">Suggested:</span>
                      {allTags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleAddTag(tag)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            isDarkMode
                              ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Analysis Content */}
                {selectedReference.analysis_status === 'completed' ? (
                  <div className="space-y-6">
                    {/* Conflict Report */}
                    {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.conflicts?.length > 0 && (
                      <div className="border-l-4 border-red-500 bg-red-500/10 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
                          <div className="flex-1">
                            <h3 className="font-bold text-red-500 mb-2">Conflicts Detected</h3>
                            {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.conflicts?.map(
                              (conflict: any, idx: number) => (
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
                                    <button
                                      onClick={() => handleResolveConflict(idx, 'clarify')}
                                      disabled={resolvingConflict}
                                      className="text-xs px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 transition-colors disabled:opacity-50"
                                    >
                                      Clarify intent
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Confirmations */}
                    {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.confirmations?.length > 0 && (
                      <div className="border-l-4 border-green-500 bg-green-500/10 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                          <div className="flex-1">
                            <h3 className="font-bold text-green-500 mb-2">Confirmations</h3>
                            {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.confirmations?.map(
                              (confirmation: any, idx: number) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    ✓ {confirmation.decidedItem}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* New Insights */}
                    {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.newInsights?.length > 0 && (
                      <div className="border-l-4 border-blue-500 bg-blue-500/10 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Info className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                          <div className="flex-1">
                            <h3 className="font-bold text-blue-500 mb-2">New Insights</h3>
                            {selectedReference.metadata?.contextualAnalysis?.projectAlignment?.newInsights?.map(
                              (insight: any, idx: number) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    • {insight.insight}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analysis Markdown */}
                    {selectedReference.metadata?.analysis && (
                      <div
                        className={`prose prose-sm max-w-none ${
                          isDarkMode ? 'prose-invert' : ''
                        }`}
                      >
                        <ReactMarkdown>{selectedReference.metadata.analysis}</ReactMarkdown>
                      </div>
                    )}

                    {/* Context Analysis Results (Mode 2) */}
                    {selectedReference.metadata?.contextAnalysis && (
                      <div className="mt-6">
                        <ContextAnalysisResults
                          contextAnalysis={selectedReference.metadata.contextAnalysis}
                        />
                      </div>
                    )}

                    {/* Template Analysis Results (Mode 3) */}
                    {selectedReference.metadata?.templateAnalysis && (
                      <div className="mt-6">
                        <TemplateAnalysisResults
                          templateAnalysis={selectedReference.metadata.templateAnalysis}
                        />
                      </div>
                    )}
                  </div>
                ) : selectedReference.analysis_status === 'processing' ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-t-transparent border-green-metallic rounded-full animate-spin mb-4" />
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Analyzing reference...</p>
                  </div>
                ) : selectedReference.analysis_status === 'failed' ? (
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText size={64} className="mb-4 opacity-30" />
                <p>Select a reference to view analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Quick Actions */}
        <div className="lg:col-span-3">
          <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass`}>
            <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Quick Actions</h3>

            <div className="space-y-3">
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-metallic text-white hover:bg-green-metallic/90 transition-colors"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload size={20} />
                <span>Upload Reference</span>
              </button>

              <button
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                disabled={!selectedReference}
              >
                <Tag size={20} />
                <span>Add Tags</span>
              </button>

              <button
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                disabled={filteredReferences.length < 2}
              >
                <ChevronRight size={20} />
                <span>Compare References</span>
              </button>

              <button
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                disabled={!selectedReference}
              >
                <Download size={20} />
                <span>Export Analysis</span>
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Statistics
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total References</span>
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {references.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Analyzed</span>
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {references.filter(r => r.analysis_status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Processing</span>
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {references.filter(r => r.analysis_status === 'processing').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedReference && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 max-w-md w-full shadow-glass`}>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-full bg-red-500/20">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Delete Reference
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete "{selectedReference.filename}"? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReference}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {showComparison && (
        <ComparisonView
          references={references.filter(ref => selectedReferences.includes(ref.id))}
          onClose={() => setShowComparison(false)}
          projectId={currentProject?.id}
        />
      )}

      {/* Analysis Mode Selector Modal */}
      {showModeSelector && selectedReference && (
        <AnalysisModeSelector
          onClose={() => setShowModeSelector(false)}
          onSelectMode={handleAnalysisWithMode}
          projectId={currentProject?.id}
        />
      )}
      </>
      )}
    </div>
  );
};

export default ResearchHubPage;
