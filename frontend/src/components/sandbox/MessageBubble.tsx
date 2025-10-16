import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { Bot, User, Lightbulb } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    extractedIdeas?: string[];
    suggestedActions?: Array<{ id: string; label: string; type: string }>;
  };
}

interface MessageBubbleProps {
  message: Message;
  onActionClick?: (action: any) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onActionClick }) => {
  const { isDarkMode } = useThemeStore();
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex ${isAssistant ? 'flex-row' : 'flex-row-reverse'} items-start max-w-[80%] gap-3`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isAssistant
              ? 'bg-green-metallic/20 border-2 border-green-metallic/30'
              : isDarkMode
              ? 'bg-white/10 border-2 border-white/20'
              : 'bg-gray-200 border-2 border-gray-300'
          }`}
        >
          {isAssistant ? (
            <Bot className="text-green-metallic" size={20} />
          ) : (
            <User className={isDarkMode ? 'text-white' : 'text-gray-700'} size={20} />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          <div
            className={`rounded-2xl px-5 py-3 ${
              isAssistant
                ? isDarkMode
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-gray-100 border border-gray-200'
                : 'bg-green-metallic text-white'
            }`}
          >
            {/* Message Text */}
            <div
              className={`text-sm whitespace-pre-wrap leading-relaxed ${
                isAssistant ? (isDarkMode ? 'text-white' : 'text-gray-800') : 'text-white'
              }`}
            >
              {message.content}
            </div>

            {/* Extracted Ideas Indicator */}
            {isAssistant && message.metadata?.extractedIdeas && message.metadata.extractedIdeas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-white/10"
              >
                <div className="flex items-center space-x-2 text-xs">
                  <Lightbulb size={14} className="text-green-metallic" />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {message.metadata.extractedIdeas.length} idea{message.metadata.extractedIdeas.length > 1 ? 's' : ''} extracted
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Suggested Actions */}
          {isAssistant && message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 mt-2 ml-1"
            >
              {message.metadata.suggestedActions.slice(0, 3).map((action) => (
                <button
                  key={action.id}
                  onClick={() => onActionClick?.(action)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    isDarkMode
                      ? 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Timestamp */}
          <div
            className={`text-xs mt-1 ml-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
