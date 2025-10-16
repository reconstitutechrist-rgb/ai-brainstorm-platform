/**
 * UniversalSearch Component - Usage Examples
 *
 * This component provides a powerful search interface across all project data
 * including projects, messages, documents, and references.
 */

import { UniversalSearch } from './UniversalSearch';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '../services/searchService';

/**
 * Example 1: Basic Usage
 * Add the component to your app layout for global search
 */
export function BasicExample() {
  return (
    <div>
      <UniversalSearch />
      {/* The search modal will open with Cmd/Ctrl + K */}
    </div>
  );
}

/**
 * Example 2: With Custom Navigation
 * Handle navigation when users click on search results
 */
export function WithNavigationExample() {
  const navigate = useNavigate();

  const handleNavigate = (result: SearchResult) => {
    switch (result.type) {
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'message':
        navigate(`/projects/${result.projectId}#message-${result.id}`);
        break;
      case 'document':
        navigate(`/projects/${result.projectId}/documents/${result.id}`);
        break;
      case 'reference':
        navigate(`/projects/${result.projectId}/references/${result.id}`);
        break;
    }
  };

  return <UniversalSearch onNavigate={handleNavigate} />;
}

/**
 * Example 3: Scoped to a Specific Project
 * Only search within a specific project
 */
export function ProjectScopedExample() {
  const projectId = 'your-project-id';

  return <UniversalSearch projectId={projectId} />;
}

/**
 * Example 4: Integrated into App Layout
 * Typical integration pattern for a full app
 */
export function AppLayoutExample() {
  const navigate = useNavigate();

  const handleNavigate = (result: SearchResult) => {
    // Your custom navigation logic
    console.log('Navigating to:', result);
    navigate(`/projects/${result.projectId || result.id}`);
  };

  return (
    <div className="app-container">
      {/* Your app content */}
      <header>
        <h1>My App</h1>
      </header>

      <main>{/* Your main content */}</main>

      {/* Add UniversalSearch - it's hidden by default */}
      <UniversalSearch onNavigate={handleNavigate} />

      <footer>
        <p>Press Cmd/Ctrl + K to search</p>
      </footer>
    </div>
  );
}

/**
 * Keyboard Shortcuts:
 * - Cmd/Ctrl + K: Open search
 * - Escape: Close search
 * - Arrow Up/Down: Navigate results
 * - Enter: Select highlighted result
 *
 * Features:
 * - Searches across projects, messages, documents, and references
 * - Real-time search with 300ms debouncing
 * - Intelligent relevance scoring
 * - Keyboard navigation support
 * - Responsive design with dark/light mode support
 * - Shows match percentage for each result
 * - Displays relative time (e.g., "2 hours ago")
 */
