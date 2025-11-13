import React from 'react';
import { History } from 'lucide-react';

interface ChatPageHeaderProps {
  onHistoryClick: () => void;
  onSessionStart: () => void;
  onSessionEnd: () => void;
  isDarkMode: boolean;
}

export const ChatPageHeader: React.FC<ChatPageHeaderProps> = ({
  onHistoryClick,
  isDarkMode,
}) => {
  return (
    <div className="mb-6 flex justify-start items-center">
      <button
        onClick={onHistoryClick}
        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
          isDarkMode
            ? 'glass-dark-subtle hover:bg-white/20 text-white'
            : 'glass-subtle hover:bg-gray-300 text-gray-800'
        }`}
        aria-label="View session history"
      >
        <History size={18} />
        <span>Session History</span>
      </button>
    </div>
  );
};
