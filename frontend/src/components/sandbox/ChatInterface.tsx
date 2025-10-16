import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, Sparkles, HelpCircle, Lightbulb, TrendingUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  conversationMode?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  conversationMode = 'exploration',
}) => {
  const { isDarkMode } = useThemeStore();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    await onSendMessage(message);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { icon: Lightbulb, label: "I'm thinking...", prompt: "I'm thinking about " },
    { icon: HelpCircle, label: "Tell me more", prompt: "Tell me more about " },
    { icon: Sparkles, label: "What if we...", prompt: "What if we " },
    { icon: TrendingUp, label: "Generate ideas", prompt: "Generate some ideas for " },
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleActionClick = (action: any) => {
    if (action.prompt) {
      setInputValue(action.prompt);
      inputRef.current?.focus();
    }
  };

  const getModeInfo = () => {
    const modes: Record<string, { color: string; label: string; description: string }> = {
      exploration: {
        color: 'text-blue-400',
        label: 'Exploring',
        description: 'Open-ended discovery',
      },
      clarification: {
        color: 'text-purple-400',
        label: 'Clarifying',
        description: 'Understanding your needs',
      },
      generation: {
        color: 'text-green-400',
        label: 'Generating',
        description: 'Creating concrete ideas',
      },
      refinement: {
        color: 'text-orange-400',
        label: 'Refining',
        description: 'Deep dive on specific idea',
      },
      comparison: {
        color: 'text-pink-400',
        label: 'Comparing',
        description: 'Evaluating options',
      },
      validation: {
        color: 'text-yellow-400',
        label: 'Validating',
        description: 'Testing assumptions',
      },
      implementation: {
        color: 'text-cyan-400',
        label: 'Planning',
        description: 'Creating action plan',
      },
    };

    return modes[conversationMode] || modes.exploration;
  };

  const modeInfo = getModeInfo();

  return (
    <div className="flex flex-col h-full">
      {/* Mode Indicator */}
      <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${modeInfo.color} animate-pulse`} />
            <span className={`text-sm font-medium ${modeInfo.color}`}>{modeInfo.label}</span>
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {modeInfo.description}
            </span>
          </div>
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onActionClick={handleActionClick}
            />
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div
              className={`flex items-center space-x-3 px-5 py-3 rounded-2xl ${
                isDarkMode ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              <Loader2 size={16} className="animate-spin text-green-metallic" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                AI is thinking...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {!isFocused && messages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-2"
        >
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                  isDarkMode
                    ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <prompt.icon size={12} />
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div
        className={`px-6 py-4 border-t ${
          isDarkMode ? 'border-white/10' : 'border-gray-200'
        } ${isFocused ? 'bg-white/5' : ''}`}
      >
        <div
          className={`relative rounded-2xl transition-all ${
            isFocused
              ? 'ring-2 ring-green-metallic/50'
              : isDarkMode
              ? 'border border-white/20'
              : 'border border-gray-300'
          }`}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What are you considering or exploring today?"
            disabled={isLoading}
            rows={1}
            className={`w-full px-5 py-3 pr-12 rounded-2xl resize-none focus:outline-none ${
              isDarkMode
                ? 'bg-white/10 text-white placeholder-gray-500'
                : 'bg-white text-gray-800 placeholder-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ maxHeight: '150px', minHeight: '48px' }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all ${
              inputValue.trim() && !isLoading
                ? 'bg-green-metallic hover:bg-green-metallic-dark text-white'
                : isDarkMode
                ? 'bg-white/10 text-gray-600'
                : 'bg-gray-200 text-gray-400'
            } disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Helper Text */}
        <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white/10">Shift + Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};
