import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useProjectStore } from '../../store/projectStore';
import { referencesApi } from '../../services/api';
import {
  Search,
  FileText,
  Image,
  Video,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
} from 'lucide-react';
import type { Reference } from '../../types';

interface ReferenceLibraryDrawerProps {
  onReferenceSelected: (reference: Reference) => void;
}

const ReferenceLibraryDrawer: React.FC<ReferenceLibraryDrawerProps> = ({ onReferenceSelected }) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    } catch (error) {
      console.error('Load references error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <File size={16} />;
    if (type.includes('image')) return <Image size={16} />;
    if (type.includes('video')) return <Video size={16} />;
    if (type.includes('pdf')) return <FileText size={16} />;
    return <File size={16} />;
  };

  const filteredReferences = references.filter((ref) =>
    ref.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`border-b border-gray-700 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} max-h-80 overflow-hidden flex flex-col`}>
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
              isDarkMode
                ? 'bg-white/5 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Reference List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : filteredReferences.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? 'No references found' : 'No references uploaded yet'}
          </div>
        ) : (
          filteredReferences.map((ref) => (
            <button
              key={ref.id}
              onClick={() => onReferenceSelected(ref)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                isDarkMode
                  ? 'hover:bg-white/10 text-gray-300'
                  : 'hover:bg-white text-gray-700'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(ref.metadata?.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{ref.filename}</p>
                  {ref.is_favorite && (
                    <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                </div>
                {ref.tags && ref.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {ref.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isDarkMode
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
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {ref.analysis_status === 'completed' && (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                {ref.analysis_status === 'processing' && (
                  <Loader2 size={16} className="animate-spin text-yellow-500" />
                )}
                {ref.analysis_status === 'failed' && (
                  <AlertCircle size={16} className="text-red-500" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Stats */}
      {!loading && references.length > 0 && (
        <div className={`p-3 border-t border-gray-700 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{references.length} total references</span>
            <span>{references.filter((r) => r.analysis_status === 'completed').length} analyzed</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceLibraryDrawer;
