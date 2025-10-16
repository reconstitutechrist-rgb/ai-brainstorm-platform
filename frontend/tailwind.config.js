/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ===================================
        // SOFT TEAL BACKGROUNDS
        // ===================================
        'teal-bg': '#B8D8D8',              // Light mode background
        'teal-bg-dark': '#0A2F2F',         // Dark mode background

        // ===================================
        // METALLIC DARK GREEN ACCENTS
        // ===================================
        'green-metallic': '#1A7F7F',       // Primary accent
        'green-metallic-light': '#2DA3A3', // Lighter variant
        'green-metallic-dark': '#0D5555',  // Darker variant

        // ===================================
        // GLASSMORPHIC PANELS
        // ===================================
        'glass-white': 'rgba(255, 255, 255, 0.85)',  // Light mode glass
        'glass-dark': 'rgba(26, 26, 26, 0.85)',      // Dark mode glass
      },

      // ===================================
      // BACKDROP BLUR
      // ===================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      // ===================================
      // GLASSMORPHIC SHADOWS
      // ===================================
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        'glass-strong': '0 12px 48px 0 rgba(31, 38, 135, 0.30)',
        'inner-glass': 'inset 0 2px 8px 0 rgba(255, 255, 255, 0.1)',
      },

      // ===================================
      // ANIMATIONS
      // ===================================
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(26, 127, 127, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(26, 127, 127, 0.8)' },
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
      // SPACING
      // ===================================
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
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