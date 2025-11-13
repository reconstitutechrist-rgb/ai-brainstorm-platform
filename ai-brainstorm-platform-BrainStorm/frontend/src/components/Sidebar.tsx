import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Database,
  Search,
  Home,
  TestTube,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useSidebarStore } from '../store/sidebarStore';
import { useUserStore } from '../store/userStore';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home size={20} />, path: '/home' },
  { id: 'projects', label: 'Projects', icon: <FolderOpen size={20} />, path: '/' },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} />, path: '/chat' },
  { id: 'sandbox', label: 'Sandbox', icon: <TestTube size={20} />, path: '/sandbox' },
  { id: 'research', label: 'Research Hub', icon: <Search size={20} />, path: '/research' },
  { id: 'intelligence', label: 'Intelligence', icon: <Database size={20} />, path: '/intelligence' },
  { id: 'agents', label: 'Agents', icon: <Users size={20} />, path: '/agents' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { isDarkMode } = useThemeStore();
  const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebarStore();
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = navItems.find(item => item.path === location.pathname)?.id || 'projects';

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close mobile sidebar after navigation
    if (isMobile) {
      closeMobile();
    }
  };

  // Determine if sidebar should be shown
  const isVisible = isMobile ? isMobileOpen : true;

  // Calculate width based on collapsed state
  const sidebarWidth = isCollapsed ? '80px' : '240px';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeMobile}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={isMobile ? { x: '-100%' } : false}
        animate={{
          x: isVisible ? 0 : '-100%',
          width: isMobile ? '240px' : sidebarWidth,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className={`fixed left-0 top-0 h-screen z-40 ${
          isDarkMode ? 'glass-dark' : 'glass'
        } border-r border-cyan-primary/20 flex flex-col overflow-hidden`}
        style={{
          width: isMobile ? '240px' : sidebarWidth,
        }}
      >
        {/* Scrollable content */}
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-cyan-primary/20 flex-shrink-0">
            <div className="flex items-center space-x-2 overflow-hidden">
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`text-lg font-bold whitespace-nowrap ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    AI Brainstorm
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse button - hide on mobile */}
            {!isMobile && (
              <button
                onClick={toggleCollapsed}
                className={`p-1.5 rounded-lg hover:bg-cyan-primary/10 flex-shrink-0 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 p-4 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeItem === item.id
                    ? 'bg-gradient-to-r from-cyan-primary to-cyan-secondary text-[#001a33] shadow-md shadow-cyan-primary/30 font-semibold'
                    : isDarkMode
                    ? 'text-gray-300 hover:bg-white/10'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>

          {/* User Profile at Bottom */}
          <div className="p-4 pt-4 border-t border-cyan-primary/20 flex-shrink-0">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-700 hover:bg-cyan-primary/10'
              }`}
            >
              <User size={20} className="flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {user?.name || user?.email || 'Profile'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Profile Menu Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-2 ${
                    isDarkMode ? 'glass-dark' : 'glass'
                  } rounded-xl p-2 border ${
                    isDarkMode ? 'border-white/10' : 'border-gray-200'
                  }`}
                >
                  {!isCollapsed && user?.email && (
                    <div className={`px-3 py-2 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {user.email}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <LogOut size={18} />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">Sign Out</span>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
};
