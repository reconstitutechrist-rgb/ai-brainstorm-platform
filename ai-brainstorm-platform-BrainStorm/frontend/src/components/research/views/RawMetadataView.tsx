import React from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { Code } from 'lucide-react';
import type { Reference } from '../../../types';

interface RawMetadataViewProps {
  reference: Reference;
}

const RawMetadataView: React.FC<RawMetadataViewProps> = ({ reference }) => {
  const { isDarkMode } = useThemeStore();

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Code size={20} className="text-purple-500" />
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Raw Metadata & Debug Info
        </h2>
      </div>

      {/* Metadata Sections */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Basic Information
          </h3>
          <pre className={`p-4 rounded-lg font-mono text-xs overflow-x-auto ${
            isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-800'
          }`}>
            {formatJSON({
              id: reference.id,
              filename: reference.filename,
              url: reference.url,
              analysis_status: reference.analysis_status,
              is_favorite: reference.is_favorite,
              created_at: reference.created_at,
              updated_at: reference.updated_at,
            })}
          </pre>
        </div>

        {/* Tags */}
        {reference.tags && reference.tags.length > 0 && (
          <div>
            <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Tags
            </h3>
            <pre className={`p-4 rounded-lg font-mono text-xs overflow-x-auto ${
              isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-800'
            }`}>
              {formatJSON(reference.tags)}
            </pre>
          </div>
        )}

        {/* Metadata */}
        {reference.metadata && (
          <div>
            <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Metadata
            </h3>
            <pre className={`p-4 rounded-lg font-mono text-xs overflow-x-auto ${
              isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-800'
            }`}>
              {formatJSON(reference.metadata)}
            </pre>
          </div>
        )}

        {/* Full Object */}
        <div>
          <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Complete Reference Object
          </h3>
          <pre className={`p-4 rounded-lg font-mono text-xs overflow-x-auto ${
            isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-800'
          }`}>
            {formatJSON(reference)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default RawMetadataView;
