/**
 * Interactive Analysis Component - Phase 4.1
 *
 * Enables users to interact with reference analysis through:
 * - Chat interface for asking questions about the analysis
 * - Deep-dive expansion for detailed exploration
 * - Follow-up research suggestions
 * - One-click extraction to project canvas
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Copy,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ExpandableSection {
  title: string;
  summary: string;
  expanded?: boolean;
  fullContent?: string;
}

interface Props {
  referenceId: string;
  projectId: string;
  analysisContent: string;
  onExtractToCanvas?: (insight: string) => void;
  className?: string;
}

const InteractiveAnalysis: React.FC<Props> = ({
  referenceId,
  projectId,
  analysisContent,
  onExtractToCanvas,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [extractedInsights, setExtractedInsights] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse analysis into expandable sections
  const parseAnalysisSections = (): ExpandableSection[] => {
    const sections: ExpandableSection[] = [];
    const lines = analysisContent.split('\n');
    let currentSection: ExpandableSection | null = null;

    lines.forEach((line) => {
      // Detect section headers (## or ###)
      if (line.match(/^#{2,3}\s+/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace(/^#{2,3}\s+/, ''),
          summary: '',
          expanded: false,
        };
      } else if (currentSection && line.trim()) {
        if (currentSection.summary.length < 150) {
          currentSection.summary += line + ' ';
        }
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const sections = parseAnalysisSections();

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/analysis/chat', {
        referenceId,
        projectId,
        analysisContent,
        messages: [...messages, userMessage],
        question: userMessage.content,
      });

      if (response.data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Add suggested follow-up questions if available
        if (response.data.suggestedQuestions) {
          // Store for display
        }
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepDive = async (sectionTitle: string) => {
    const isExpanded = expandedSections.has(sectionTitle);

    if (isExpanded) {
      const newExpanded = new Set(expandedSections);
      newExpanded.delete(sectionTitle);
      setExpandedSections(newExpanded);
    } else {
      setLoading(true);
      try {
        const response = await api.post('/api/analysis/deep-dive', {
          referenceId,
          projectId,
          analysisContent,
          sectionTitle,
        });

        if (response.data.success) {
          // Add expanded content to the section
          const newExpanded = new Set(expandedSections);
          newExpanded.add(sectionTitle);
          setExpandedSections(newExpanded);
        }
      } catch (error) {
        console.error('Deep dive error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExtractInsight = (insight: string) => {
    setExtractedInsights((prev) => [...prev, insight]);
    if (onExtractToCanvas) {
      onExtractToCanvas(insight);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestedQuestions = [
    'What are the key technologies mentioned?',
    'What are the main pain points?',
    'How does this compare to competitors?',
    'What are the pricing details?',
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Ask Questions</span>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'insights'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium">Key Insights</span>
              {extractedInsights.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-white text-blue-600 rounded-full">
                  {extractedInsights.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Ask Questions About This Analysis
                </h3>
                <p className="text-gray-500 mb-6">
                  Get clarification, explore details, or discover insights
                </p>

                {/* Suggested Questions */}
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-sm text-gray-600 font-medium mb-3">Try asking:</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(question)}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about this analysis..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {/* Expandable Sections */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Sections</h3>
            {sections.map((section, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{section.title}</h4>
                      <p className="text-sm text-gray-600">{section.summary}...</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleExtractInsight(section.title + ': ' + section.summary)}
                        className="p-2 text-cyan-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Add to Canvas"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeepDive(section.title)}
                        aria-label={`Toggle ${section.title} section`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {expandedSections.has(section.title) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedSections.has(section.title) && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{section.summary}</ReactMarkdown>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setInput(`Tell me more about ${section.title}`)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Search className="w-3 h-3" />
                        Research More
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Extracted Insights */}
          {extractedInsights.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Extracted Insights ({extractedInsights.length})
                </h3>
                <button
                  onClick={() => handleCopyToClipboard(extractedInsights.join('\n\n'))}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-cyan-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy All
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-2">
                {extractedInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700"
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveAnalysis;
