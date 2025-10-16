# AI Brainstorm Platform - Design System Documentation

## 🎨 Overview

This document provides a complete reference for the design system implemented in the AI Brainstorm Platform. The design combines modern glassmorphism with a professional teal and metallic green color palette.

## 📁 Key Files

### Configuration
- **[frontend/tailwind.config.js](frontend/tailwind.config.js)** - Tailwind CSS configuration with custom colors, animations, and utilities
- **[frontend/src/index.css](frontend/src/index.css)** - Global CSS styles with custom utilities and components
- **[frontend/src/App.css](frontend/src/App.css)** - App-specific styles

### Documentation
- **[docs/COLOR_SCHEME.md](docs/COLOR_SCHEME.md)** - Complete color palette reference

## 🎨 Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Soft Teal** | `#B8D8D8` | Light mode background |
| **Deep Teal** | `#0A2F2F` | Dark mode background |
| **Metallic Green** | `#1A7F7F` | Primary accent color |
| **Metallic Green Light** | `#2DA3A3` | Hover states |
| **Metallic Green Dark** | `#0D5555` | Active/pressed states |

### Glassmorphism

**Light Mode:**
```css
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.3);
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
```

**Dark Mode:**
```css
background: rgba(26, 26, 26, 0.85);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
```

## 🛠️ Custom Utility Classes

### Glassmorphism
- `.glass` - Light mode glass panel
- `.glass-dark` - Dark mode glass panel
- `.glass-strong` - Stronger glass effect
- `.glass-subtle` - Subtle glass effect

### Effects
- `.glow-green` - Green glow effect
- `.glow-pulse` - Animated pulsing glow
- `.hover-lift` - Lift element on hover
- `.hover-scale` - Scale element on hover
- `.hover-glow` - Add glow on hover

### Gradients
- `.gradient-teal` - Teal gradient background
- `.gradient-green` - Green gradient background
- `.gradient-dark` - Dark gradient background
- `.gradient-animated` - Animated shifting gradient

### Angular Accents
- `.angular-accent` - Corner bracket decorations (12px)
- `.angular-accent-lg` - Large corner brackets (20px)
- `.sharp-corners` - Remove border radius

### Text Effects
- `.text-shadow-soft` - Soft text shadow
- `.text-shadow-strong` - Strong text shadow
- `.text-gradient-green` - Green gradient text

## 🎯 Component Classes

### Buttons

```css
.btn-primary     /* Metallic green primary button */
.btn-secondary   /* Semi-transparent secondary button */
.btn-ghost       /* Transparent ghost button */
```

**Example:**
```html
<button class="btn-primary">
  Create Project
</button>
```

### Badges

```css
.badge           /* Base badge style */
.badge-green     /* Success/active badge */
.badge-blue      /* Info/exploring badge */
.badge-gray      /* Neutral/parked badge */
```

**Example:**
```html
<span class="badge badge-green">Active</span>
```

### Scrollbar

```css
.scrollbar-thin  /* Custom themed scrollbar */
```

## 📐 Layout

### Structure

```
Layout (min-h-screen with teal background)
├── FloatingNav (draggable navigation panel)
├── DarkModeToggle (theme switcher)
└── Main Content (max-width container with responsive padding)
```

### Spacing

- **Container Max-Width**: `1600px`
- **Responsive Padding**:
  - Mobile: `16px` (px-4)
  - Small: `24px` (sm:px-6)
  - Medium: `32px` (md:px-8)
  - Large: `48px` (lg:px-12)

## 🎭 Animations

### Built-in Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-pulse-slow` | 3s | Slow pulsing |
| `animate-float` | 3s | Floating up and down |
| `animate-glow` | 2s | Pulsing glow effect |

### Custom Keyframes

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(26, 127, 127, 0.5); }
  100% { box-shadow: 0 0 20px rgba(26, 127, 127, 0.8); }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

## 🌙 Dark Mode

Dark mode is implemented using Tailwind's `class` strategy. Add the `dark` class to the `<html>` element to enable dark mode.

### Theme Toggle

The `useThemeStore` manages theme state:

```typescript
const { isDarkMode, toggleTheme } = useThemeStore();
```

### Conditional Styling

```tsx
<div className={`${isDarkMode ? 'glass-dark' : 'glass'}`}>
  Content
</div>
```

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile Optimizations

- Reduced blur effects on mobile for performance
- Responsive padding and spacing
- Touch-friendly button sizes
- Collapsible navigation

## ♿ Accessibility

### Contrast Ratios

All color combinations meet WCAG AA standards:
- Light mode: 4.8:1 minimum
- Dark mode: 12.3:1 minimum

### Focus States

All interactive elements have visible focus indicators:

```css
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(26, 127, 127, 0.5);
}
```

### Screen Reader Support

- Semantic HTML elements
- ARIA labels where needed
- Skip links for navigation

## 🎨 Design Principles

### 1. Glassmorphism
Modern frosted glass effect with backdrop blur creates depth and visual hierarchy.

### 2. Angular Accents
Corner brackets add a tech-forward, sophisticated touch while maintaining clean lines.

### 3. Smooth Animations
200ms transitions create fluid, responsive interactions without feeling sluggish.

### 4. Consistent Spacing
8px base unit ensures visual rhythm throughout the application.

### 5. Color Harmony
Teal and metallic green create a calming yet professional atmosphere perfect for creative work.

## 🚀 Usage Examples

### Creating a Glassmorphic Card

```tsx
import { useThemeStore } from '@/store/themeStore';

function Card() {
  const { isDarkMode } = useThemeStore();

  return (
    <div className={`
      ${isDarkMode ? 'glass-dark' : 'glass'}
      rounded-2xl p-8 shadow-glass hover:shadow-glass-hover
      relative overflow-hidden
    `}>
      {/* Angular accents */}
      <div className="absolute top-4 right-4 w-12 h-12
                      border-t-2 border-r-2 border-green-metallic/30" />
      <div className="absolute bottom-4 left-4 w-12 h-12
                      border-b-2 border-l-2 border-green-metallic/30" />

      {/* Content */}
      <h3 className={`text-2xl font-bold ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        Card Title
      </h3>

      <button className="btn-primary mt-4">
        Action
      </button>
    </div>
  );
}
```

### Adding Hover Effects

```tsx
<div className="hover-lift hover-glow cursor-pointer">
  Hover me!
</div>
```

### Using State Colors

```tsx
<span className={`badge ${
  status === 'decided' ? 'badge-green' :
  status === 'exploring' ? 'badge-blue' :
  'badge-gray'
}`}>
  {status}
</span>
```

## 🔧 Customization

### Adding New Colors

Edit `frontend/tailwind.config.js`:

```javascript
colors: {
  'my-color': '#123456',
}
```

### Creating New Utilities

Add to `frontend/src/index.css` within `@layer utilities`:

```css
.my-custom-utility {
  /* styles */
}
```

### Adding Components

Add to `frontend/src/index.css` within `@layer components`:

```css
.my-component {
  /* styles */
}
```

## 📊 Performance Considerations

### Optimizations

1. **Backdrop Blur**: Reduced on mobile devices
2. **Transitions**: Limited to color/transform properties
3. **Animations**: Use `transform` and `opacity` for GPU acceleration
4. **Images**: Lazy loading implemented
5. **Bundle Size**: Tailwind purges unused CSS in production

### Best Practices

- Avoid nesting glassmorphic elements too deeply
- Limit simultaneous animations
- Use `will-change` sparingly
- Optimize images before upload

## 🐛 Troubleshooting

### Glass Effect Not Showing
- Ensure backdrop-filter is supported in browser
- Check for conflicting z-index values
- Verify background is not fully opaque

### Colors Not Applying
- Run `npm run dev` to rebuild Tailwind
- Check if class exists in `tailwind.config.js`
- Clear browser cache

### Dark Mode Not Working
- Verify `dark` class on `<html>` element
- Check `useThemeStore` implementation
- Ensure dark variants are defined

## 🔗 Related Files

- [COLOR_SCHEME.md](docs/COLOR_SCHEME.md) - Detailed color reference
- [tailwind.config.js](frontend/tailwind.config.js) - Tailwind configuration
- [index.css](frontend/src/index.css) - Global styles
- [Layout.tsx](frontend/src/components/Layout.tsx) - Main layout component

---

**Version**: 1.0
**Last Updated**: October 2025
**Maintained by**: AI Brainstorm Platform Team
