import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Send } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAgentStore } from '../store/agentStore';
import { getAgentConfig } from '../utils/agentConfig';

interface AgentChatWindowProps {
  agentType: string;
  windowIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (agentType: string, message: string) => void;
}

export const AgentChatWindow: React.FC<AgentChatWindowProps> = ({
  agentType,
  windowIndex,
  onClose,
  onMinimize,
  onSendMessage,
}) => {
  const { isDarkMode } = useThemeStore();
  const { agentWindows } = useAgentStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const window = agentWindows[agentType];
  const config = getAgentConfig(agentType);
  const Icon = config?.icon;

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [window?.thread]);

  useEffect(() => {
    // Auto-focus textarea when window opens
    if (window?.state === 'open') {
      textareaRef.current?.focus();
    }
  }, [window?.state]);

  const handleSend = () => {
    if (!message.trim()) return;

    onSendMessage(agentType, message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!window || window.state !== 'open') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed right-20 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col ${
          isDarkMode ? 'bg-gray-900/95 backdrop-blur-lg' : 'bg-white/95 backdrop-blur-lg'
        }`}
        style={{
          width: '360px',
          height: '500px',
          top: `${80 + windowIndex * 60}px`,
          border: `2px solid ${config?.color || '#6B7280'}`,
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{
            backgroundColor: `${config?.color}20`,
            borderBottomColor: config?.color,
          }}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: `${config?.color}30` }}
              >
                <Icon size={20} style={{ color: config?.color }} />
              </div>
            )}
            <div>
              <h3
                className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
              >
                {config?.displayName || agentType}
              </h3>
              <p className="text-xs text-gray-500">{config?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-white/10 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Minimize"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-white/10 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Greeting Message */}
          {window.thread.length === 0 && config?.greeting && (
            <div className="flex items-start gap-2">
              <div
                className="p-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: `${config.color}20` }}
              >
                {Icon && <Icon size={16} style={{ color: config.color }} />}
              </div>
              <div
                className={`flex-1 p-3 rounded-lg text-sm ${
                  isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {config.greeting}
              </div>
            </div>
          )}

          {/* Thread Messages */}
          {window.thread.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'agent' && (
                <div
                  className="p-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${config?.color}20` }}
                >
                  {Icon && <Icon size={16} style={{ color: config?.color }} />}
                </div>
              )}
              <div
                className={`flex-1 p-3 rounded-lg text-sm ${
                  msg.role === 'agent'
                    ? isDarkMode
                      ? 'bg-gray-800 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                    : 'bg-green-metallic text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          className={`px-4 py-3 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Respond to ${config?.displayName}...`}
              rows={2}
              className={`flex-1 px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2 text-sm ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-green-metallic'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-green-metallic'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-4 py-2 rounded-lg bg-green-metallic text-white hover:bg-green-metallic/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
