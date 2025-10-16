import React from 'react';
import { FloatingNav } from './FloatingNav';
import { DarkModeToggle } from './DarkModeToggle';
import { ParticleBackground } from './ParticleBackground';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-background min-h-screen">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Main Content with proper spacing and responsive design */}
      <main className="min-h-screen pt-24 px-4 sm:px-6 md:px-8 lg:px-12 pb-8 relative z-10">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
