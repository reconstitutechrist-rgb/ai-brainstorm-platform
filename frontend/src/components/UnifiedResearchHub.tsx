import React, { useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { generatedDocumentsApi } from '../services/api';
import ResearchChatPanel from './research/ResearchChatPanel';
import WorkAreaPanel from './research/WorkAreaPanel';
import type { Reference } from '../types';

// Work area view modes
export type WorkAreaView = 'empty' | 'research' | 'preview' | 'analysis' | 'document' | 'raw';

// Research results structure
export interface ResearchResults {
  query: string;
  synthesis?: string;
  webSources?: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
    analysis?: string;
    source: 'web';
  }>;
  documentSources?: Array<{
    id: string;
    filename: string;
    type: 'reference' | 'generated_document' | 'uploaded_file';
    relevanceScore: number;
  }>;
  suggestedDocuments?: Array<{
    templateId: string;
    templateName: string;
    category: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  identifiedGaps?: Array<{
    area: string;
    description: string;
    suggestedAction: string;
  }>;
  searchStrategy?: string;
  duration?: number;
}

// Document preview structure
export interface DocumentPreview {
  id?: string;
  title: string;
  content: string;
  format: 'markdown' | 'text' | 'html';
  metadata?: {
    templateId?: string;
    templateName?: string;
    generatedAt?: string;
    aiNotes?: string;
  };
}

const UnifiedResearchHub: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();

  // Work area state
  const [activeView, setActiveView] = useState<WorkAreaView>('empty');
  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);

  // Chat state
  const [isProcessing, setIsProcessing] = useState(false);
  const [regenerateContext, setRegenerateContext] = useState<DocumentPreview | null>(null);

  // Handle research completion from chat
  const handleResearchComplete = (results: ResearchResults) => {
    setResearchResults(results);
    setActiveView('research');
  };

  // Handle document generation from chat
  const handleDocumentGenerated = (preview: DocumentPreview) => {
    setDocumentPreview(preview);
    setActiveView('preview');
  };

  // Handle file upload/analysis from chat
  const handleFileAnalyzed = (reference: Reference) => {
    setSelectedReference(reference);
    setActiveView('analysis');
  };

  // Handle reference selection from library
  const handleReferenceSelected = (reference: Reference) => {
    setSelectedReference(reference);
    setActiveView('analysis');
  };

  // Handle view mode change from work area
  const handleViewChange = (view: WorkAreaView) => {
    setActiveView(view);
  };

  // Handle document preview actions
  const handleAcceptDocument = async (document: DocumentPreview) => {
    try {
      if (!currentProject) {
        console.error('No project selected');
        return;
      }

      console.log('Saving document to project:', document.title);

      const result = await generatedDocumentsApi.savePreview({
        projectId: currentProject.id,
        title: document.title,
        content: document.content,
        format: document.format,
        metadata: document.metadata,
      });

      console.log('Document saved successfully:', result.document);

      // Reset preview after successful save
      setDocumentPreview(null);
      setActiveView('empty');
    } catch (error) {
      console.error('Save document error:', error);
      // Keep preview open so user can try again
    }
  };

  const handleRejectDocument = () => {
    setDocumentPreview(null);
    setActiveView('empty');
  };

  const handleRegenerateDocument = () => {
    if (documentPreview) {
      // Set regeneration context to trigger chat message
      setRegenerateContext(documentPreview);
    }
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-12 text-center shadow-glass`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a project to start researching
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Left Panel - Chat (40%) */}
      <div className="w-2/5 flex flex-col">
        <ResearchChatPanel
          onResearchComplete={handleResearchComplete}
          onDocumentGenerated={handleDocumentGenerated}
          onFileAnalyzed={handleFileAnalyzed}
          onReferenceSelected={handleReferenceSelected}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          regenerateContext={regenerateContext}
          onRegenerateContextCleared={() => setRegenerateContext(null)}
        />
      </div>

      {/* Right Panel - Work Area (60%) */}
      <div className="w-3/5 flex flex-col">
        <WorkAreaPanel
          activeView={activeView}
          onViewChange={handleViewChange}
          researchResults={researchResults}
          documentPreview={documentPreview}
          selectedReference={selectedReference}
          onAcceptDocument={handleAcceptDocument}
          onRejectDocument={handleRejectDocument}
          onRegenerateDocument={handleRegenerateDocument}
          onReferenceUpdate={(ref) => setSelectedReference(ref)}
        />
      </div>
    </div>
  );
};

export default UnifiedResearchHub;
