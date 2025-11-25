import React, { useState, useEffect, useRef } from "react";
import { CheckSquare, Archive, Trash2 } from "lucide-react";
import { useThemeStore } from "../store/themeStore";
import { useUserStore } from "../store/userStore";
import { useProjectStore } from "../store/projectStore";
import { useChatStore } from "../store/chatStore";
import { useSessionStore } from "../store/sessionStore";
import { useAgentStore } from "../store/agentStore";
import { useChat, useMessageLoader, useRealtimeUpdates } from "../hooks";
import { showToast } from "../utils/toast";
import type { AgentQuestion } from "../types";
import { isAgentQuestionArray } from "../types";
import "../styles/homepage.css";
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
} from "../components/chat";
import {
  VisualCanvas,
  CardCounter,
  CapacityWarning,
  ArchiveSidebar,
} from "../components/canvas";
import { SessionSummaryModal } from "../components/SessionSummaryModal";
import { SessionHistoryModal } from "../components/SessionHistoryModal";
import { SessionTrackingPanel } from "../components/SessionTrackingPanel";
import { FloatingAgentBubbles } from "../components/FloatingAgentBubbles";
import { AgentChatWindow } from "../components/AgentChatWindow";
import { SuggestionsSidePanel } from "../components/SuggestionsSidePanel";
import { SuggestionsToggleButton } from "../components/SuggestionsToggleButton";
import { AgentQuestionBubble } from "../components/AgentQuestionBubble";
import { useCardCapacity } from "../hooks/useCardCapacity";
import { useArchive } from "../hooks/useArchive";
import { useMemo } from "react";
import { projectsApi, canvasApi } from "../services/api";

export const ChatPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const {
    currentProject,
    toggleItemArchive,
    setCurrentProject,
    selectedCardIds,
    selectAllCards,
    clearSelection,
    archiveMultipleItems,
  } = useProjectStore();

  // Initialize real-time updates via SharedWorker (replaces 2s polling)
  useRealtimeUpdates(currentProject?.id, user?.id);
  const { messages, isTyping } = useChatStore();
  // Use selectors to avoid re-rendering when unrelated session state changes
  const sessionSummary = useSessionStore((state) => state.sessionSummary);
  const startSession = useSessionStore((state) => state.startSession);
  const resetInactivityTimer = useSessionStore(
    (state) => state.resetInactivityTimer
  );
  const {
    agentWindows,
    openAgentWindow,
    closeAgentWindow,
    minimizeAgentWindow,
    addUserResponse,
    markQuestionAnswered,
  } = useAgentStore();

  // Local state
  const [inputMessage, setInputMessage] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [agentQuestions, setAgentQuestions] = useState<AgentQuestion[]>([]);
  const [isQuestionBubbleOpen, setIsQuestionBubbleOpen] = useState(false);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [showArchiveAllConfirm, setShowArchiveAllConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const hasShownSummaryRef = useRef(false);
  const hasAttemptedClusteringRef = useRef(false);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add("homepage-background");
    return () => {
      document.body.classList.remove("homepage-background");
    };
  }, []);

  // Debug: Log current project when it changes
  useEffect(() => {
    if (currentProject) {
      console.log("[ChatPage] Current project updated:", {
        id: currentProject.id,
        title: currentProject.title,
        itemsCount: currentProject.items?.length || 0,
        decidedCount:
          currentProject.items?.filter((i) => i.state === "decided").length ||
          0,
        exploringCount:
          currentProject.items?.filter((i) => i.state === "exploring").length ||
          0,
      });
    } else {
      console.log("[ChatPage] No current project");
    }
  }, [currentProject]);

  // Custom hooks
  const { sendMessage, isSending } = useChat(currentProject?.id);
  const { loadMoreMessages, isLoading, hasMore } = useMessageLoader(
    currentProject?.id
  );

  // Canvas-specific hooks
  const projectItems = currentProject?.items || [];

  // Get active items (decided + exploring, non-archived)
  const activeItems = useMemo(() => {
    const filtered = projectItems.filter(
      (item) =>
        (item.state === "decided" || item.state === "exploring") &&
        !item.isArchived
    );
    console.log("[ChatPage] Active items for canvas:", {
      totalProjectItems: projectItems.length,
      activeItemsCount: filtered.length,
      decidedCount: projectItems.filter((i) => i.state === "decided").length,
      exploringCount: projectItems.filter((i) => i.state === "exploring")
        .length,
      archivedCount: projectItems.filter((i) => i.isArchived).length,
    });
    return filtered;
  }, [projectItems]);

  // Archive hook
  const archive = useArchive(projectItems);

  // Capacity tracking
  const capacity = useCardCapacity(
    activeItems.length,
    archive.archivedCards.length
  );

  // Show summary modal when session data loads
  useEffect(() => {
    if (
      sessionSummary &&
      !hasShownSummaryRef.current &&
      currentProject &&
      user
    ) {
      if (
        sessionSummary.lastSession &&
        sessionSummary.lastSession !== "first session"
      ) {
        setShowSummaryModal(true);
      }
      hasShownSummaryRef.current = true;
    }
  }, [sessionSummary, currentProject, user]);

  // Reset summary modal flag when project changes
  useEffect(() => {
    hasShownSummaryRef.current = false;
    hasAttemptedClusteringRef.current = false; // Reset clustering flag too
  }, [currentProject?.id]);

  // Load suggestion count when project changes
  useEffect(() => {
    let isMounted = true;

    const loadSuggestionCount = async () => {
      if (currentProject && user) {
        try {
          // Include userId to filter dismissed suggestions
          const response = await projectsApi.getSuggestions(
            currentProject.id,
            user.id
          );

          // Only update state if still mounted
          if (isMounted && response.success && response.suggestions) {
            setSuggestionCount(response.suggestions.length);
          }
        } catch (error) {
          console.error("Failed to load suggestion count:", error);
        }
      }
    };

    loadSuggestionCount();
    // Refresh suggestion count every 30 seconds
    const interval = setInterval(loadSuggestionCount, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentProject?.id, user?.id]);

  // Separate effect to reload on new messages
  useEffect(() => {
    if (messages.length > 0 && currentProject && user) {
      const timer = setTimeout(() => {
        projectsApi
          .getSuggestions(currentProject.id, user.id)
          .then((response) => {
            if (response.success && response.suggestions) {
              setSuggestionCount(response.suggestions.length);
            }
          })
          .catch((error) =>
            console.error("Failed to load suggestion count:", error)
          );
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [messages.length, currentProject?.id, user?.id]);

  // Auto-cluster canvas when enough cards exist
  useEffect(() => {
    const attemptAutoClustering = async () => {
      if (!currentProject || !user) return;

      const activeCount = activeItems.length;
      const hasClusters =
        currentProject.clusters && currentProject.clusters.length > 0;

      // Skip if already attempted for this project or conditions not met
      if (hasAttemptedClusteringRef.current) return;
      if (activeCount < 12) return; // Early exit - not enough cards yet
      if (hasClusters) return; // Early exit - clusters already exist

      // Trigger clustering
      console.log(
        `[ChatPage] Auto-clustering triggered: ${activeCount} cards detected`
      );
      hasAttemptedClusteringRef.current = true;

      try {
        const result = await canvasApi.autoCluster(currentProject.id, 12);

        if (result.success && result.clustered) {
          console.log(
            `[ChatPage] Auto-clustering completed: ${result.clustersCreated} clusters created`
          );

          // Update project store with clustered data
          if (result.project) {
            setCurrentProject(result.project);
            console.log(
              "[ChatPage] Canvas clustered successfully - project updated"
            );
          }
        } else {
          console.log(`[ChatPage] Auto-clustering skipped: ${result.message}`);
        }
      } catch (error) {
        console.error("[ChatPage] Auto-clustering failed:", error);
      }
    };

    attemptAutoClustering();
  }, [
    activeItems.length,
    currentProject?.id,
    currentProject?.clusters,
    user?.id,
  ]);

  // Extract and accumulate all agent questions from messages
  useEffect(() => {
    // FIX #3: Enhanced logging for question extraction
    console.log("[ChatPage] Extracting questions from messages:", {
      totalMessages: messages.length,
      messagesWithMetadata: messages.filter((m) => m.metadata).length,
      messagesWithQuestions: messages.filter(
        (m) => (m.metadata?.agentQuestions?.length ?? 0) > 0
      ).length,
    });

    // Collect ALL questions from ALL messages (not just latest)
    const allQuestions: AgentQuestion[] = [];

    messages.forEach((msg) => {
      const questions = msg.metadata?.agentQuestions;
      if (
        questions &&
        isAgentQuestionArray(questions) &&
        questions.length > 0
      ) {
        console.log(
          `[ChatPage] ✅ Found ${questions.length} questions in message ${msg.id}:`,
          {
            agent: msg.metadata?.agent,
            questions: questions.map((q) => q.question?.substring(0, 60)),
          }
        );

        questions.forEach((q, qIndex) => {
          // Create unique ID for each question based on message and question index
          const questionId = `${msg.id}-${qIndex}`;
          allQuestions.push({
            ...q,
            id: questionId,
            messageId: msg.id,
            timestamp: msg.created_at as any, // Cast to ISODateString
            answered: answeredQuestionIds.has(questionId),
          });
        });
      }
    });

    console.log("[ChatPage] Total questions extracted:", {
      count: allQuestions.length,
      unanswered: allQuestions.filter((q) => !q.answered).length,
      answered: allQuestions.filter((q) => q.answered).length,
    });

    // Update questions list
    setAgentQuestions(allQuestions);

    // Auto-open bubble if there are new unanswered questions
    const hasNewQuestions = allQuestions.some((q) => !q.answered);
    if (hasNewQuestions && allQuestions.length > 0) {
      console.log(
        "[ChatPage] 🔔 Auto-opening question bubble -",
        allQuestions.filter((q) => !q.answered).length,
        "unanswered questions"
      );
      setIsQuestionBubbleOpen(true);
    }
  }, [messages, answeredQuestionIds]);

  // Auto-start session (reuses existing active session if one exists)
  // Sessions persist across page navigations - backend handles session reuse
  useEffect(() => {
    if (currentProject && user) {
      console.log(
        "[ChatPage] Auto-starting session for project:",
        currentProject.id
      );
      startSession(user.id, currentProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, user?.id]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentProject || isSending) {
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage("");

    // Reset inactivity timer on message send
    if (user && currentProject) {
      resetInactivityTimer(user.id, currentProject.id);
    }

    const result = await sendMessage(messageText);

    if (!result.success && result.error) {
      showToast(result.error, "error");
      setInputMessage(messageText); // Re-add message on error
    }
  };

  const handleInputChange = (value: string) => {
    setInputMessage(value);

    // Reset inactivity timer on typing
    if (user && currentProject) {
      resetInactivityTimer(user.id, currentProject.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBubbleClick = (agentType: string) => {
    openAgentWindow(agentType);
  };

  const handleAgentQuestionAnswer = async (
    questionId: string,
    _question: string,
    answer: string
  ) => {
    // Send the answer as a regular message in the chat
    if (answer.trim() && currentProject) {
      await sendMessage(answer);

      // Mark this question as answered
      setAnsweredQuestionIds((prev) => new Set(prev).add(questionId));

      // Don't close the bubble - keep it accessible for viewing past questions
    }
  };

  const handleAgentMessageSend = async (agentType: string, message: string) => {
    if (!currentProject || !user) return;

    // Add user response to agent thread
    addUserResponse(agentType, {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Mark question as answered
    markQuestionAnswered(agentType);

    // Send message through the main chat
    const result = await sendMessage(message);

    if (!result.success && result.error) {
      showToast("Failed to send your response. Please try again.", "error");
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
      showToast(
        "Canvas is at capacity (30 cards). Please archive some cards before restoring.",
        "info"
      );
    }
  };

  const handleWarningAction = (action: string) => {
    if (action.includes("Archive")) {
      setIsArchiveOpen(true);
    }
    capacity.dismissWarning();
  };

  // Bulk selection and archive handlers
  const handleSelectAll = () => {
    selectAllCards();
  };

  const handleArchiveSelected = async () => {
    if (selectedCardIds.size === 0) return;

    setIsArchiving(true);
    try {
      await archiveMultipleItems(Array.from(selectedCardIds));
      clearSelection();
    } catch (error) {
      console.error("Failed to archive selected cards:", error);
      showToast("Failed to archive selected cards. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveAll = () => {
    if (activeItems.length === 0) return;
    setShowArchiveAllConfirm(true);
  };

  const handleArchiveAllConfirmed = async () => {
    setShowArchiveAllConfirm(false);
    setIsArchiving(true);

    try {
      const allActiveIds = activeItems.map((item) => item.id);
      await archiveMultipleItems(allActiveIds);
      clearSelection();
    } catch (error) {
      console.error("Failed to archive all cards:", error);
      showToast("Failed to archive all cards. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  // No project selected state
  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className={`${
            isDarkMode ? "glass-dark" : "glass"
          } rounded-3xl p-12 text-center shadow-glass`}
        >
          <h2
            className={`text-2xl font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
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
        onSessionStart={() => {}} // Session management is now handled by SessionTrackingPanel
        onSessionEnd={() => {}} // Session management is now handled by SessionTrackingPanel
        isDarkMode={isDarkMode}
      />

      {/* Session Summary Modal */}
      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onStartSession={() => {}} // Session management is now handled by SessionTrackingPanel
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        projectId={currentProject.id}
      />

      {/* Main chat container */}
      <ChatContainer>
        {/* Top Row: Chat + Session Tracking */}
        <div className="flex flex-col lg:flex-row gap-6">
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
              onLoadMore={loadMoreMessages}
              hasMore={hasMore}
              isLoadingMore={isLoading}
            />

            <ChatInput
              value={inputMessage}
              onChange={handleInputChange}
              onSend={handleSendMessage}
              onUpload={() => setShowUploadModal(true)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              isSending={isSending}
              isSessionActive={true} // Sessions are now managed by SessionTrackingPanel
              isDarkMode={isDarkMode}
            />
          </ChatPanel>

          {/* Session tracking panel */}
          <TrackingPanel isDarkMode={isDarkMode}>
            <SessionTrackingPanel />
          </TrackingPanel>
        </div>

        {/* Bottom Row: Canvas (full-width) */}
        <CanvasPanel isDarkMode={isDarkMode}>
          <div className="p-4">
            <CardCounter
              capacityState={capacity.capacityState}
              isDarkMode={isDarkMode}
            />

            {/* Bulk Action Buttons */}
            {activeItems.length > 0 && (
              <div className="flex items-center justify-between gap-3 mt-4 mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    disabled={
                      isArchiving || selectedCardIds.size === activeItems.length
                    }
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                      isDarkMode
                        ? "bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-300 hover:from-blue-600/40 hover:to-cyan-600/40 border border-blue-500/40"
                        : "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 border border-blue-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <CheckSquare size={16} />
                    Select All ({activeItems.length})
                  </button>

                  {selectedCardIds.size > 0 && (
                    <button
                      onClick={handleArchiveSelected}
                      disabled={isArchiving}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                        isDarkMode
                          ? "bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-emerald-300 hover:from-green-600/40 hover:to-emerald-600/40 border border-green-500/40"
                          : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 border border-green-300"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Archive size={16} />
                      {isArchiving
                        ? "Archiving..."
                        : `Archive Selected (${selectedCardIds.size})`}
                    </button>
                  )}
                </div>

                <button
                  onClick={handleArchiveAll}
                  disabled={isArchiving}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                    isDarkMode
                      ? "bg-gradient-to-r from-red-600/30 to-rose-600/30 text-red-300 hover:from-red-600/40 hover:to-rose-600/40 border border-red-500/40"
                      : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-200 hover:to-rose-200 border border-red-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Trash2 size={16} />
                  Archive All
                </button>
              </div>
            )}
          </div>
          <VisualCanvas
            items={activeItems}
            isDarkMode={isDarkMode}
            onArchive={handleArchiveCard}
          />
        </CanvasPanel>
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

      {/* Archive All Confirmation Modal */}
      {showArchiveAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className={`max-w-md w-full mx-4 p-6 rounded-2xl shadow-2xl ${
              isDarkMode
                ? "bg-gray-900 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Archive All Cards?
            </h3>
            <p
              className={`mb-6 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              This will archive all {activeItems.length} cards currently on the
              canvas. You can restore them from the archive later. Are you sure
              you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveAllConfirm(false)}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAllConfirmed}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  isDarkMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating agent bubbles */}
      <FloatingAgentBubbles onBubbleClick={handleBubbleClick} />

      {/* Agent chat windows */}
      {Object.keys(agentWindows)
        .filter((agentType) => agentWindows[agentType].state === "open")
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

      {/* Agent Question Bubble - Always accessible */}
      <AgentQuestionBubble
        questions={agentQuestions}
        isOpen={isQuestionBubbleOpen}
        onToggle={() => setIsQuestionBubbleOpen(!isQuestionBubbleOpen)}
        onAnswer={handleAgentQuestionAnswer}
        unansweredCount={agentQuestions.filter((q) => !q.answered).length}
      />
    </div>
  );
};
