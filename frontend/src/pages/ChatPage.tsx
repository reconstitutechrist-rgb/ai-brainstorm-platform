import React, { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';
import { useSessionStore } from '../store/sessionStore';
import { useAgentStore } from '../store/agentStore';
import { useChat, useMessageLoader } from '../hooks';
import '../styles/homepage.css';
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
import { SuggestionsSidePanel } from '../components/SuggestionsSidePanel';
import { SuggestionsToggleButton } from '../components/SuggestionsToggleButton';
import { useCardCapacity } from '../hooks/useCardCapacity';
import { useArchive } from '../hooks/useArchive';
import { useMemo } from 'react';
import { projectsApi, sessionsApi } from '../services/api';

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
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const hasShownSummaryRef = useRef(false);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  // Debug: Log current project when it changes
  useEffect(() => {
    if (currentProject) {
      console.log('[ChatPage] Current project updated:', {
        id: currentProject.id,
        title: currentProject.title,
        itemsCount: currentProject.items?.length || 0,
        decidedCount: currentProject.items?.filter(i => i.state === 'decided').length || 0,
        exploringCount: currentProject.items?.filter(i => i.state === 'exploring').length || 0,
      });
    } else {
      console.log('[ChatPage] No current project');
    }
  }, [currentProject]);

  // Custom hooks
  const { sendMessage, isSending } = useChat(currentProject?.id);
  useMessageLoader(currentProject?.id);

  // Canvas-specific hooks
  const projectItems = currentProject?.items || [];

  // Get active items (decided + exploring, non-archived)
  const activeItems = useMemo(() => {
    const filtered = projectItems.filter(
      item => (item.state === 'decided' || item.state === 'exploring') && !item.isArchived
    );
    console.log('[ChatPage] Active items for canvas:', {
      totalProjectItems: projectItems.length,
      activeItemsCount: filtered.length,
      decidedCount: projectItems.filter(i => i.state === 'decided').length,
      exploringCount: projectItems.filter(i => i.state === 'exploring').length,
      archivedCount: projectItems.filter(i => i.isArchived).length,
    });
    return filtered;
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

  // Load suggestion count when project changes
  useEffect(() => {
    const loadSuggestionCount = async () => {
      if (currentProject && user) {
        try {
          const response = await projectsApi.getSuggestions(currentProject.id);
          if (response.success && response.suggestions) {
            setSuggestionCount(response.suggestions.length);
          }
        } catch (error) {
          console.error('Failed to load suggestion count:', error);
        }
      }
    };

    loadSuggestionCount();
    // Refresh suggestion count every 30 seconds
    const interval = setInterval(loadSuggestionCount, 30000);
    return () => clearInterval(interval);
  }, [currentProject, user, messages]);

  // Auto-start and auto-end sessions
  useEffect(() => {
    let sessionStarted = false;

    const startSession = async () => {
      if (currentProject && user) {
        try {
          console.log('[ChatPage] Starting session for project:', currentProject.id);
          const response = await sessionsApi.startSession(user.id, currentProject.id);
          if (response.success) {
            sessionStarted = true;
            console.log('[ChatPage] Session started successfully:', response.data);
          }
        } catch (error) {
          console.error('[ChatPage] Failed to start session:', error);
        }
      }
    };

    const endSession = async () => {
      if (sessionStarted && currentProject && user) {
        try {
          console.log('[ChatPage] Ending session for project:', currentProject.id);
          await sessionsApi.endSession(user.id, currentProject.id);
          console.log('[ChatPage] Session ended successfully');
        } catch (error) {
          console.error('[ChatPage] Failed to end session:', error);
        }
      }
    };

    // Start session when component mounts or project changes
    startSession();

    // End session on unmount or when project changes
    return () => {
      endSession();
    };
  }, [currentProject?.id, user?.id]);

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
    <div className="min-h-screen max-w-[1800px] mx-auto">
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

      {/* Suggestions Toggle Button - Always visible */}
      {!isSuggestionsPanelOpen && (
        <SuggestionsToggleButton
          onClick={() => setIsSuggestionsPanelOpen(true)}
          suggestionCount={suggestionCount}
          hasNewSuggestions={suggestionCount > 0}
        />
      )}

      {/* Suggestions Side Panel */}
      <SuggestionsSidePanel
        isOpen={isSuggestionsPanelOpen}
        onClose={() => setIsSuggestionsPanelOpen(false)}
      />
    </div>
  );
};
