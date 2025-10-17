import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isDarkMode: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDarkMode }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-green-metallic'
            : isDarkMode
            ? 'bg-white/10'
            : 'bg-gray-200'
        }`}>
          {isUser ? (
            <UserIcon size={16} className="text-white" />
          ) : (
            <Bot size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1">
          {/* Agent Name */}
          {!isUser && message.metadata?.agent && (
            <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {message.metadata.agent.replace(/Agent$/, '')}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-green-metallic text-white'
                : isDarkMode
                ? 'bg-white/10 text-gray-100'
                : 'bg-white text-gray-800'
            } ${!isUser && 'border'} ${
              isDarkMode ? 'border-white/10' : 'border-gray-200'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Timestamp */}
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {format(new Date(message.created_at), 'h:mm a')}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
