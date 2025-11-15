import React, { useRef, useEffect } from 'react';
import { Upload, Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onUpload: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  isSending: boolean;
  isSessionActive: boolean;
  isDarkMode: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onUpload,
  onKeyDown,
  disabled,
  isSending,
  isSessionActive,
  isDarkMode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight (content height) up to maxHeight
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div className="p-6 border-t border-cyan-primary/20">
      <div className="flex items-end space-x-3">
        <button
          onClick={onUpload}
          className={`p-3 rounded-xl ${
            isDarkMode ? 'glass-dark-subtle hover:bg-white/20' : 'glass-subtle hover:bg-gray-300'
          } transition-all hover-lift`}
          title="Upload reference files"
          aria-label="Upload reference files"
        >
          <Upload size={20} className="text-cyan-primary" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isSessionActive ? "Share your ideas..." : "Start a session to begin chatting..."}
            rows={1}
            disabled={disabled || !isSessionActive}
            className={`w-full px-4 py-3 rounded-xl resize-none ${
              isDarkMode
                ? 'bg-white/10 text-white placeholder-gray-400'
                : 'bg-white text-gray-800 placeholder-gray-500'
            } border ${
              isDarkMode ? 'border-white/20' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-cyan-primary/50 ${
              !isSessionActive ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ maxHeight: '120px', overflow: 'auto' }}
            aria-label="Message input"
          />
          {/* Enter key hint */}
          {isSessionActive && (
            <div className={`absolute bottom-1 right-2 text-xs ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            } pointer-events-none`}>
              Shift+Enter for new line
            </div>
          )}
        </div>

        <button
          onClick={onSend}
          disabled={!value.trim() || isSending || !isSessionActive}
          className={`p-3 rounded-xl ${
            !value.trim() || isSending || !isSessionActive
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-cyan-primary hover:bg-cyan-primary-dark'
          } text-white transition-all`}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
