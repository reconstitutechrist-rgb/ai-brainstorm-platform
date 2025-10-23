import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import ResearchResultsView from './views/ResearchResultsView';
import DocumentPreviewView from './views/DocumentPreviewView';
import AnalysisView from './views/AnalysisView';
import DocumentRendererView from './views/DocumentRendererView';
import RawMetadataView from './views/RawMetadataView';
import {
  Sparkles,
  FileText,
  BarChart3,
  Eye,
  Code,
} from 'lucide-react';
import type { WorkAreaView, ResearchResults, DocumentPreview } from '../UnifiedResearchHub';
import type { Reference } from '../../types';

interface WorkAreaPanelProps {
  activeView: WorkAreaView;
  onViewChange: (view: WorkAreaView) => void;
  researchResults: ResearchResults | null;
  documentPreview: DocumentPreview | null;
  selectedReference: Reference | null;
  onAcceptDocument: (document: DocumentPreview) => void;
  onRejectDocument: () => void;
  onRegenerateDocument: () => void;
  onReferenceUpdate: (reference: Reference) => void;
}

const WorkAreaPanel: React.FC<WorkAreaPanelProps> = ({
  activeView,
  onViewChange,
  researchResults,
  documentPreview,
  selectedReference,
  onAcceptDocument,
  onRejectDocument,
  onRegenerateDocument,
  onReferenceUpdate,
}) => {
  const { isDarkMode } = useThemeStore();

  // Determine available view modes based on active content
  const availableViews: Array<{ value: WorkAreaView; label: string; icon: React.ReactNode }> = [
    { value: 'research' as WorkAreaView, label: 'Research', icon: <Sparkles size={16} /> },
    { value: 'preview' as WorkAreaView, label: 'Preview', icon: <FileText size={16} /> },
    { value: 'analysis' as WorkAreaView, label: 'Analysis', icon: <BarChart3 size={16} /> },
    { value: 'document' as WorkAreaView, label: 'Document', icon: <Eye size={16} /> },
    { value: 'raw' as WorkAreaView, label: 'Raw', icon: <Code size={16} /> },
  ];

  // Filter views based on what content is available
  const visibleViews = availableViews.filter((view) => {
    if (view.value === 'research') return researchResults !== null;
    if (view.value === 'preview') return documentPreview !== null;
    if (view.value === 'analysis') return selectedReference !== null;
    if (view.value === 'document') return selectedReference !== null;
    if (view.value === 'raw') return selectedReference !== null;
    return false;
  });

  // If activeView is not available, show empty state
  const shouldShowEmpty = activeView === 'empty' || visibleViews.length === 0;

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass flex flex-col h-full overflow-hidden`}>
      {/* View Mode Selector Tabs */}
      {visibleViews.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2 flex-wrap">
            {visibleViews.map((view) => (
              <button
                key={view.value}
                onClick={() => onViewChange(view.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeView === view.value
                    ? 'bg-green-metallic text-white shadow-lg'
                    : isDarkMode
                    ? 'text-gray-400 hover:bg-white/10'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {view.icon}
                <span className="text-sm">{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Content */}
      <div className="flex-1 overflow-y-auto">
        {shouldShowEmpty ? (
          <EmptyState />
        ) : activeView === 'research' && researchResults ? (
          <ResearchResultsView results={researchResults} />
        ) : activeView === 'preview' && documentPreview ? (
          <DocumentPreviewView
            preview={documentPreview}
            onAccept={onAcceptDocument}
            onReject={onRejectDocument}
            onRegenerate={onRegenerateDocument}
          />
        ) : activeView === 'analysis' && selectedReference ? (
          <AnalysisView
            reference={selectedReference}
            onReferenceUpdate={onReferenceUpdate}
          />
        ) : activeView === 'document' && selectedReference ? (
          <DocumentRendererView reference={selectedReference} />
        ) : activeView === 'raw' && selectedReference ? (
          <RawMetadataView reference={selectedReference} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC = () => {
  const { isDarkMode } = useThemeStore();

  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
        isDarkMode ? 'bg-white/5' : 'bg-gray-100'
      }`}>
        <Sparkles size={48} className="text-gray-400" />
      </div>
      <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        Work Area
      </h3>
      <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Your research results, document previews, and analysis will appear here
      </p>
      <div className={`text-sm space-y-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        <p>💬 Ask me to research something</p>
        <p>📤 Upload a document to analyze</p>
        <p>📁 Select a reference from the library</p>
      </div>
    </div>
  );
};

export default WorkAreaPanel;
