import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { FileText, CheckCircle, Clock, Archive, ChevronRight, Zap, ShieldCheck, Download, AlertCircle, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import '../styles/homepage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const DocumentsPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const [selectedState, setSelectedState] = useState<'decided' | 'exploring' | 'parked'>('decided');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'prd' | 'technical_spec' | 'user_stories' | 'roadmap'>('prd');
  const [generationMode, setGenerationMode] = useState<'quick' | 'verify'>('quick');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <FileText size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select a project to view its documents
          </p>
        </div>
      </div>
    );
  }

  const items = currentProject.items || [];
  const decidedItems = items.filter(item => item.state === 'decided');
  const exploringItems = items.filter(item => item.state === 'exploring');
  const parkedItems = items.filter(item => item.state === 'parked');

  const currentItems = selectedState === 'decided' ? decidedItems :
                      selectedState === 'exploring' ? exploringItems :
                      parkedItems;

  // Document generation handler
  const handleGenerateDocument = async (mode: 'quick' | 'verify') => {
    if (!currentProject || !user) {
      console.error('No project or user selected');
      return;
    }

    setIsGenerating(true);
    setGenerationMode(mode);

    try {
      const endpoint = mode === 'quick'
        ? `${API_URL}/api/generated-documents/quick-generate`
        : `${API_URL}/api/generated-documents/verify-and-generate`;

      const response = await axios.post(endpoint, {
        projectId: currentProject.id,
        documentType: selectedDocType,
        userId: user.id,
      });

      if (response.data.success) {
        setGeneratedDocument(response.data);
        setShowDocumentModal(true);
        // Add to generation history
        setGenerationHistory(prev => [{
          ...response.data,
          type: selectedDocType,
          mode,
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        console.error('Document generation failed:', response.data.message);
        alert('Failed to generate document: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Error generating document:', error);
      alert('Error generating document: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsGenerating(false);
    }
  };

  // Download document as markdown
  const handleDownloadDocument = () => {
    if (!generatedDocument) return;

    const blob = new Blob([generatedDocument.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDocType}_${currentProject?.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy document to clipboard
  const handleCopyToClipboard = async () => {
    if (!generatedDocument) return;

    try {
      await navigator.clipboard.writeText(generatedDocument.content);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const documentTypes = {
    prd: { label: 'Product Requirements Document', icon: FileText, description: 'Comprehensive product specification' },
    technical_spec: { label: 'Technical Specification', icon: FileText, description: 'Technical architecture and implementation details' },
    user_stories: { label: 'User Stories', icon: FileText, description: 'User-focused acceptance criteria' },
    roadmap: { label: 'Project Roadmap', icon: FileText, description: 'Development timeline and phases' },
  };

  const stateConfig = {
    decided: {
      icon: CheckCircle,
      color: 'text-cyan-400 bg-cyan-500/20',
      label: 'Decided',
      description: 'Confirmed decisions ready for implementation'
    },
    exploring: {
      icon: Clock,
      color: 'text-blue-400 bg-blue-500/20',
      label: 'Exploring',
      description: 'Ideas under active consideration'
    },
    parked: {
      icon: Archive,
      color: 'text-gray-400 bg-gray-500/20',
      label: 'Parked',
      description: 'Ideas saved for future consideration'
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {currentProject.title}
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Project documentation and decision tracking
        </p>
      </motion.div>

      {/* State Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(stateConfig).map(([state, config], index) => {
          const Icon = config.icon;
          const count = state === 'decided' ? decidedItems.length :
                       state === 'exploring' ? exploringItems.length :
                       parkedItems.length;

          return (
            <motion.button
              key={state}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedState(state as any)}
              className={`${
                selectedState === state
                  ? 'ring-2 ring-cyan-primary'
                  : ''
              } ${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass hover:shadow-glass-hover transition-all text-left`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <ChevronRight
                  size={20}
                  className={selectedState === state ? 'text-cyan-primary' : 'text-gray-400'}
                />
              </div>
              <h3 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {count}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {config.label}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Document Generation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Generate Documents
        </h2>
        <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Auto-generate professional documents from your project items
        </p>

        {/* Document Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(documentTypes).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedDocType(type as any)}
              className={`${
                selectedDocType === type
                  ? 'ring-2 ring-cyan-primary bg-cyan-500/10'
                  : isDarkMode ? 'bg-white/5' : 'bg-white/50'
              } rounded-xl p-4 border ${
                isDarkMode ? 'border-white/10' : 'border-white/30'
              } hover:border-cyan-primary/50 transition-all text-left`}
            >
              <FileText size={20} className={`mb-2 ${selectedDocType === type ? 'text-cyan-primary' : 'text-gray-400'}`} />
              <p className={`font-medium text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {config.label}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {config.description}
              </p>
            </button>
          ))}
        </div>

        {/* Generation Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleGenerateDocument('quick')}
            disabled={isGenerating || decidedItems.length === 0}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-medium transition-all ${
              isGenerating || decidedItems.length === 0
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-primary/20 text-cyan-primary hover:bg-cyan-primary/30'
            }`}
          >
            <Zap size={20} />
            <span>{isGenerating && generationMode === 'quick' ? 'Generating...' : 'Quick Generate'}</span>
          </button>

          <button
            onClick={() => handleGenerateDocument('verify')}
            disabled={isGenerating || decidedItems.length === 0}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-medium transition-all ${
              isGenerating || decidedItems.length === 0
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            <ShieldCheck size={20} />
            <span>{isGenerating && generationMode === 'verify' ? 'Verifying & Generating...' : 'Verify & Generate'}</span>
          </button>
        </div>

        {decidedItems.length === 0 && (
          <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-yellow-500 mt-0.5" />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
                  No decided items
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-500' : 'text-yellow-700'}`}>
                  Start a conversation on the Chat page to record decisions before generating documents
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generation History */}
        {generationHistory.length > 0 && (
          <div className="mt-6">
            <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Recent Generations
            </h3>
            <div className="space-y-2">
              {generationHistory.slice(0, 5).map((doc, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setGeneratedDocument(doc);
                    setSelectedDocType(doc.type);
                    setGenerationMode(doc.mode);
                    setShowDocumentModal(true);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white/70'
                  } border ${isDarkMode ? 'border-white/10' : 'border-white/30'} transition-all text-left`}
                >
                  <div className="flex items-center space-x-3">
                    <FileText size={16} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <div>
                      <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {documentTypes[doc.type as keyof typeof documentTypes]?.label || doc.type}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {format(new Date(doc.timestamp), 'MMM d, h:mm a')} • {doc.metadata?.itemsUsed || 0} items
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.mode === 'quick'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {doc.mode === 'quick' ? 'Quick' : 'Verified'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Items List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 shadow-glass`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {stateConfig[selectedState].label} Items
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stateConfig[selectedState].description}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-xl ${stateConfig[selectedState].color} font-medium`}>
            {currentItems.length} {currentItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            {React.createElement(stateConfig[selectedState].icon, {
              size: 48,
              className: `mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`
            })}
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No {selectedState} items yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${
                  isDarkMode ? 'bg-white/5' : 'bg-white/50'
                } rounded-xl p-6 border ${
                  isDarkMode ? 'border-white/10' : 'border-white/30'
                } hover:border-cyan-primary/50 transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-lg mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {item.text}
                    </p>

                    {item.citation && (
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">User said:</span>
                          <span className="italic">"{item.citation.userQuote}"</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>
                            Recorded: {format(new Date(item.citation.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${
                            item.citation.confidence === 100
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.citation.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`ml-4 px-3 py-1 rounded-lg ${stateConfig[selectedState].color} text-sm font-medium`}>
                    {stateConfig[selectedState].label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {showDocumentModal && generatedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDocumentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-glass`}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {documentTypes[selectedDocType].label}
                  </h2>
                  <div className="flex items-center flex-wrap gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      generationMode === 'quick'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {generationMode === 'quick' ? 'Quick Generated' : 'Verified'}
                    </span>
                    {generatedDocument.metadata && (
                      <>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {generatedDocument.metadata.itemsUsed} items used
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>•</span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {generatedDocument.metadata.decidedItems} decided, {generatedDocument.metadata.exploringItems} exploring
                        </span>
                        {generatedDocument.metadata.generatedAt && (
                          <>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>•</span>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {format(new Date(generatedDocument.metadata.generatedAt), 'MMM d, h:mm a')}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className={`text-gray-400 hover:text-white transition-colors`}
                >
                  ✕
                </button>
              </div>

              {/* Quality Report (if verified) */}
              {generatedDocument.qualityReport && (
                <div className={`mb-6 p-4 rounded-xl ${
                  generatedDocument.qualityReport.verified
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                  <div className="flex items-start space-x-3">
                    {generatedDocument.qualityReport.verified ? (
                      <ShieldCheck size={20} className="text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium mb-2 ${
                        generatedDocument.qualityReport.verified
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
                      }`}>
                        {generatedDocument.qualityReport.verified
                          ? 'Quality Check Passed'
                          : 'Quality Issues Detected'}
                      </p>

                      {generatedDocument.qualityReport.issues?.length > 0 && (
                        <div className="mb-2">
                          <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Issues:
                          </p>
                          <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {generatedDocument.qualityReport.issues.map((issue: string, i: number) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {generatedDocument.qualityReport.assumptions?.length > 0 && (
                        <div className="mb-2">
                          <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Assumptions ({generatedDocument.qualityReport.assumptions.length}):
                          </p>
                          <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {generatedDocument.qualityReport.assumptions.slice(0, 3).map((assumption: any, i: number) => (
                              <li key={i}>
                                • {typeof assumption === 'string' ? assumption : assumption.detail || assumption.recommendation || JSON.stringify(assumption)}
                                {assumption.severity && (
                                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                    assumption.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    assumption.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {assumption.severity}
                                  </span>
                                )}
                              </li>
                            ))}
                            {generatedDocument.qualityReport.assumptions.length > 3 && (
                              <li>• ...and {generatedDocument.qualityReport.assumptions.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {generatedDocument.qualityReport.gapsDetected?.length > 0 && (
                        <div>
                          <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Gaps Detected:
                          </p>
                          <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {generatedDocument.qualityReport.gapsDetected.map((gap: string, i: number) => (
                              <li key={i}>• {gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Content */}
              <div className={`overflow-y-auto max-h-96 p-4 rounded-xl ${
                isDarkMode ? 'bg-white/5' : 'bg-white/50'
              } border ${isDarkMode ? 'border-white/10' : 'border-white/30'} mb-6`}>
                <pre className={`whitespace-pre-wrap font-mono text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {generatedDocument.content}
                </pre>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    copiedToClipboard
                      ? 'bg-green-500/20 text-green-400'
                      : isDarkMode ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {copiedToClipboard ? <Check size={20} /> : <Copy size={20} />}
                  <span>{copiedToClipboard ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadDocument}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium bg-cyan-primary/20 text-cyan-primary hover:bg-cyan-primary/30 transition-all"
                >
                  <Download size={20} />
                  <span>Download as Markdown</span>
                </button>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className={`px-6 py-3 rounded-xl font-medium ${
                    isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'
                  } transition-all`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
