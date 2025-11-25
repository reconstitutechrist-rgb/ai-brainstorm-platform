import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useSessionStore } from "../../store/sessionStore";
import { TrackingPanel } from "../chat";
import { SessionSummaryModal } from "../SessionSummaryModal";
import { SessionHistoryModal } from "../SessionHistoryModal";
import { SessionTrackingPanel } from "../SessionTrackingPanel";

interface SessionControllerProps {
  isDarkMode: boolean;
  onHistoryClick?: () => void;
}

/**
 * SessionController - Handles all session-related functionality
 *
 * Responsibilities:
 * - Auto-start session when project loads
 * - Show session summary modal after session ends
 * - Manage session history modal
 * - Provide session tracking panel UI
 */
export const SessionController: React.FC<SessionControllerProps> = ({
  isDarkMode,
  onHistoryClick,
}) => {
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const sessionSummary = useSessionStore((state) => state.sessionSummary);
  const startSession = useSessionStore((state) => state.startSession);

  // Local state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const hasShownSummaryRef = useRef(false);

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
  }, [currentProject?.id]);

  // Auto-start session
  useEffect(() => {
    if (currentProject && user) {
      console.log(
        "[SessionController] Auto-starting session for project:",
        currentProject.id
      );
      startSession(user.id, currentProject.id);
    }
  }, [currentProject?.id, user?.id, currentProject, user, startSession]);

  const handleHistoryClick = () => {
    if (onHistoryClick) {
      onHistoryClick();
    } else {
      setShowHistoryModal(true);
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <>
      {/* Session tracking panel */}
      <TrackingPanel isDarkMode={isDarkMode}>
        <SessionTrackingPanel />
      </TrackingPanel>

      {/* Session Summary Modal */}
      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onStartSession={() => {}}
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        projectId={currentProject.id}
      />
    </>
  );
};

// Export hook to access history modal from parent
export const useSessionController = () => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  return {
    showHistoryModal,
    openHistoryModal: () => setShowHistoryModal(true),
    closeHistoryModal: () => setShowHistoryModal(false),
  };
};
