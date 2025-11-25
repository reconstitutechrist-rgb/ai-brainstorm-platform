import React, { useState, useEffect } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useChatStore } from "../../store/chatStore";
import { projectsApi } from "../../services/api";
import { SuggestionsToggleButton } from "../SuggestionsToggleButton";
import { SuggestionsSidePanel } from "../SuggestionsSidePanel";

/**
 * SuggestionsController - Handles AI suggestions panel functionality
 *
 * Responsibilities:
 * - Load and track suggestion count
 * - Manage suggestions panel open/close state
 * - Auto-refresh suggestions periodically and on new messages
 */
export const SuggestionsController: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const { messages } = useChatStore();

  // Local state
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);

  // Load suggestion count when project changes
  useEffect(() => {
    let isMounted = true;

    const loadSuggestionCount = async () => {
      if (currentProject && user) {
        try {
          const response = await projectsApi.getSuggestions(
            currentProject.id,
            user.id
          );

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
  }, [currentProject?.id, user?.id, currentProject, user]);

  // Reload suggestions on new messages
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
  }, [messages.length, currentProject?.id, user?.id, currentProject, user]);

  return (
    <>
      {/* Suggestions Toggle Button - Always visible when panel closed */}
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
    </>
  );
};
