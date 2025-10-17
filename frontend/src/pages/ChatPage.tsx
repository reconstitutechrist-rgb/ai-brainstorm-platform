import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';
import { useSessionStore } from '../store/sessionStore';
import { useAgentStore } from '../store/agentStore';
import { conversationsApi } from '../services/api';
import { Send, Upload, Loader2, Bot, User as UserIcon, X, History } from 'lucide-react';
import { format } from 'date-fns';
import { ReferenceUpload } from '../components/ReferenceUpload';
import { SessionControls } from '../components/SessionControls';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { SessionTrackingPanel } from '../components/SessionTrackingPanel';
import { SessionHistoryModal } from '../components/SessionHistoryModal';
import { FloatingAgentBubbles } from '../components/FloatingAgentBubbles';
import { AgentChatWindow } from '../components/AgentChatWindow';

export const ChatPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { currentProject } = useProjectStore();
  const { messages, isTyping, addMessage, addMessages, setMessages, setIsTyping } = useChatStore();
  const { trackActivity, loadAllSessionData, sessionSummary } = useSessionStore();
  const { agentWindows, openAgentWindow, closeAgentWindow, minimizeAgentWindow, addAgentQuestion, addUserResponse, markQuestionAnswered } = useAgentStore();
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(true); // Auto-start session
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const hasShownSummaryRef = useRef(false);

  // Memoize loadMessages to prevent unnecessary reloads
  const loadMessages = useCallback(async () => {
    if (!currentProject) return;

    try {
      const response = await conversationsApi.getMessages(currentProject.id);
      if (response.success) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentProject, setMessages]);

  // Load messages and session data when project changes
  useEffect(() => {
    if (currentProject && user) {
      // Check if project actually changed
      const projectChanged = currentProjectIdRef.current !== currentProject.id;

      if (projectChanged) {
        currentProjectIdRef.current = currentProject.id;
        setInputMessage('');
        setMessages([]); // Clear messages when switching projects
        loadMessages();
        hasShownSummaryRef.current = false;
      }

      // Load session data - DISABLED: causing API errors
      // loadAllSessionData(user.id, currentProject.id);
    }
  }, [currentProject?.id, user?.id, loadMessages, setMessages]);

  // Show summary modal when session data loads
  useEffect(() => {
    if (sessionSummary && !hasShownSummaryRef.current && currentProject && user) {
      // Show modal if not first session
      if (sessionSummary.lastSession && sessionSummary.lastSession !== 'first session') {
        setShowSummaryModal(true);
      }
      hasShownSummaryRef.current = true;
    }
  }, [sessionSummary, currentProject, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    console.log('🔵 handleSendMessage called');
    console.log('  - inputMessage:', inputMessage.trim());
    console.log('  - currentProject:', currentProject?.id);
    console.log('  - isSending:', isSending);
    console.log('  - isSessionActive:', isSessionActive);

    if (!inputMessage.trim() || !currentProject || isSending || !isSessionActive) {
      console.log('❌ Early return - validation failed');
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const userId = user?.id || 'demo-user-123';
      console.log('🚀 Calling conversationsApi.sendMessage');
      console.log('  - projectId:', currentProject.id);
      console.log('  - userId:', userId);
      console.log('  - message length:', messageText.length);

      const response = await conversationsApi.sendMessage(
        currentProject.id,
        messageText,
        userId
      );

      console.log('✅ API Response received:', response);

      if (response.success) {
        addMessage(response.userMessage);
        addMessages(response.agentMessages);

        // Detect question messages and create agent windows
        response.agentMessages.forEach((msg: any) => {
          if (msg.metadata?.isQuestion && msg.agent_type) {
            const agentType = msg.agent_type.replace(/Agent$/i, '').toLowerCase();
            addAgentQuestion(agentType, {
              id: msg.id,
              role: 'agent',
              content: msg.content,
              timestamp: msg.created_at,
              messageId: msg.id,
            });
          }
        });

        // Track activity and refresh project data after successful message
        if (user && currentProject) {
          trackActivity(user.id, currentProject.id);

          // Refresh project data to update session tracking panel
          try {
            const { projectsApi } = await import('../services/api');
            const projectsResponse = await projectsApi.getByUserId(user.id);
            if (projectsResponse.success) {
              const updatedProject = projectsResponse.projects.find(p => p.id === currentProject.id);
              if (updatedProject) {
                const { useProjectStore } = await import('../store/projectStore');
                useProjectStore.getState().setCurrentProject(updatedProject);
              }
            }
          } catch (err) {
            console.error('Failed to refresh project data:', err);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to send message. The AI agents may be taking longer than expected.';
      alert(errorMsg);
      // Re-add the message to the input
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBubbleClick = (agentType: string) => {
    openAgentWindow(agentType);
  };

  const handleAgentMessageSend = async (agentType: string, message: string) => {
    if (!currentProject || !user) return;

    // Add user response to agent thread
    addUserResponse(agentType, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Mark question as answered
    markQuestionAnswered(agentType);

    // Post the response to main chat so all agents can see it
    try {
      const userId = user?.id || 'demo-user-123';
      const response = await conversationsApi.sendMessage(
        currentProject.id,
        message,
        userId
      );

      if (response.success) {
        addMessage(response.userMessage);
        addMessages(response.agentMessages);

        // Detect new question messages
        response.agentMessages.forEach((msg: any) => {
          if (msg.metadata?.isQuestion && msg.agent_type) {
            const newAgentType = msg.agent_type.replace(/Agent$/i, '').toLowerCase();
            addAgentQuestion(newAgentType, {
              id: msg.id,
              role: 'agent',
              content: msg.content,
              timestamp: msg.created_at,
              messageId: msg.id,
            });
          }
        });

        // Track activity and refresh project data
        if (user && currentProject) {
          trackActivity(user.id, currentProject.id);

          // Refresh project data to update session tracking panel
          try {
            const { projectsApi } = await import('../services/api');
            const projectsResponse = await projectsApi.getByUserId(user.id);
            if (projectsResponse.success) {
              const updatedProject = projectsResponse.projects.find(p => p.id === currentProject.id);
              if (updatedProject) {
                const { useProjectStore } = await import('../store/projectStore');
                useProjectStore.getState().setCurrentProject(updatedProject);
              }
            }
          } catch (err) {
            console.error('Failed to refresh project data:', err);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send agent response:', error);
      alert('Failed to send your response. Please try again.');
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select or create a project to start brainstorming
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto">
      {/* Session Controls - Start/End Session Buttons and History Button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => setShowHistoryModal(true)}
          className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
            isDarkMode
              ? 'glass-dark-subtle hover:bg-white/20 text-white'
              : 'glass-subtle hover:bg-gray-300 text-gray-800'
          }`}
        >
          <History size={18} />
          <span>Session History</span>
        </button>


        <SessionControls
          onSessionStart={() => setIsSessionActive(true)}
          onSessionEnd={() => setIsSessionActive(false)}
        />

        <div className="w-36" /> {/* Spacer for centering */}
      </div>

      {/* Session Summary Modal */}
      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onStartSession={() => setIsSessionActive(true)}
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        projectId={currentProject?.id || ''}
      />

      {/* 2-Column Layout: Chat + Session Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface - Takes 2/3 width on large screens */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`lg:col-span-2 ${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl shadow-glass h-[calc(100vh-20rem)] flex flex-col`}
        >
        {/* Chat Header */}
        <div className="p-6 border-b border-green-metallic/20">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {currentProject.title}
          </h2>
          {currentProject.description && (
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentProject.description}
            </p>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <AnimatePresence>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                isDarkMode={isDarkMode}
              />
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2"
            >
              <div className={`${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} rounded-full px-4 py-2`}>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-metallic rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-green-metallic rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-green-metallic rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-green-metallic/20">
          <div className="flex items-end space-x-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className={`p-3 rounded-xl ${
                isDarkMode ? 'glass-dark-subtle hover:bg-white/20' : 'glass-subtle hover:bg-gray-300'
              } transition-all hover-lift`}
              title="Upload reference files"
            >
              <Upload size={20} className="text-green-metallic" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isSessionActive ? "Share your ideas..." : "Start a session to begin chatting..."}
                rows={1}
                disabled={isSending || !isSessionActive}
                className={`w-full px-4 py-3 rounded-xl resize-none ${
                  isDarkMode
                    ? 'bg-white/10 text-white placeholder-gray-400'
                    : 'bg-white text-gray-800 placeholder-gray-500'
                } border ${
                  isDarkMode ? 'border-white/20' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-green-metallic/50 ${
                  !isSessionActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending || !isSessionActive}
              className={`p-3 rounded-xl ${
                !inputMessage.trim() || isSending || !isSessionActive
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-metallic hover:bg-green-metallic-dark'
              } text-white transition-all`}
            >
              {isSending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Session Tracking Panel - Takes 1/3 width on large screens */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-1"
      >
        <SessionTrackingPanel />
      </motion.div>
    </div>


      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div
                className={`${
                  isDarkMode ? 'glass-dark' : 'glass'
                } rounded-3xl p-8 max-w-2xl w-full shadow-glass max-h-[80vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Upload References
                  </h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Upload Component */}
                <ReferenceUpload />

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Agent Bubbles */}
      <FloatingAgentBubbles onBubbleClick={handleBubbleClick} />

      {/* Agent Chat Windows */}
      {Object.keys(agentWindows)
        .filter((agentType) => agentWindows[agentType].state === 'open')
        .map((agentType, index) => (
          <AgentChatWindow
            key={agentType}
            agentType={agentType}
            windowIndex={index}
            onClose={() => closeAgentWindow(agentType)}
            onMinimize={() => minimizeAgentWindow(agentType)}
            onSendMessage={handleAgentMessageSend}
          />
        ))}
    </div>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: any;
  isDarkMode: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDarkMode }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-green-metallic'
            : isDarkMode
            ? 'bg-white/10'
            : 'bg-gray-200'
        }`}>
          {isUser ? (
            <UserIcon size={16} className="text-white" />
          ) : (
            <Bot size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1">
          {/* Agent Name */}
          {!isUser && message.agent_type && (
            <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {message.agent_type.replace(/Agent$/, '')}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-green-metallic text-white'
                : isDarkMode
                ? 'bg-white/10 text-gray-100'
                : 'bg-white text-gray-800'
            } ${!isUser && 'border'} ${
              isDarkMode ? 'border-white/10' : 'border-gray-200'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Timestamp */}
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {format(new Date(message.created_at), 'h:mm a')}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
