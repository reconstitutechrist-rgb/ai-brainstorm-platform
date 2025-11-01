import React from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { FileText, Image as ImageIcon, Video, File } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Reference } from '../../../types';

interface DocumentRendererViewProps {
  reference: Reference;
}

const DocumentRendererView: React.FC<DocumentRendererViewProps> = ({ reference }) => {
  const { isDarkMode } = useThemeStore();

  const renderDocument = () => {
    const type = reference.metadata?.type || '';

    // PDF Viewer
    if (type.includes('pdf')) {
      return (
        <div className="w-full h-full">
          <iframe
            src={reference.file_url}
            className="w-full h-full rounded-lg"
            title={reference.filename}
          />
        </div>
      );
    }

    // Image Viewer
    if (type.includes('image')) {
      return (
        <div className="flex items-center justify-center p-8">
          <img
            src={reference.file_url}
            alt={reference.filename}
            className="max-w-full max-h-[calc(100vh-300px)] rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // Video Player
    if (type.includes('video')) {
      return (
        <div className="flex items-center justify-center p-8">
          <video
            src={reference.file_url}
            controls
            className="max-w-full max-h-[calc(100vh-300px)] rounded-lg shadow-lg"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Markdown Viewer
    if (reference.metadata?.content && type.includes('markdown')) {
      return (
        <div className={`p-6 prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
          <ReactMarkdown>{reference.metadata.content}</ReactMarkdown>
        </div>
      );
    }

    // Text Viewer
    if (reference.metadata?.content) {
      return (
        <div className="p-6">
          <pre className={`whitespace-pre-wrap font-mono text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            {reference.metadata.content}
          </pre>
        </div>
      );
    }

    // Fallback - File not viewable
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <File size={64} className="text-gray-400 mb-4" />
        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Document Viewer
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          This file type cannot be previewed in the browser
        </p>
        {reference.file_url && (
          <a
            href={reference.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 px-4 py-2 rounded-lg bg-cyan-primary text-white hover:bg-cyan-primary/90 transition-colors"
          >
            Download File
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          {reference.metadata?.type?.includes('pdf') ? (
            <FileText size={20} />
          ) : reference.metadata?.type?.includes('image') ? (
            <ImageIcon size={20} />
          ) : reference.metadata?.type?.includes('video') ? (
            <Video size={20} />
          ) : (
            <File size={20} />
          )}
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {reference.filename}
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          {reference.metadata?.type || 'Unknown type'}
          {reference.metadata?.fileSize && ` • ${(reference.metadata.fileSize / 1024).toFixed(1)} KB`}
        </p>
      </div>

      {/* Document Content */}
      {renderDocument()}
    </div>
  );
};

export default DocumentRendererView;
