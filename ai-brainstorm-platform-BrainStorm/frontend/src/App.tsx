import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Homepage } from './pages/Homepage';
import { Dashboard } from './pages/Dashboard';
import { ChatPage } from './pages/ChatPage';
import { ConversationalSandbox } from './pages/ConversationalSandbox';
import { AgentsPage } from './pages/AgentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectIntelligenceHub } from './pages/ProjectIntelligenceHub';
import ResearchHubPage from './pages/ResearchHubPage';
import { LoginPage } from './pages/LoginPage';
import { CreateProjectModal } from './components/modals/CreateProjectModal';
import { SessionSummary } from './components/SessionManager';
import { UniversalSearch } from './components/UniversalSearch';
import { ToastContainer } from './hooks/useToast';
import { useThemeStore } from './store/themeStore';
import { useUserStore } from './store/userStore';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isDarkMode } = useThemeStore();
  const { initializeAuth, isLoading, isAuthenticated } = useUserStore();

  useEffect(() => {
    // Initialize authentication on app startup
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Apply dark mode class to HTML element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <SessionSummary className="mb-6" />
                <ChatPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sandbox"
          element={
            <ProtectedRoute>
              <Layout>
                <ConversationalSandbox />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <Layout>
                <AgentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/intelligence"
          element={
            <ProtectedRoute>
              <Layout>
                <SessionSummary className="mb-6" />
                <ProjectIntelligenceHub />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/research"
          element={
            <ProtectedRoute>
              <Layout>
                <ResearchHubPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Components - Only shown when authenticated */}
      {isAuthenticated && (
        <>
          <CreateProjectModal />
          <UniversalSearch />
          <ToastContainer />
        </>
      )}
    </Router>
  );
}

export default App;
