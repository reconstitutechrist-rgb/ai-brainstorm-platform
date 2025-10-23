import React, { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import {
  CheckCircle,
  X,
  RefreshCw,
  Edit3,
  Save,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { DocumentPreview } from '../../UnifiedResearchHub';

interface DocumentPreviewViewProps {
  preview: DocumentPreview;
  onAccept: (document: DocumentPreview) => void;
  onReject: () => void;
  onRegenerate: () => void;
}

const DocumentPreviewView: React.FC<DocumentPreviewViewProps> = ({
  preview,
  onAccept,
  onReject,
  onRegenerate,
}) => {
  const { isDarkMode } = useThemeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(preview.content);
  const [editedTitle, setEditedTitle] = useState(preview.title);

  const handleAccept = () => {
    const finalPreview: DocumentPreview = {
      ...preview,
      title: editedTitle,
      content: editedContent,
    };
    onAccept(finalPreview);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(preview.content);
    setEditedTitle(preview.title);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className={`text-2xl font-bold mb-2 w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-white/5 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
              />
            ) : (
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {editedTitle}
              </h2>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText size={16} />
              <span>{preview.format === 'markdown' ? 'Markdown' : preview.format}</span>
              {preview.metadata?.templateName && (
                <>
                  <span>•</span>
                  <span>Template: {preview.metadata.templateName}</span>
                </>
              )}
              {preview.metadata?.generatedAt && (
                <>
                  <span>•</span>
                  <Clock size={14} />
                  <span>{new Date(preview.metadata.generatedAt).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI Notes */}
        {preview.metadata?.aiNotes && (
          <div className={`p-3 rounded-lg mb-4 ${
            isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-2">
              <Sparkles className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium text-blue-500 mb-1">AI Generation Notes</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {preview.metadata.aiNotes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-metallic text-white hover:bg-green-metallic/90 transition-colors"
              >
                <Save size={18} />
                <span>Save Edits</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <X size={18} />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAccept}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-metallic text-white hover:bg-green-metallic/90 transition-colors"
              >
                <CheckCircle size={18} />
                <span>Accept & Save to Project</span>
              </button>
              <button
                onClick={handleEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-700 hover:bg-white/10 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Edit3 size={18} />
                <span>Edit</span>
              </button>
              <button
                onClick={onRegenerate}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-yellow-700 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                    : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                }`}
              >
                <RefreshCw size={18} />
                <span>Regenerate</span>
              </button>
              <button
                onClick={onReject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-red-700 bg-red-500/10 hover:bg-red-500/20 text-red-400'
                    : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-700'
                }`}
              >
                <X size={18} />
                <span>Reject</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className={`w-full h-full min-h-[600px] p-4 rounded-lg border font-mono text-sm resize-none ${
              isDarkMode
                ? 'bg-white/5 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
          />
        ) : (
          <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
            {preview.format === 'markdown' ? (
              <ReactMarkdown>{editedContent}</ReactMarkdown>
            ) : preview.format === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: editedContent }} />
            ) : (
              <pre className="whitespace-pre-wrap">{editedContent}</pre>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={`p-4 border-t border-gray-700 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500">
            <span>{editedContent.length.toLocaleString()} characters</span>
            <span>{editedContent.split('\n').length} lines</span>
            <span>{editedContent.split(/\s+/).length} words</span>
          </div>
          {isEditing && (
            <span className="text-yellow-500 flex items-center gap-1">
              <Edit3 size={14} />
              Editing mode
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewView;
