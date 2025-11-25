import React, { useState, useEffect } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useChatStore } from "../../store/chatStore";
import { useAgentStore } from "../../store/agentStore";
import { useChat } from "../../hooks";
import { showToast } from "../../utils/toast";
import { AgentQuestion, isAgentQuestionArray } from "../../types";
import { FloatingAgentBubbles } from "../FloatingAgentBubbles";
import { AgentChatWindow } from "../AgentChatWindow";
import { AgentQuestionBubble } from "../AgentQuestionBubble";

/**
 * AgentController - Handles all agent-related functionality
 *
 * Responsibilities:
 * - Extract and track questions from agent messages
 * - Manage floating agent bubbles (minimized windows)
 * - Manage full agent chat windows
 * - Handle question answering flow
 * - Track answered vs unanswered questions
 */
export const AgentController: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { user } = useUserStore();
  const { messages } = useChatStore();
  const {
    agentWindows,
    openAgentWindow,
    closeAgentWindow,
    minimizeAgentWindow,
    addUserResponse,
    markQuestionAnswered,
  } = useAgentStore();

  // Local state for question management
  const [agentQuestions, setAgentQuestions] = useState<AgentQuestion[]>([]);
  const [isQuestionBubbleOpen, setIsQuestionBubbleOpen] = useState(false);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(
    new Set()
  );

  // Custom hooks
  const { sendMessage } = useChat(currentProject?.id);

  // Extract and accumulate all agent questions from messages
  useEffect(() => {
    console.log("[AgentController] Extracting questions from messages:", {
      totalMessages: messages.length,
      messagesWithMetadata: messages.filter((m) => m.metadata).length,
      messagesWithQuestions: messages.filter(
        (m) => m.metadata?.agentQuestions?.length > 0
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
          `[AgentController] Found ${questions.length} questions in message ${msg.id}:`,
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
            timestamp: msg.created_at as any,
            answered: answeredQuestionIds.has(questionId),
          });
        });
      }
    });

    console.log("[AgentController] Total questions extracted:", {
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
        "[AgentController] Auto-opening question bubble -",
        allQuestions.filter((q) => !q.answered).length,
        "unanswered questions"
      );
      setIsQuestionBubbleOpen(true);
    }
  }, [messages, answeredQuestionIds]);

  // Handlers
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

  const unansweredCount = agentQuestions.filter((q) => !q.answered).length;

  return (
    <>
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

      {/* Agent Question Bubble - Always accessible */}
      <AgentQuestionBubble
        questions={agentQuestions}
        isOpen={isQuestionBubbleOpen}
        onToggle={() => setIsQuestionBubbleOpen(!isQuestionBubbleOpen)}
        onAnswer={handleAgentQuestionAnswer}
        unansweredCount={unansweredCount}
      />
    </>
  );
};
