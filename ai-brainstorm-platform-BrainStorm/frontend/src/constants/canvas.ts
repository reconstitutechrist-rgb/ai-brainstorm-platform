/**
 * ✅ MEDIUM PRIORITY FIX: Canvas Constants
 *
 * Centralized constants to replace magic numbers throughout canvas components.
 * Makes code more maintainable and easier to adjust.
 */

// Canvas dimensions
export const CANVAS_DIMENSIONS = {
  DEFAULT_WIDTH: 2000,
  DEFAULT_HEIGHT: 2000,
  MIN_WIDTH: 1000,
  MIN_HEIGHT: 1000,
  MAX_WIDTH: 5000,
  MAX_HEIGHT: 5000,
} as const;

// Card dimensions
export const CARD_DIMENSIONS = {
  WIDTH: 256, // w-64 in Tailwind = 16rem = 256px
  APPROXIMATE_HEIGHT: 300, // Approximate card height for drag constraints
  MIN_WIDTH: 200,
  MAX_WIDTH: 400,
} as const;

// Grid settings
export const GRID_SETTINGS = {
  SIZE: 40, // Grid cell size in pixels
  OPACITY: 0.1,
  COLOR_LIGHT: '#00d4ff',
  COLOR_DARK: '#00d4ff',
} as const;

// Animation settings
export const ANIMATION_SETTINGS = {
  DRAG_BOUNCE_STIFFNESS: 600,
  DRAG_BOUNCE_DAMPING: 20,
  HOVER_SCALE: 1.03,
  TAP_SCALE: 0.98,
  SPRING_STIFFNESS: 200,
} as const;

// Auto-refresh delays
export const REFRESH_DELAYS = {
  MESSAGE_TRIGGER: 2000, // 2 seconds after new message
  POLLING_INTERVAL: 30000, // 30 seconds for periodic refresh
  DEBOUNCE_POSITION: 100, // Debounce position updates
} as const;

// Confidence rating
export const CONFIDENCE_SETTINGS = {
  MIN: 0,
  MAX: 100,
  STARS: 5,
  STAR_VALUE: 20, // 100 / 5 stars
} as const;

// Tag display limits
export const TAG_LIMITS = {
  VISIBLE: 3, // Show first 3 tags
  LINE_CLAMP: 4, // Clamp text to 4 lines
} as const;

// State colors (for reference - actual colors defined in getStateColor)
export const STATE_TYPES = {
  DECIDED: 'decided',
  EXPLORING: 'exploring',
  PARKED: 'parked',
  REJECTED: 'rejected',
} as const;

// Shadow effects
export const SHADOW_EFFECTS = {
  GLOW_SMALL: 25, // px
  GLOW_LARGE: 35, // px
  GLOW_OPACITY: 0.4,
  HOVER_GLOW_OPACITY: 0.6,
} as const;

// Z-index layers
export const Z_INDEX = {
  NORMAL_CARD: 10,
  DRAGGING_CARD: 50,
  SELECTION_CHECKBOX: 20,
  CLUSTER_CONTAINER: 5,
} as const;

// Border widths
export const BORDER_WIDTHS = {
  CARD: 2, // px
  LEFT_ACCENT: 4, // px
} as const;

// Transition durations
export const TRANSITIONS = {
  DEFAULT: 300, // ms
  FAST: 150, // ms
  SLOW: 500, // ms
} as const;

// Canvas error retry settings
export const ERROR_RETRY = {
  NETWORK_DELAY: 2000, // ms
  NETWORK_MAX_RETRIES: 3,
  OPERATION_DELAY: 1000, // ms
  OPERATION_MAX_RETRIES: 2,
  DEFAULT_DELAY: 1500, // ms
  DEFAULT_MAX_RETRIES: 1,
} as const;

// Cluster settings
export const CLUSTER_SETTINGS = {
  MIN_CARDS: 2, // Minimum cards to form a cluster
  DEFAULT_POSITION_X: 100,
  DEFAULT_POSITION_Y: 100,
  SPACING: 150, // Space between clusters
} as const;

// Virtualization thresholds
export const VIRTUALIZATION = {
  ENABLED_THRESHOLD: 50, // Enable virtualization when more than 50 items
  BUFFER_SIZE: 5, // Render 5 extra items outside viewport
  SCROLL_DEBOUNCE: 100, // ms
} as const;

// Selection settings
export const SELECTION = {
  STORAGE_KEY: 'canvas_selection_state',
  MAX_SELECTED: 100, // Reasonable limit for bulk operations
  RING_WIDTH: 2, // px
  RING_OFFSET: 2, // px
} as const;

// Undo/Redo settings
export const HISTORY = {
  MAX_STACK_SIZE: 50, // Keep last 50 actions
  DEBOUNCE_DELAY: 300, // ms - debounce rapid actions
  BATCH_TIMEOUT: 1000, // ms - batch actions within 1 second
} as const;

// Auto-position settings
export const AUTO_POSITION = {
  START_X: 100,
  START_Y: 100,
  HORIZONTAL_SPACING: 300,
  VERTICAL_SPACING: 350,
  COLUMNS: 5, // Cards per row
} as const;
