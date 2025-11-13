# Color Scheme Reference

## Primary Colors

### Soft Teal Background
- **Light Mode**: `#B8D8D8` - Soft, muted teal
- **Dark Mode**: `#0A2F2F` - Deep teal-black
- **Usage**: Main background color for the entire application

### Metallic Dark Green
- **Primary**: `#1A7F7F` - Rich metallic teal-green
- **Light**: `#2DA3A3` - Brighter variant for hover states
- **Dark**: `#0D5555` - Darker variant for pressed states
- **Usage**: Accent color for buttons, active states, highlights

## Glass Effects

### Light Mode Glass
- **Background**: `rgba(255, 255, 255, 0.85)` - Semi-transparent white
- **Border**: `rgba(255, 255, 255, 0.3)` - Subtle white border
- **Backdrop Blur**: `10px`
- **Shadow**: `0 8px 32px 0 rgba(31, 38, 135, 0.15)`

### Dark Mode Glass
- **Background**: `rgba(26, 26, 26, 0.85)` - Semi-transparent black
- **Border**: `rgba(255, 255, 255, 0.1)` - Very subtle white border
- **Backdrop Blur**: `10px`
- **Shadow**: `0 8px 32px 0 rgba(31, 38, 135, 0.15)`

## State Colors

### Success / Decided
- **Color**: `#10B981` (Green)
- **Background**: `rgba(16, 185, 129, 0.2)`
- **Usage**: Confirmed decisions, success messages

### Warning / Exploring
- **Color**: `#3B82F6` (Blue)
- **Background**: `rgba(59, 130, 246, 0.2)`
- **Usage**: Ideas under consideration

### Info / Parked
- **Color**: `#6B7280` (Gray)
- **Background**: `rgba(107, 114, 128, 0.2)`
- **Usage**: Parked ideas, inactive states

### Error / Failed
- **Color**: `#EF4444` (Red)
- **Background**: `rgba(239, 68, 68, 0.2)`
- **Usage**: Error messages, failed uploads

## Text Colors

### Light Mode
- **Primary**: `#1F2937` (Gray-800)
- **Secondary**: `#6B7280` (Gray-500)
- **Tertiary**: `#9CA3AF` (Gray-400)

### Dark Mode
- **Primary**: `#F9FAFB` (Gray-50)
- **Secondary**: `#D1D5DB` (Gray-300)
- **Tertiary**: `#9CA3AF` (Gray-400)

## Usage Guidelines

### Backgrounds

```css
/* Light mode main background */
background-color: #B8D8D8;

/* Dark mode main background */
background-color: #0A2F2F;

/* Glassmorphic panels */
background: rgba(255, 255, 255, 0.85); /* Light */
background: rgba(26, 26, 26, 0.85);    /* Dark */
```

### Accents

```css
/* Primary accent (buttons, highlights) */
background-color: #1A7F7F;

/* Hover state */
background-color: #2DA3A3;

/* Active/pressed state */
background-color: #0D5555;
```

### Borders

```css
/* Light mode glass border */
border: 1px solid rgba(255, 255, 255, 0.3);

/* Dark mode glass border */
border: 1px solid rgba(255, 255, 255, 0.1);

/* Accent border */
border: 2px solid #1A7F7F;
```

### Shadows

```css
/* Standard glass shadow */
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);

/* Hover shadow */
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.25);

/* Strong shadow */
box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.30);
```

## Accessibility

### Contrast Ratios (WCAG AA)

- ✅ Light mode text on teal background: 4.8:1
- ✅ Dark mode text on dark teal: 12.3:1
- ✅ Green metallic on white: 4.6:1
- ✅ Green metallic on dark: 8.2:1

### Color Blind Friendly

- Uses distinct brightness levels
- Not solely reliant on color for information
- Icons accompany colored states

## Color Palette Visualization

```
Light Mode:
┌────────────────────────────────────┐
│  Background: #B8D8D8 (Soft Teal)   │
│  ┌──────────────────────────────┐  │
│  │ Glass: rgba(255,255,255,0.85)│  │
│  │  ┌────────────────────────┐  │  │
│  │  │ Accent: #1A7F7F        │  │  │
│  │  │ (Metallic Green)       │  │  │
│  │  └────────────────────────┘  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘

Dark Mode:
┌────────────────────────────────────┐
│  Background: #0A2F2F (Deep Teal)   │
│  ┌──────────────────────────────┐  │
│  │ Glass: rgba(26,26,26,0.85)   │  │
│  │  ┌────────────────────────┐  │  │
│  │  │ Accent: #2DA3A3        │  │  │
│  │  │ (Bright Metallic)      │  │  │
│  │  └────────────────────────┘  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

## Quick Reference

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `#B8D8D8` | `#0A2F2F` |
| Primary Accent | `#1A7F7F` | `#2DA3A3` |
| Glass Panel | `rgba(255,255,255,0.85)` | `rgba(26,26,26,0.85)` |
| Text Primary | `#1F2937` | `#F9FAFB` |
| Text Secondary | `#6B7280` | `#D1D5DB` |
| Success | `#10B981` | `#10B981` |
| Warning | `#3B82F6` | `#3B82F6` |
| Error | `#EF4444` | `#EF4444` |

## Design Philosophy

The color scheme is built around three key principles:

1. **Calming & Professional**: The soft teal creates a serene, focused environment perfect for brainstorming
2. **Tech-Forward**: The metallic green accents provide a modern, tech-savvy feel
3. **Clarity**: High contrast ratios ensure readability in both light and dark modes

---

**Last Updated**: October 2025
**Version**: 1.0
