import React, { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Loader2 } from 'lucide-react';
import type { Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isDarkMode: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isTyping, 
  isDarkMode,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force = false) => {
    if (force) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // Only auto-scroll if user is near the bottom (within 100px)
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Auto-scroll on new messages (only if user is already near bottom)
  useEffect(() => {
    const messageCountChanged = messages.length > prevMessageCountRef.current;

    if (messageCountChanged || isTyping) {
      scrollToBottom();
    }

    prevMessageCountRef.current = messages.length;
  }, [messages.length, isTyping]);

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('[ChatMessages] Load more trigger visible, loading more messages...');
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onLoadMore, hasMore, isLoadingMore]);

  // Separate messages into "old" (non-animated) and "recent" (animated)
  const recentMessageCount = 5;
  const oldMessages = messages.slice(0, -recentMessageCount);
  const recentMessages = messages.slice(-recentMessageCount);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin">
      {/* Load More Trigger (at top) */}
      {hasMore && (
        <div ref={loadMoreTriggerRef} className="h-4 flex items-center justify-center mb-4">
          {isLoadingMore && (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Loader2 className="animate-spin" size={16} />
              Loading older messages...
            </div>
          )}
        </div>
      )}

      {/* Old Messages (no animation for performance) */}
      <div className="space-y-4">
        {oldMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isDarkMode={isDarkMode}
            animate={false}
          />
        ))}
      </div>

      {/* Recent Messages (animated) */}
      <AnimatePresence>
        <div className="space-y-4 mt-4">
          {recentMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble
                message={message}
                isDarkMode={isDarkMode}
                animate={true}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator isDarkMode={isDarkMode} />}

      <div ref={messagesEndRef} />
    </div>
  );
};
