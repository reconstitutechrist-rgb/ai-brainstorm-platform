import React from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { DarkModeToggle } from './DarkModeToggle';
import { ParticleBackground } from './ParticleBackground';
import { useSidebarStore } from '../store/sidebarStore';
import { useThemeStore } from '../store/themeStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isCollapsed, toggleMobileOpen } = useSidebarStore();
  const { isDarkMode } = useThemeStore();

  return (
    <div className="app-background min-h-screen">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Circuit Pattern Overlay - Subtle futuristic tech aesthetic */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.05,
          backgroundImage: `
            linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px),
            linear-gradient(0deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          backgroundPosition: '-1px -1px'
        }}
      >
        {/* Circuit dots at intersections */}
        <div
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0, 212, 255, 0.6) 2px, transparent 2px)',
            backgroundSize: '100px 100px',
            backgroundPosition: '-1px -1px',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={toggleMobileOpen}
        className={`fixed top-4 left-4 z-50 p-3 rounded-xl md:hidden ${
          isDarkMode ? 'glass-dark' : 'glass'
        } border border-cyan-primary/20 hover:bg-cyan-primary/10 transition-colors`}
        aria-label="Toggle menu"
      >
        <Menu size={24} className={isDarkMode ? 'text-white' : 'text-gray-800'} />
      </button>

      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Main Content with proper spacing for sidebar */}
      <main
        className={`min-h-screen pt-24 px-4 sm:px-6 md:px-8 lg:px-12 pb-8 relative z-10 transition-all duration-300 ${
          isCollapsed ? 'md:pl-[80px]' : 'md:pl-[240px]'
        }`}
      >
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
