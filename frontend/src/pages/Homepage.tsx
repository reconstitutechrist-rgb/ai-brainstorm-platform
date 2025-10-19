import React, { useEffect } from 'react';
import { HeroSection } from '../components/homepage/HeroSection';
import { FeatureShowcase } from '../components/homepage/FeatureShowcase';
import { AgentShowcase } from '../components/homepage/AgentShowcase';
import { WorkflowVisualization } from '../components/homepage/WorkflowVisualization';
import { CapabilitiesGrid } from '../components/homepage/CapabilitiesGrid';
import { StatsSection } from '../components/homepage/StatsSection';
import { YourProjects } from '../components/homepage/YourProjects';
import { FooterCTA } from '../components/homepage/FooterCTA';
import '../styles/homepage.css';

export const Homepage: React.FC = () => {
  // Import homepage styles
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Feature Showcase - 4 Main Features */}
      <FeatureShowcase />

      {/* Agent Showcase - 8 Agents Grid */}
      <AgentShowcase />

      {/* Workflow Visualization - How it Works */}
      <WorkflowVisualization />

      {/* Capabilities Grid - 9 Capabilities */}
      <CapabilitiesGrid />

      {/* Stats Section - Numbers & Zero Assumptions */}
      <StatsSection />

      {/* Your Projects - Recent Projects (Conditional - if logged in) */}
      <YourProjects />

      {/* Footer CTA - Final Call to Action */}
      <FooterCTA />
    </div>
  );
};
