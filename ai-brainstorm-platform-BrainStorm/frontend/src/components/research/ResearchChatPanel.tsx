import React, { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useProjectStore } from '../../store/projectStore';
import { useUserStore } from '../../store/userStore';
import { unifiedResearchApi, referencesApi } from '../../services/api';
import ReferenceLibraryDrawer from './ReferenceLibraryDrawer';
import {
  Send,
  Loader2,
  Paperclip,
  Upload,
  Globe,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Reference } from '../../types';
import type { ResearchResults, DocumentPreview } from '../UnifiedResearchHub';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ResearchChatPanelProps {
  onResearchComplete: (results: ResearchResults) => void;
  onDocumentGenerated: (preview: DocumentPreview) => void;
  onFileAnalyzed: (reference: Reference) => void;
  onReferenceSelected: (reference: Reference) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  regenerateContext: DocumentPreview | null;
  onRegenerateContextCleared: () => void;
}

const ResearchChatPanel: React.FC<ResearchChatPanelProps> = ({
  onResearchComplete,
  onDocumentGenerated,
  onFileAnalyzed,
  onReferenceSelected,
  isProcessing,
  setIsProcessing,
  regenerateContext,
  onRegenerateContextCleared,
}) => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Welcome to Unified Research! Ask me anything - I can search the web, analyze your documents, identify gaps, and generate new documents for you.',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showReferenceLibrary, setShowReferenceLibrary] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle document regeneration requests
  useEffect(() => {
    const handleRegeneration = async () => {
      if (!regenerateContext || !currentProject || !user || isProcessing) return;

      // Construct regeneration message
      const regenerationPrompt = `Regenerate the document titled "${regenerateContext.title}". Please improve or refine the content based on the template and requirements. Current format: ${regenerateContext.format}`;

      addMessage('user', regenerationPrompt);
      setIsProcessing(true);

      try {
        addMessage('assistant', '🔄 Regenerating document...');

        // Call unified research API with document_discovery intent
        const data = await unifiedResearchApi.submitQuery({
          query: regenerationPrompt,
          projectId: currentProject.id,
          userId: user.id,
          sources: 'auto',
          intent: 'document_discovery',
          maxWebSources: 5,
          maxDocumentSources: 10,
          saveResults: true,
        });

        if (data.success) {
          setMessages((prev) => prev.slice(0, -1));
          addMessage('assistant', '✓ Document regenerated! View the new version in the preview →');

          // Trigger document preview with regenerated content
          if (data.query?.metadata?.suggestedDocuments && data.query.metadata.suggestedDocuments.length > 0) {
            const firstDoc = data.query.metadata.suggestedDocuments[0];
            onDocumentGenerated({
              title: regenerateContext.title,
              content: firstDoc.content || 'Regenerated content',
              format: regenerateContext.format,
              metadata: {
                ...regenerateContext.metadata,
                regeneratedAt: new Date().toISOString(),
                previousVersion: regenerateContext.content,
              },
            });
          }
        } else {
          setMessages((prev) => prev.slice(0, -1));
          addMessage('assistant', '❌ Regeneration failed. Please try again.');
        }
      } catch (error) {
        console.error('Regeneration error:', error);
        setMessages((prev) => prev.slice(0, -1));
        addMessage('assistant', '❌ Regeneration error. Please try again.');
      } finally {
        setIsProcessing(false);
        onRegenerateContextCleared();
      }
    };

    handleRegeneration();
  }, [regenerateContext]);

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentProject || !user || isProcessing) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsProcessing(true);

    try {
      // Determine intent from message (simple heuristics for now)
      let intent: 'research' | 'document_discovery' | 'gap_analysis' = 'research';
      const lowerMessage = userMessage.toLowerCase();

      if (lowerMessage.includes('generate') || lowerMessage.includes('create document') || lowerMessage.includes('write')) {
        intent = 'document_discovery';
      } else if (lowerMessage.includes('gap') || lowerMessage.includes('missing') || lowerMessage.includes('what do i need')) {
        intent = 'gap_analysis';
      }

      // Show processing message
      addMessage('assistant', '🔍 Researching...');

      // Call unified research API
      const data = await unifiedResearchApi.submitQuery({
        query: userMessage,
        projectId: currentProject.id,
        userId: user.id,
        sources: 'auto',
        intent,
        maxWebSources: 5,
        maxDocumentSources: 10,
        saveResults: true,
      });

      if (data.success) {
        // Remove processing message
        setMessages((prev) => prev.slice(0, -1));

        // Check if this is a document generation request
        if (intent === 'document_discovery' && data.query?.metadata?.suggestedDocuments) {
          addMessage('assistant', '📝 I can generate these documents for you. View suggestions in the work area →');

          // Trigger research results view for now (will be enhanced to show document preview)
          onResearchComplete({
            query: userMessage,
            synthesis: data.query.metadata.synthesis,
            suggestedDocuments: data.query.metadata.suggestedDocuments,
            identifiedGaps: data.query.metadata.identifiedGaps,
          });
        } else {
          addMessage('assistant', '✓ Research complete! View results in the work area →');

          // Trigger research results view
          onResearchComplete({
            query: userMessage,
            synthesis: data.query.metadata?.synthesis,
            webSources: data.query.metadata?.webSources,
            documentSources: data.query.metadata?.documentSources,
            suggestedDocuments: data.query.metadata?.suggestedDocuments,
            identifiedGaps: data.query.metadata?.identifiedGaps,
            searchStrategy: data.query.metadata?.searchStrategy,
            duration: data.query.metadata?.duration,
          });
        }
      } else {
        setMessages((prev) => prev.slice(0, -1));
        addMessage('assistant', '❌ Research failed. Please try again.');
      }
    } catch (error) {
      console.error('Research error:', error);
      setMessages((prev) => prev.slice(0, -1));
      addMessage('assistant', '❌ An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentProject || !user) return;

    setUploadingFile(true);
    addMessage('assistant', `📄 Uploading and analyzing ${files.length} file(s)...`);

    try {
      // Upload files using batch upload API
      const fileArray = Array.from(files);
      const response = await referencesApi.uploadBatch(
        currentProject.id,
        user.id,
        fileArray
      );

      // Check if any uploads succeeded
      const successfulUploads = response.results.filter(r => r.success && r.reference);

      if (successfulUploads.length === 0) {
        setMessages((prev) => prev.slice(0, -1));
        addMessage('assistant', '❌ Upload failed. Please try again.');
        setUploadingFile(false);
        return;
      }

      // Remove processing message
      setMessages((prev) => prev.slice(0, -1));

      // If single file, show it in work area
      if (successfulUploads.length === 1 && successfulUploads[0].reference) {
        addMessage('assistant', '✓ File uploaded and analyzed! View results in the work area →');
        onFileAnalyzed(successfulUploads[0].reference);
      } else {
        // Multiple files - show summary
        addMessage('assistant', `✓ ${successfulUploads.length} file(s) uploaded successfully! Check the reference library.`);

        // Show the first one in work area
        if (successfulUploads[0].reference) {
          onFileAnalyzed(successfulUploads[0].reference);
        }
      }

      // Trigger validation if project has existing decisions
      if (currentProject.items && currentProject.items.length > 0) {
        for (const result of successfulUploads) {
          if (result.reference) {
            await referencesApi.validateReference(
              result.reference.id,
              currentProject.id
            );
          }
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessages((prev) => prev.slice(0, -1));
      addMessage('assistant', '❌ Upload failed. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  return (
    <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass flex flex-col h-full overflow-hidden`}>
      {/* Header with Reference Library Toggle */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setShowReferenceLibrary(!showReferenceLibrary)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
            isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Reference Library
            </span>
          </div>
          {showReferenceLibrary ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* Reference Library Drawer */}
      {showReferenceLibrary && (
        <ReferenceLibraryDrawer
          onReferenceSelected={(ref) => {
            onReferenceSelected(ref);
            setShowReferenceLibrary(false);
          }}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-cyan-primary text-white'
                  : message.role === 'system'
                  ? isDarkMode
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                  : isDarkMode
                  ? 'bg-white/10 text-gray-200'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 opacity-70`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-gray-700 hover:bg-white/10 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Upload size={16} />
              <span className="text-sm">Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMessage('Search the web for ')}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-gray-700 hover:bg-white/10 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              } disabled:opacity-50`}
            >
              <Globe size={16} />
              <span className="text-sm">Web Search</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMessage('What documents am I missing for ')}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-gray-700 hover:bg-white/10 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              } disabled:opacity-50`}
            >
              <FileQuestion size={16} />
              <span className="text-sm">Find Gaps</span>
            </button>
          </div>

          {/* Message Input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... I can research, analyze documents, and generate content for you."
              rows={3}
              disabled={isProcessing}
              className={`w-full px-4 py-3 pr-12 rounded-lg border resize-none ${
                isDarkMode
                  ? 'bg-white/5 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-cyan-primary focus:border-transparent disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isProcessing}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-cyan-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-primary/90 transition-colors"
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </form>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.txt,.md,image/*,video/*"
        />
      </div>
    </div>
  );
};

export default ResearchChatPanel;
