/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ===================================
      // TYPOGRAPHY SCALE (Consistent Hierarchy)
      // ===================================
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px - Labels, captions
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - Body text, descriptions
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px - Default body
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px - Large body
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px - Section headers
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px - Subsection headers
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px - Page titles
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px - Hero text
        '5xl': ['3rem', { lineHeight: '1' }],            // 48px - Large hero
      },

      colors: {
        // ===================================
        // CYAN/BLUE FUTURISTIC THEME (NEW)
        // ===================================
        'cyan-primary': '#00d4ff',         // Bright Cyan - Primary accent
        'cyan-secondary': '#0099ff',       // Blue - Secondary accent
        'cyan-accent': '#00ffff',          // Aqua Cyan - Highlights
        'blue-deep': '#001a33',            // Dark Navy - Deep backgrounds
        'blue-dark': '#0a0e27',            // Dark Blue - Primary dark bg
        'blue-mid': '#1a3a52',             // Mid Blue - Gradient step
        'blue-light': '#2a5a7a',           // Light Blue - Gradient step

        // ===================================
        // LEGACY COLORS (Keep for backwards compat)
        // ===================================
        'teal-bg': '#B8D8D8',              // Light mode background (legacy)
        'teal-bg-dark': '#0A2F2F',         // Dark mode background (legacy)
        'green-metallic': '#00d4ff',       // Mapped to cyan-primary for compatibility
        'green-metallic-light': '#0099ff', // Mapped to cyan-secondary
        'green-metallic-dark': '#001a33',  // Mapped to blue-deep

        // ===================================
        // GLASSMORPHIC PANELS
        // ===================================
        'glass-white': 'rgba(255, 255, 255, 0.85)',  // Light mode glass
        'glass-dark': 'rgba(26, 26, 26, 0.85)',      // Dark mode glass

        // ===================================
        // SEMANTIC COLORS
        // ===================================
        'success': '#10b981',              // Green for success
        'warning': '#f59e0b',              // Amber for warnings
        'error': '#ef4444',                // Red for errors
        'info': '#3b82f6',                 // Blue for info
      },

      // ===================================
      // BACKDROP BLUR (Reduced for Cleaner Look)
      // ===================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',    // Reduced from default 12px
        'lg': '12px',   // Reduced from default 16px
        'xl': '16px',
      },

      // ===================================
      // GLASSMORPHIC SHADOWS (Lighter & Softer)
      // ===================================
      boxShadow: {
        'glass': '0 4px 16px 0 rgba(31, 38, 135, 0.08)',         // Lighter (was 0.15)
        'glass-hover': '0 8px 24px 0 rgba(31, 38, 135, 0.12)',   // Lighter (was 0.25)
        'glass-strong': '0 12px 32px 0 rgba(31, 38, 135, 0.15)', // Lighter (was 0.30)
        'inner-glass': 'inset 0 2px 8px 0 rgba(255, 255, 255, 0.05)', // More subtle
        'glow-sm': '0 0 8px rgba(0, 212, 255, 0.3)',            // Cyan subtle glow
        'glow-md': '0 0 12px rgba(0, 212, 255, 0.4)',           // Cyan medium glow
        'glow-lg': '0 0 20px rgba(0, 212, 255, 0.5)',           // Cyan strong glow
      },

      // ===================================
      // ANIMATIONS (Slower & Smoother)
      // ===================================
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',    // Slower (was 3s)
        'float': 'float 4s ease-in-out infinite',                           // Slower (was 3s)
        'glow': 'glow 3s ease-in-out infinite alternate',                   // Slower (was 2s)
        'gradient-shift': 'gradientShift 30s linear infinite',              // Very slow ambient
        'circuit-flow': 'circuitFlow 30s linear infinite',                  // Subtle background
        'fade-in': 'fadeIn 0.3s ease-out',                                  // Quick entrance
        'slide-up': 'slideUp 0.3s ease-out',                                // Smooth slide
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(26, 127, 127, 0.3)' },          // Softer glow
          '100%': { boxShadow: '0 0 16px rgba(26, 127, 127, 0.5)' },       // Softer peak
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        circuitFlow: {
          '0%': { transform: 'translate(0, 0)', filter: 'hue-rotate(0deg)' },
          '50%': { filter: 'hue-rotate(10deg)' },
          '100%': { transform: 'translate(20px, 20px)', filter: 'hue-rotate(0deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },

      // ===================================
      // BORDER RADIUS (Mix of sharp & rounded)
      // ===================================
      borderRadius: {
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
        '3xl': '2rem',     // 32px
        'sharp': '0',      // Angular corners
      },

      // ===================================
      // SPACING (Comprehensive Scale)
      // ===================================
      spacing: {
        'xs': '0.5rem',     // 8px
        'sm': '0.75rem',    // 12px
        'md': '1rem',       // 16px
        'lg': '1.5rem',     // 24px
        'xl': '2rem',       // 32px
        '2xl': '3rem',      // 48px
        '3xl': '4rem',      // 64px
        '4xl': '6rem',      // 96px
        '18': '4.5rem',     // Keep existing
        '22': '5.5rem',     // Keep existing
        '88': '22rem',      // Keep existing
        '100': '25rem',     // Keep existing
      },

      // ===================================
      // MAX WIDTH (Content Containers)
      // ===================================
      maxWidth: {
        'content': '1400px',      // Main content (reduced from 1600px)
        'narrow': '800px',        // Narrow content (articles, forms)
        'wide': '1600px',         // Wide layouts (dashboards)
      },

      // ===================================
      // Z-INDEX LAYERS
      // ===================================
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
}