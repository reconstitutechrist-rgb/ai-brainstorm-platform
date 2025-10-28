import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { ChatInterface } from '../components/sandbox/ChatInterface';
import { LiveIdeasPanel } from '../components/sandbox/LiveIdeasPanel';
import { SessionReviewModal } from '../components/sandbox/SessionReviewModal';
import { SessionCompleteSummary } from '../components/sandbox/SessionCompleteSummary';
import { sandboxApi, sessionReviewApi } from '../services/api';
import { TestTube, Save, Trash2, AlertTriangle } from 'lucide-react';
import '../styles/homepage.css';

export const ConversationalSandbox: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const [activeSandbox, setActiveSandbox] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [extractedIdeas, setExtractedIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationMode, setConversationMode] = useState('exploration');

  // Session review state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<any>(null);
  const [topicGroups, setTopicGroups] = useState<any[]>([]);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [showCompleteSummary, setShowCompleteSummary] = useState(false);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    if (currentProject) {
      initializeSandbox();
    }
  }, [currentProject]);

  // Poll for new ideas extracted in background
  useEffect(() => {
    if (!conversation?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const convResponse = await sandboxApi.getConversation(conversation.id);
        const newIdeas = convResponse.conversation.extracted_ideas || [];

        // Only update if there are new ideas
        if (newIdeas.length > extractedIdeas.length) {
          console.log(`📥 Polling: Found ${newIdeas.length - extractedIdeas.length} new ideas`);
          setExtractedIdeas(newIdeas);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [conversation?.id, extractedIdeas.length]);

  const initializeSandbox = async () => {
    if (!currentProject) return;

    try {
      // Get or create sandbox
      const response = await sandboxApi.getByProject(currentProject.id);
      const activeSandboxes = response.sandboxes.filter((s: any) => s.status === 'active');

      let sandbox;
      if (activeSandboxes.length > 0) {
        sandbox = activeSandboxes[0];
      } else {
        const createResponse = await sandboxApi.create({
          projectId: currentProject.id,
          userId: 'demo-user-123',
          name: `Sandbox - ${new Date().toLocaleDateString()}`,
        });
        sandbox = createResponse.sandbox;
      }

      setActiveSandbox(sandbox);

      // Start or get conversation
      if (sandbox.conversation_id) {
        const convResponse = await sandboxApi.getConversation(sandbox.conversation_id);
        setConversation(convResponse.conversation);
        setMessages(convResponse.conversation.messages || []);
        setExtractedIdeas(convResponse.conversation.extracted_ideas || []);
        setConversationMode(convResponse.conversation.current_mode || 'exploration');
      } else {
        // Start new conversation
        const convResponse = await sandboxApi.startConversation({
          sandboxId: sandbox.id,
          projectContext: {
            projectTitle: currentProject.title,
            projectDescription: currentProject.description,
            currentDecisions: currentProject.items?.filter((i: any) => i.state === 'decided') || [],
            constraints: [],
          },
        });
        setConversation(convResponse.conversation);
        setMessages(convResponse.conversation.messages || []);
        setExtractedIdeas([]);
      }
    } catch (error) {
      console.error('Initialize sandbox error:', error);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!conversation) return;

    // Immediately add user message to state for instant feedback
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsLoading(true);
    try {
      // Check if user wants to end session
      const endIntentCheck = await sessionReviewApi.detectEndIntent(userMessage);

      if (endIntentCheck.isEndIntent && endIntentCheck.confidence > 70) {
        // User wants to end session - trigger review
        await handleEndSession();
        setIsLoading(false);
        return;
      }

      const response = await sandboxApi.sendMessage({
        conversationId: conversation.id,
        userMessage,
        mode: conversationMode,
      });

      // Update messages with AI response (user message already added)
      if (response.message) {
        setMessages((prev) => [...prev, response.message]);
      }

      // Update extracted ideas (will be populated by background process via polling)
      if (response.extractedIdeas && response.extractedIdeas.length > 0) {
        setExtractedIdeas((prev) => [...prev, ...response.extractedIdeas]);
      }

      // Update mode if shifted
      if (response.modeShift) {
        setConversationMode(response.modeShift);
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Remove the optimistically added user message on error
      setMessages((prev) => prev.filter(msg => msg.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewConversation = async () => {
    if (!conversation) return;

    try {
      const reviewResponse = await sandboxApi.reviewConversation(conversation.id);

      console.log('🔍 Review started:', reviewResponse.message);

      // Show instant feedback - new ideas will appear via live updates
      alert('Review started! New ideas will appear in the display shortly.');

      // The review happens in background, ideas will be added via the polling mechanism
    } catch (error) {
      console.error('Review conversation error:', error);
      alert('Failed to review conversation. Please try again.');
    }
  };

  const handleEndSession = async () => {
    if (!conversation) return;

    try {
      // Generate review summary with grouped ideas
      const summaryResponse = await sessionReviewApi.generateSummary(conversation.id);

      setReviewSummary(summaryResponse.summary);
      setTopicGroups(summaryResponse.topicGroups);
      setIsReviewModalOpen(true);
    } catch (error) {
      console.error('Error generating review summary:', error);
      alert('Failed to generate review. Please try again.');
    }
  };

  const handleSubmitDecisions = async (decisionsText: string) => {
    if (!conversation) return null;

    try {
      console.log('[ConversationalSandbox] Calling parseDecisions API');
      const parseResponse = await sessionReviewApi.parseDecisions(
        conversation.id,
        decisionsText
      );
      console.log('[ConversationalSandbox] API response:', parseResponse);
      console.log('[ConversationalSandbox] Returning parsedDecisions:', parseResponse.parsedDecisions);

      return parseResponse.parsedDecisions;
    } catch (error) {
      console.error('[ConversationalSandbox] Error parsing decisions:', error);
      return null;
    }
  };

  const handleConfirmFinalDecisions = async (parsedDecisions: any) => {
    if (!conversation) return;

    try {
      console.log('[ConversationalSandbox] Calling finalize API');
      const finalizeResponse = await sessionReviewApi.finalizeSession(
        conversation.id,
        {
          accepted: parsedDecisions.accepted,
          rejected: parsedDecisions.rejected,
          unmarked: parsedDecisions.unmarked,
        }
      );
      console.log('[ConversationalSandbox] Finalize response:', finalizeResponse);

      // Close review modal immediately
      setIsReviewModalOpen(false);

      // Check if processing in background
      if (finalizeResponse.processing) {
        // Background processing - show simple success message
        alert('Session finalized successfully! Your documents are being generated in the background.');

        // Reset sandbox for new session
        setMessages([]);
        setExtractedIdeas([]);
        setConversation(null);
      } else if (finalizeResponse.sessionSummary) {
        // Immediate response with summary (legacy path)
        setSessionSummary(finalizeResponse.sessionSummary);
        setShowCompleteSummary(true);

        // Reset sandbox for new session
        setMessages([]);
        setExtractedIdeas([]);
        setConversation(null);
      }
    } catch (error) {
      console.error('[ConversationalSandbox] Error finalizing session:', error);
      alert('Failed to finalize session. Please try again.');
      throw error; // Re-throw to keep modal in loading state
    }
  };

  const handleCancelReview = async () => {
    if (!conversation) return;

    try {
      await sessionReviewApi.cancelReview(conversation.id);
      setIsReviewModalOpen(false);
      setReviewSummary(null);
      setTopicGroups([]);
    } catch (error) {
      console.error('Error canceling review:', error);
    }
  };

  const handleSaveAsAlternative = async () => {
    if (!activeSandbox) return;

    const name = prompt('Name this alternative version:');
    if (!name) return;

    try {
      await sandboxApi.saveAsAlternative({
        sandboxId: activeSandbox.id,
        alternativeName: name,
      });
      alert('✅ Saved as alternative version!');
      initializeSandbox();
    } catch (error) {
      console.error('Save alternative error:', error);
      alert('Failed to save alternative. Please try again.');
    }
  };

  const handleDiscardSandbox = async () => {
    if (!activeSandbox) return;

    if (!confirm('Discard all ideas and conversation in this sandbox? This cannot be undone.')) return;

    try {
      await sandboxApi.discard(activeSandbox.id);
      setActiveSandbox(null);
      setConversation(null);
      setMessages([]);
      setExtractedIdeas([]);
      initializeSandbox();
    } catch (error) {
      console.error('Discard sandbox error:', error);
      alert('Failed to discard sandbox. Please try again.');
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <TestTube size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a project to start brainstorming with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-6 mb-6 shadow-glass border-2 border-green-metallic/30`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <TestTube className="text-green-metallic" size={28} />
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Conversational Sandbox
              </h1>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Brainstorm with AI to explore ideas, clarify thinking, and discover what you really want
            </p>
            <div
              className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg w-fit ${
                isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <AlertTriangle size={14} />
              <span>Nothing here affects your main project until you extract ideas</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleSaveAsAlternative}
              className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
                isDarkMode
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
              }`}
            >
              <Save size={16} />
              <span className="text-sm font-medium">Save as Alternative</span>
            </button>
            <button
              onClick={handleDiscardSandbox}
              className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
                isDarkMode
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                  : 'bg-red-100 hover:bg-red-200 text-red-600'
              }`}
            >
              <Trash2 size={16} />
              <span className="text-sm font-medium">Discard All</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Chat + Ideas Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass flex-1 overflow-hidden flex flex-col`}
      >
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">
          {/* Chat Interface - 2/3 width on large screens */}
          <div className={`lg:col-span-2 flex flex-col overflow-hidden border-r ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              conversationMode={conversationMode}
            />
          </div>

          {/* Live Ideas Panel - 1/3 width on large screens */}
          <div className="flex flex-col overflow-hidden">
            <LiveIdeasPanel
              ideas={extractedIdeas}
              conversationId={conversation?.id}
              onEndSession={extractedIdeas.length > 0 ? handleEndSession : undefined}
              onReviewConversation={handleReviewConversation}
            />
          </div>
        </div>
      </motion.div>

      {/* Session Review Modal */}
      {isReviewModalOpen && reviewSummary && (
        <SessionReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCancelReview}
          topicGroups={topicGroups}
          summaryText={reviewSummary.summaryText}
          onSubmitDecisions={handleSubmitDecisions}
          onConfirmFinal={handleConfirmFinalDecisions}
          onCancel={handleCancelReview}
        />
      )}

      {/* Session Complete Summary */}
      {showCompleteSummary && sessionSummary && (
        <SessionCompleteSummary
          summary={sessionSummary}
          onViewDocs={() => {
            // Navigate to Intelligence Hub - Generated Docs tab
            window.location.href = '/intelligence-hub';
          }}
          onNewSession={() => {
            setShowCompleteSummary(false);
            setSessionSummary(null);
            initializeSandbox();
          }}
          onClose={() => {
            setShowCompleteSummary(false);
            setSessionSummary(null);
          }}
        />
      )}
    </div>
  );
};
