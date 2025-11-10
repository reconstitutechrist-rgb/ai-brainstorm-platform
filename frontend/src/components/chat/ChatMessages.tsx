import React, { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isDarkMode: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isTyping, isDarkMode }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  const scrollToBottom = () => {
    // Only scroll the chat container, not the whole page
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    // Only scroll if new messages were added or typing indicator appeared
    const messageCountChanged = messages.length > prevMessageCountRef.current;

    if (messageCountChanged || isTyping) {
      scrollToBottom();
    }

    prevMessageCountRef.current = messages.length;
  }, [messages.length, isTyping]);

  return (
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
      {isTyping && <TypingIndicator isDarkMode={isDarkMode} />}

      <div ref={messagesEndRef} />
    </div>
  );
};
