import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import UnifiedResearchHub from '../components/UnifiedResearchHub';
import '../styles/homepage.css';

const ResearchHubPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Research Hub
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Conversational AI research assistant - search, analyze, and generate documents
        </p>
      </div>

      {/* Unified Research Interface */}
      <UnifiedResearchHub />
    </div>
  );
};

export default ResearchHubPage;
