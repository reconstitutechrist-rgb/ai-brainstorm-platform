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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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
