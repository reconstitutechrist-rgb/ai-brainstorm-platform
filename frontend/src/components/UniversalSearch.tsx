import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { universalSearch, formatSearchDate, type SearchResult } from '../services/searchService';
import { Search, FileText, MessageSquare, Image, Clock, X, FolderOpen } from 'lucide-react';

interface UniversalSearchProps {
  onNavigate?: (result: SearchResult) => void;
  projectId?: string;
}

export const UniversalSearch: React.FC<UniversalSearchProps> = ({ onNavigate, projectId }) => {
  const { isDarkMode } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Perform search using the search service
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);

    try {
      const searchResults = await universalSearch(searchQuery, {
        limit: 20,
        projectId,
      });

      // Format dates for display
      const formattedResults = searchResults.map((result) => ({
        ...result,
        date: formatSearchDate(result.date),
      }));

      setResults(formattedResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [projectId]);

  // Handle search input with debouncing
  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      // Set new timeout for debouncing (300ms)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    },
    [performSearch]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);

    if (onNavigate) {
      onNavigate(result);
    } else {
      // Default navigation behavior
      console.log('Navigate to:', result);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen size={18} className="text-cyan-400" />;
      case 'message':
        return <MessageSquare size={18} className="text-blue-400" />;
      case 'document':
        return <FileText size={18} className="text-purple-400" />;
      case 'reference':
        return <Image size={18} className="text-orange-400" />;
      default:
        return <FileText size={18} className="text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-[70] px-4"
          >
            <div
              className={`${
                isDarkMode ? 'glass-dark' : 'glass'
              } rounded-2xl shadow-glass-strong overflow-hidden`}
            >
              {/* Search Input */}
              <div className="p-4 border-b border-cyan-primary/20">
                <div className="flex items-center space-x-3">
                  <Search className="text-cyan-primary" size={20} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search projects, messages, documents, references..."
                    className={`flex-1 bg-transparent ${
                      isDarkMode
                        ? 'text-white placeholder-gray-400'
                        : 'text-gray-800 placeholder-gray-500'
                    } focus:outline-none text-lg`}
                  />
                  {query && (
                    <button
                      onClick={handleClear}
                      className={`p-1 rounded ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                      }`}
                      aria-label="Clear search"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {searching ? (
                  <div className="p-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-cyan-primary/30 border-t-cyan-primary rounded-full animate-spin" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left p-4 rounded-xl mb-2 transition-all ${
                          index === selectedIndex
                            ? isDarkMode
                              ? 'bg-cyan-primary/20 border-2 border-cyan-primary'
                              : 'bg-green-50 border-2 border-cyan-primary'
                            : isDarkMode
                            ? 'hover:bg-white/5'
                            : 'hover:bg-white/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4
                                className={`font-semibold truncate ${
                                  isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}
                              >
                                {result.title}
                              </h4>
                              <span
                                className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                                  isDarkMode
                                    ? 'bg-white/10 text-gray-400'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {result.type}
                              </span>
                            </div>
                            <p
                              className={`text-sm line-clamp-2 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}
                            >
                              {result.content}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs">
                              <span
                                className={`flex items-center space-x-1 ${
                                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                                }`}
                              >
                                <Clock size={12} />
                                <span>{result.date}</span>
                              </span>
                              <span className="text-cyan-400">
                                {result.relevance}% match
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : query ? (
                  <div className="p-8 text-center">
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No results found for "{query}"
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Start typing to search across all project data
                    </p>
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Tip: Use Cmd+K (Mac) or Ctrl+K (Windows) to open search anytime
                    </p>
                    <div className="mt-4 text-xs space-y-1">
                      <p className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>
                        <kbd className="px-2 py-1 bg-white/10 rounded">↑↓</kbd> Navigate •{' '}
                        <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> Select •{' '}
                        <kbd className="px-2 py-1 bg-white/10 rounded">Esc</kbd> Close
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};