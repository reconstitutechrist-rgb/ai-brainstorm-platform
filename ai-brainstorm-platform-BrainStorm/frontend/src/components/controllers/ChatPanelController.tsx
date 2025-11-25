import React, { useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useSessionStore } from "../../store/sessionStore";
import { useChat, useMessageLoader } from "../../hooks";
import { showToast } from "../../utils/toast";
import {
  ChatPanel,
  ChatHeader,
  ChatMessages,
  ChatInput,
  UploadModal,
} from "../chat";

interface ChatPanelControllerProps {
  isDarkMode: boolean;
}

/**
 * ChatPanelController - Handles all chat-related functionality
 *
 * Responsibilities:
 * - Message display and infinite scroll loading
 * - User input and message sending
 * - Typing indicator state
 * - File upload modal
 * - Inactivity timer reset on user activity
 */
export const ChatPanelController: React.FC<ChatPanelControllerProps> = ({
  isDarkMode,
}) => {
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const { messages, isTyping } = useChatStore();
  const resetInactivityTimer = useSessionStore(
    (state) => state.resetInactivityTimer
  );

  // Local state
  const [inputMessage, setInputMessage] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Custom hooks
  const { sendMessage, isSending } = useChat(currentProject?.id);
  const { loadMoreMessages, isLoading, hasMore } = useMessageLoader(
    currentProject?.id
  );

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

  if (!currentProject) {
    return null;
  }

  return (
    <>
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
          isSessionActive={true}
          isDarkMode={isDarkMode}
        />
      </ChatPanel>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        isDarkMode={isDarkMode}
      />
    </>
  );
};
