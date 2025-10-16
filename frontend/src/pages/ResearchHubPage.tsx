import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { referencesApi } from '../services/api';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Reference {
  id: string;
  project_id: string;
  filename?: string;
  url: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    type?: string;
    analysis?: string;
    description?: string;
    mimeType?: string;
    fileSize?: number;
    contextualAnalysis?: any;
  };
  created_at: string;
  updated_at: string;
}

const ResearchHubPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
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

  useEffect(() => {
    if (currentProject) {
      loadReferences();
    }
  }, [currentProject]);

  const loadReferences = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const response = await referencesApi.getByProject(currentProject.id);
      setReferences(response.references);

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
    if (!currentProject || !user?.id) return;

    setUploading(true);
    try {
      // Upload files sequentially
      for (const file of files) {
        const response = await referencesApi.upload(
          currentProject.id,
          user.id,
          file
        );

        // If project has existing decisions, trigger validation workflow
        if (currentProject.items && currentProject.items.length > 0) {
          await referencesApi.validateReference(
            response.reference.id,
            currentProject.id
          );
        }
      }

      // Reload references to show newly uploaded files
      await loadReferences();
    } catch (error) {
      console.error('Upload error:', error);
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

  const filteredReferences = references.filter(ref => {
    const matchesSearch = ref.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const matchesFilter = filterType === 'all' || ref.metadata?.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Research Hub
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Gather and analyze references for your project
        </p>
      </div>

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
                  <button
                    key={ref.id}
                    onClick={() => setSelectedReference(ref)}
                    className={`p-3 rounded-xl transition-all text-left ${
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
                    {viewMode === 'list' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </button>
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
                  </div>
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
                            {selectedReference.metadata?.contextualAnalysis.projectAlignment.conflicts.map(
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
                            {selectedReference.metadata?.contextualAnalysis.projectAlignment.confirmations.map(
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
                            {selectedReference.metadata?.contextualAnalysis.projectAlignment.newInsights.map(
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
    </div>
  );
};

export default ResearchHubPage;
