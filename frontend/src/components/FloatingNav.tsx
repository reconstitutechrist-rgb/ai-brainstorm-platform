import React, { useState } from 'react';
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
  Globe,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
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
  { id: 'research', label: 'Research Hub', icon: <Search size={20} />, path: '/research' },
  { id: 'intelligence', label: 'Intelligence', icon: <Database size={20} />, path: '/intelligence' },
  { id: 'agents', label: 'Agents', icon: <Users size={20} />, path: '/agents' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export const FloatingNav: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { isDarkMode } = useThemeStore();
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = navItems.find(item => item.path === location.pathname)?.id || 'projects';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{
        top: 0,
        left: 0,
        right: window.innerWidth - (isExpanded ? 240 : 80),
        bottom: window.innerHeight - 500,
      }}
      onDragEnd={(_e, info) => {
        setPosition({ x: info.point.x, y: info.point.y });
      }}
      whileDrag={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 255, 170, 0.6)' }}
      className="fixed z-50 glass-card rounded-2xl p-4 cursor-grab active:cursor-grabbing select-none"
      style={{
        width: isExpanded ? '240px' : '80px',
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {/* Header with collapse button */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#00ffaa]/20">
        <div className="flex items-center space-x-2">
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-lg font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              AI Brainstorm
            </motion.span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg hover:bg-green-metallic/10 ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
              activeItem === item.id
                ? 'bg-gradient-to-r from-[#00ffaa] to-[#00cc88] text-[#0a1f1a] shadow-md shadow-[#00ffaa]/30 font-semibold'
                : isDarkMode
                ? 'text-gray-300 hover:bg-white/10'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile at Bottom */}
      <div className="mt-4 pt-4 border-t border-[#00ffaa]/20">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl ${
            isDarkMode
              ? 'text-gray-300 hover:bg-white/10'
              : 'text-gray-700 hover:bg-green-metallic/10'
          }`}
        >
          <User size={20} />
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium"
            >
              {user?.name || user?.email || 'Profile'}
            </motion.span>
          )}
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
              {isExpanded && user?.email && (
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
                {isExpanded && (
                  <span className="text-sm font-medium">Sign Out</span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drag Handle Indicator */}
      <div className="mt-3 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 rounded-full bg-[#00ffaa]/40" />
      </div>
    </motion.div>
  );
};
