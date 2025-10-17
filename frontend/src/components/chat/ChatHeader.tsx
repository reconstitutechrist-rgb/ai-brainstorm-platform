import React from 'react';

interface ChatHeaderProps {
  title: string;
  description?: string;
  isDarkMode: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ title, description, isDarkMode }) => {
  return (
    <div className="p-6 border-b border-green-metallic/20">
      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        {title}
      </h2>
      {description && (
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
      )}
    </div>
  );
};
