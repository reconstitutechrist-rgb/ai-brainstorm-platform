import React, { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { documentResearchApi } from '../services/api';
import {
  Send,
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Download,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    suggestedDocuments?: Array<{
      templateId: string;
      templateName: string;
      category: string;
      reasoning: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    needsMoreInfo?: boolean;
    followUpQuestions?: string[];
  };
}

interface Session {
  id: string;
  projectId: string;
  userId: string;
  query: string;
  status: string;
  sessionType: string;
  messageCount: number;
  lastUpdated: string;
  createdAt: string;
}

interface DocumentGenerationProgress {
  [templateId: string]: {
    status: 'generating' | 'success' | 'error';
    message?: string;
    documentId?: string;
    completionPercent?: number;
  };
}

const DocumentResearchChat: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [documentGenProgress, setDocumentGenProgress] = useState<DocumentGenerationProgress>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions when project changes
  useEffect(() => {
    if (currentProject) {
      loadSessions();
    }
  }, [currentProject]);

  // Load session messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages();
    }
  }, [activeSessionId]);

  const loadSessions = async () => {
    if (!currentProject) return;

    setLoadingSessions(true);
    try {
      const data = await documentResearchApi.getProjectSessions(currentProject.id);
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async () => {
    if (!activeSessionId) return;

    setLoading(true);
    try {
      const data = await documentResearchApi.getSession(activeSessionId);
      if (data.success && data.session) {
        setMessages(data.session.conversationThread?.messages || []);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSession = async (initialMessage?: string) => {
    if (!currentProject || !user) return;

    const message = initialMessage || inputMessage.trim();
    if (!message) return;

    setSending(true);
    setInputMessage('');
    try {
      const data = await documentResearchApi.startSession({
        projectId: currentProject.id,
        userId: user.id,
        initialMessage: message,
      });

      if (data.success) {
        setActiveSessionId(data.sessionId);

        // Add messages to chat
        if (data.response) {
          const userMsg: Message = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
          };
          const assistantMsg: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString(),
            metadata: {
              suggestedDocuments: data.discovery?.suggestedDocuments,
              needsMoreInfo: data.discovery?.needsMoreInfo,
              followUpQuestions: data.discovery?.followUpQuestions,
            },
          };
          setMessages([userMsg, assistantMsg]);
        }

        await loadSessions();
      }
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendMessage = async () => {
    if (!activeSessionId || !currentProject || !inputMessage.trim()) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistically add user message
    const userMsg: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await documentResearchApi.sendMessage({
        sessionId: activeSessionId,
        message,
        projectId: currentProject.id,
      });

      if (data.success && data.response) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          metadata: {
            suggestedDocuments: data.discovery?.suggestedDocuments,
            needsMoreInfo: data.discovery?.needsMoreInfo,
            followUpQuestions: data.discovery?.followUpQuestions,
          },
        };
        setMessages(prev => [...prev, assistantMsg]);
        await loadSessions(); // Refresh session list
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleGenerateDocument = async (templateId: string, templateName: string) => {
    if (!activeSessionId || !currentProject || !user) return;

    // Set generating status
    setDocumentGenProgress(prev => ({
      ...prev,
      [templateId]: { status: 'generating', message: `Generating ${templateName}...` },
    }));

    try {
      const data = await documentResearchApi.generateDocument({
        sessionId: activeSessionId,
        templateId,
        projectId: currentProject.id,
        userId: user.id,
      });

      if (data.success) {
        setDocumentGenProgress(prev => ({
          ...prev,
          [templateId]: {
            status: 'success',
            message: data.message || `Document generated successfully!`,
            documentId: data.document?.id,
            completionPercent: data.autoFillResult?.completionPercent,
          },
        }));

        // Auto-remove success message after 5 seconds
        setTimeout(() => {
          setDocumentGenProgress(prev => {
            const newState = { ...prev };
            delete newState[templateId];
            return newState;
          });
        }, 5000);
      } else {
        setDocumentGenProgress(prev => ({
          ...prev,
          [templateId]: {
            status: 'error',
            message: 'Failed to generate document',
          },
        }));
      }
    } catch (error: any) {
      console.error('Error generating document:', error);
      setDocumentGenProgress(prev => ({
        ...prev,
        [templateId]: {
          status: 'error',
          message: error.message || 'Failed to generate document',
        },
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeSessionId) {
        handleSendMessage();
      } else {
        handleStartNewSession();
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Optional';
      default:
        return priority;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with session toggle */}
      <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-t-2xl p-4 shadow-glass border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-green-metallic" size={24} />
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Document Research Assistant
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ask what documents you need for your project
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <Clock size={16} />
            <span className="text-sm">Sessions ({sessions.length})</span>
            {showSessions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Sessions dropdown */}
        {showSessions && (
          <div className={`mt-4 max-h-48 overflow-y-auto rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-green-metallic" size={24} />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No previous sessions
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setShowSessions(false);
                    }}
                    className={`w-full text-left p-3 hover:bg-white/5 transition-colors ${
                      activeSessionId === session.id ? 'bg-green-metallic/10' : ''
                    }`}
                  >
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {session.query.substring(0, 60)}...
                    </div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {session.messageCount} messages • {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="text-green-metallic mb-4" size={48} />
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Start a Conversation
            </h3>
            <p className={`max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ask me what documents you need for your project. I'll help you discover essential documentation based on your project's requirements.
            </p>
            <div className="mt-6 space-y-2">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Try asking:</p>
              {[
                'What documents do I need for my healthcare app?',
                'I\'m building an API, what documentation should I create?',
                'What legal documents do I need for my SaaS product?',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStartNewSession(suggestion)}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-gray-200'
                      : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-gray-800'
                  }`}
                  disabled={sending}
                >
                  <span className="text-blue-400 mr-2">→</span>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl ${
                    message.role === 'user'
                      ? `${isDarkMode ? 'bg-green-metallic/20' : 'bg-green-metallic/10'} rounded-2xl rounded-tr-sm`
                      : `${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl rounded-tl-sm shadow-md`
                  } p-4`}
                >
                  {/* Message content */}
                  <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>

                  {/* Suggested documents */}
                  {message.metadata?.suggestedDocuments && message.metadata.suggestedDocuments.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <FileText size={16} />
                        Suggested Documents
                      </div>
                      {message.metadata.suggestedDocuments.map((doc, docIdx) => (
                        <div
                          key={docIdx}
                          className={`border-l-4 ${getPriorityColor(doc.priority)} p-4 rounded-r-lg`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {doc.templateName}
                                </h4>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  doc.priority === 'high'
                                    ? 'bg-red-500/20 text-red-400'
                                    : doc.priority === 'medium'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {getPriorityLabel(doc.priority)}
                                </span>
                              </div>
                              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span className="font-medium">Category:</span> {doc.category.replace(/_/g, ' ')}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {doc.reasoning}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {documentGenProgress[doc.templateId] ? (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50">
                                  {documentGenProgress[doc.templateId].status === 'generating' && (
                                    <>
                                      <Loader2 className="animate-spin text-blue-400" size={16} />
                                      <span className="text-sm text-blue-400">Generating...</span>
                                    </>
                                  )}
                                  {documentGenProgress[doc.templateId].status === 'success' && (
                                    <>
                                      <CheckCircle className="text-green-500" size={16} />
                                      <span className="text-sm text-green-500">
                                        {documentGenProgress[doc.templateId].completionPercent}% Complete
                                      </span>
                                    </>
                                  )}
                                  {documentGenProgress[doc.templateId].status === 'error' && (
                                    <>
                                      <AlertCircle className="text-red-500" size={16} />
                                      <span className="text-sm text-red-500">Failed</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleGenerateDocument(doc.templateId, doc.templateName)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-metallic hover:bg-green-metallic/90 text-white text-sm font-medium transition-colors"
                                >
                                  <Download size={16} />
                                  Generate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up questions */}
                  {message.metadata?.followUpQuestions && message.metadata.followUpQuestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Follow-up questions:
                      </div>
                      {message.metadata.followUpQuestions.map((question, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => setInputMessage(question)}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isDarkMode
                              ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          <span className="text-blue-400 mr-2">→</span>
                          {question}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl rounded-tl-sm shadow-md p-4`}>
                  <Loader2 className="animate-spin text-green-metallic" size={24} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-b-2xl p-4 shadow-glass border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={activeSessionId ? 'Ask a follow-up question...' : 'Ask what documents you need...'}
            rows={1}
            className={`flex-1 px-4 py-3 rounded-lg border resize-none ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:ring-2 focus:ring-green-metallic focus:border-transparent`}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={activeSessionId ? handleSendMessage : handleStartNewSession}
            disabled={sending || !inputMessage.trim() || !currentProject || !user}
            className="px-6 py-3 rounded-lg bg-green-metallic hover:bg-green-metallic/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={20} />
                {activeSessionId ? 'Send' : 'Start'}
              </>
            )}
          </button>
        </div>
        <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default DocumentResearchChat;
