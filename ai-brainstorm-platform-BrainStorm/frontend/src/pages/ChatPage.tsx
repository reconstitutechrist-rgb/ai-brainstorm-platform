import React, { useState, useEffect } from "react";
import { useThemeStore } from "../store/themeStore";
import { useUserStore } from "../store/userStore";
import { useProjectStore } from "../store/projectStore";
import { useRealtimeUpdates } from "../hooks";
import "../styles/homepage.css";
import { ChatPageHeader, ChatContainer } from "../components/chat";
import { SessionHistoryModal } from "../components/SessionHistoryModal";
import {
  ChatPanelController,
  CanvasPanelController,
  AgentController,
  SessionController,
  SuggestionsController,
} from "../components/controllers";

/**
 * ChatPage - Main brainstorming page
 *
 * This component orchestrates the various controllers:
 * - ChatPanelController: Chat messages and input
 * - CanvasPanelController: Visual canvas and card management
 * - AgentController: Agent windows and questions
 * - SessionController: Session tracking and history
 * - SuggestionsController: AI suggestions panel
 *
 * Each controller is self-contained and manages its own state,
 * reducing this page from ~785 lines to ~100 lines.
 */
export const ChatPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { currentProject } = useProjectStore();

  // Session history modal state (needs to be at page level for header access)
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Initialize real-time updates via SharedWorker
  useRealtimeUpdates(currentProject?.id, user?.id);

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
      });
    }
  }, [currentProject]);

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
        onSessionStart={() => {}}
        onSessionEnd={() => {}}
        isDarkMode={isDarkMode}
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
          {/* Chat panel with messages and input */}
          <ChatPanelController isDarkMode={isDarkMode} />

          {/* Session tracking panel */}
          <SessionController
            isDarkMode={isDarkMode}
            onHistoryClick={() => setShowHistoryModal(true)}
          />
        </div>

        {/* Bottom Row: Canvas (full-width) */}
        <CanvasPanelController isDarkMode={isDarkMode} />
      </ChatContainer>

      {/* Agent windows and question bubbles */}
      <AgentController />

      {/* AI Suggestions panel */}
      <SuggestionsController />
    </div>
  );
};
