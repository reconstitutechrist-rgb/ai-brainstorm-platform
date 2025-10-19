import React, { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';
import { useSessionStore } from '../store/sessionStore';
import { useAgentStore } from '../store/agentStore';
import { useChat, useMessageLoader } from '../hooks';
import {
  ChatPageHeader,
  ChatContainer,
  ChatPanel,
  CanvasPanel,
  TrackingPanel,
  ChatHeader,
  ChatMessages,
  ChatInput,
  UploadModal,
} from '../components/chat';
import {
  VisualCanvas,
  CardCounter,
  CapacityWarning,
  ArchiveSidebar,
} from '../components/canvas';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { SessionHistoryModal } from '../components/SessionHistoryModal';
import { SessionTrackingPanel } from '../components/SessionTrackingPanel';
import { FloatingAgentBubbles } from '../components/FloatingAgentBubbles';
import { AgentChatWindow } from '../components/AgentChatWindow';
import { useCardCapacity } from '../hooks/useCardCapacity';
import { useArchive } from '../hooks/useArchive';
import { useMemo } from 'react';

export const ChatPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { currentProject, toggleItemArchive } = useProjectStore();
  const { messages, isTyping } = useChatStore();
  const { sessionSummary } = useSessionStore();
  const {
    agentWindows,
    openAgentWindow,
    closeAgentWindow,
    minimizeAgentWindow,
    addUserResponse,
    markQuestionAnswered,
  } = useAgentStore();

  // Local state
  const [inputMessage, setInputMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const hasShownSummaryRef = useRef(false);

  // Custom hooks
  const { sendMessage, isSending } = useChat(currentProject?.id);
  useMessageLoader(currentProject?.id);

  // Canvas-specific hooks
  const projectItems = currentProject?.items || [];

  // Get active items (decided + exploring, non-archived)
  const activeItems = useMemo(() => {
    return projectItems.filter(
      item => (item.state === 'decided' || item.state === 'exploring') && !item.isArchived
    );
  }, [projectItems]);

  // Archive hook
  const archive = useArchive(projectItems);

  // Capacity tracking
  const capacity = useCardCapacity(activeItems.length, archive.archivedCards.length);

  // Show summary modal when session data loads
  useEffect(() => {
    if (sessionSummary && !hasShownSummaryRef.current && currentProject && user) {
      if (sessionSummary.lastSession && sessionSummary.lastSession !== 'first session') {
        setShowSummaryModal(true);
      }
      hasShownSummaryRef.current = true;
    }
  }, [sessionSummary, currentProject, user]);

  // Reset summary modal flag when project changes
  useEffect(() => {
    hasShownSummaryRef.current = false;
  }, [currentProject?.id]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentProject || isSending || !isSessionActive) {
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage('');

    const result = await sendMessage(messageText);

    if (!result.success && result.error) {
      alert(result.error);
      setInputMessage(messageText); // Re-add message on error
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

    // Send message through the main chat
    const result = await sendMessage(message);

    if (!result.success && result.error) {
      alert('Failed to send your response. Please try again.');
    }
  };

  // Canvas handlers
  const handleArchiveCard = (itemId: string) => {
    toggleItemArchive(itemId);
  };

  const handleRestoreCard = (itemId: string) => {
    if (capacity.canAddCard) {
      toggleItemArchive(itemId);
    } else {
      alert('Canvas is at capacity (30 cards). Please archive some cards before restoring.');
    }
  };

  const handleWarningAction = (action: string) => {
    if (action.includes('Archive')) {
      setIsArchiveOpen(true);
    }
    capacity.dismissWarning();
  };

  // No project selected state
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
      {/* Header with session controls */}
      <ChatPageHeader
        onHistoryClick={() => setShowHistoryModal(true)}
        onSessionStart={() => setIsSessionActive(true)}
        onSessionEnd={() => setIsSessionActive(false)}
        isDarkMode={isDarkMode}
      />

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
        projectId={currentProject.id}
      />

      {/* Main chat container */}
      <ChatContainer>
        {/* Chat panel */}
        <ChatPanel isDarkMode={isDarkMode}>
          <ChatHeader
            title={currentProject.title}
            description={currentProject.description}
            isDarkMode={isDarkMode}
          />

          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            isDarkMode={isDarkMode}
          />

          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={handleSendMessage}
            onUpload={() => setShowUploadModal(true)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            isSending={isSending}
            isSessionActive={isSessionActive}
            isDarkMode={isDarkMode}
          />
        </ChatPanel>

        {/* Canvas panel */}
        <CanvasPanel isDarkMode={isDarkMode}>
          <div className="p-4">
            <CardCounter
              capacityState={capacity.capacityState}
              isDarkMode={isDarkMode}
            />
          </div>
          <VisualCanvas
            items={activeItems}
            isDarkMode={isDarkMode}
            onArchive={handleArchiveCard}
          />
        </CanvasPanel>

        {/* Session tracking panel */}
        <TrackingPanel isDarkMode={isDarkMode}>
          <SessionTrackingPanel />
        </TrackingPanel>
      </ChatContainer>

      {/* Capacity Warning */}
      {capacity.currentWarning && (
        <CapacityWarning
          warning={capacity.currentWarning}
          onDismiss={capacity.dismissWarning}
          onAction={handleWarningAction}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Archive Sidebar */}
      <ArchiveSidebar
        archivedCards={archive.archivedCards}
        filteredCards={archive.filteredCards}
        searchQuery={archive.searchQuery}
        onSearchChange={archive.setSearchQuery}
        filterType={archive.filterType}
        onFilterChange={archive.setFilterType}
        onRestore={handleRestoreCard}
        onDelete={handleArchiveCard}
        isOpen={isArchiveOpen}
        onToggle={() => setIsArchiveOpen(!isArchiveOpen)}
        isDarkMode={isDarkMode}
      />

      {/* Upload modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        isDarkMode={isDarkMode}
      />

      {/* Floating agent bubbles */}
      <FloatingAgentBubbles onBubbleClick={handleBubbleClick} />

      {/* Agent chat windows */}
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
