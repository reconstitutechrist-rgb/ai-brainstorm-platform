import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ProjectItem } from '../../types';
import { assertNever } from '../../types';
import {
  CANVAS_DIMENSIONS,
  CARD_DIMENSIONS,
  ANIMATION_SETTINGS,
  CONFIDENCE_SETTINGS,
  TAG_LIMITS,
  Z_INDEX,
  SELECTION,
} from '../../constants/canvas';

interface CanvasCardProps {
  item: ProjectItem;
  isDarkMode: boolean;
  onArchive: (itemId: string) => void | Promise<void>; // ✅ Support async archive
  onPositionChange: (itemId: string, position: { x: number; y: number }) => void;
  onStateChange?: (itemId: string, newState: ProjectItem['state']) => void | Promise<void>; // ✅ Support async state change
  isInCluster?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (itemId: string) => void;
  canvasSize?: { width: number; height: number }; // ✅ Optional canvas size prop
}

// ✅ MEDIUM PRIORITY FIX: Use constants instead of magic numbers
const DEFAULT_CANVAS_SIZE = {
  width: CANVAS_DIMENSIONS.DEFAULT_WIDTH,
  height: CANVAS_DIMENSIONS.DEFAULT_HEIGHT,
};

// ✅ MEDIUM PRIORITY FIX: Wrap in React.memo to prevent unnecessary re-renders
const CanvasCardComponent: React.FC<CanvasCardProps> = ({
  item,
  isDarkMode,
  onArchive,
  onPositionChange,
  onStateChange,
  isInCluster = false,
  isSelected = false,
  onToggleSelection,
  canvasSize = DEFAULT_CANVAS_SIZE,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false); // ✅ MEDIUM PRIORITY FIX: Loading state for archive operation
  const [changingState, setChangingState] = useState(false); // ✅ MEDIUM PRIORITY FIX: Loading state for state changes

  // ✅ HIGH PRIORITY FIX: Calculate dynamic drag constraints based on canvas size
  const dragConstraints = useMemo(() => {
    return {
      left: 0,
      top: 0,
      right: Math.max(0, canvasSize.width - CARD_DIMENSIONS.WIDTH),
      bottom: Math.max(0, canvasSize.height - CARD_DIMENSIONS.APPROXIMATE_HEIGHT),
    };
  }, [canvasSize.width, canvasSize.height]);

  // ✅ MEDIUM PRIORITY FIX: Memoize color calculation to prevent re-renders
  // ✅ TypeScript best practice: Exhaustive switch with assertNever for compile-time safety
  const colors = useMemo(() => {
    const getStateColor = (state: ProjectItem['state']) => {
      switch (state) {
        case 'decided':
          return {
            border: 'border-blue-400/60',
            bg: isDarkMode
              ? 'bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-cyan-900/40'
              : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100/80',
            text: 'text-blue-400',
            badgeBg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
            badgeText: isDarkMode ? 'text-blue-300' : 'text-blue-700',
            glow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]',
            hoverGlow: 'hover:shadow-[0_0_35px_rgba(59,130,246,0.6)]',
            leftBorder: 'border-l-4 border-l-blue-500',
          };
        case 'exploring':
          return {
            border: 'border-purple-400/60',
            bg: isDarkMode
              ? 'bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-pink-900/40'
              : 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100/80',
            text: 'text-purple-400',
            badgeBg: isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100',
            badgeText: isDarkMode ? 'text-purple-300' : 'text-purple-700',
            glow: 'shadow-[0_0_25px_rgba(168,85,247,0.4)]',
            hoverGlow: 'hover:shadow-[0_0_35px_rgba(168,85,247,0.6)]',
            leftBorder: 'border-l-4 border-l-purple-500',
          };
        case 'parked':
          return {
            border: 'border-amber-400/60',
            bg: isDarkMode
              ? 'bg-gradient-to-br from-amber-900/40 via-yellow-800/30 to-amber-900/40'
              : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/80',
            text: 'text-amber-400',
            badgeBg: isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100',
            badgeText: isDarkMode ? 'text-amber-300' : 'text-amber-700',
            glow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
            hoverGlow: 'hover:shadow-[0_0_35px_rgba(245,158,11,0.6)]',
            leftBorder: 'border-l-4 border-l-amber-500',
          };
        case 'rejected':
          return {
            border: 'border-red-400/60',
            bg: isDarkMode
              ? 'bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40'
              : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100/80',
            text: 'text-red-400',
            badgeBg: isDarkMode ? 'bg-red-500/20' : 'bg-red-100',
            badgeText: isDarkMode ? 'text-red-300' : 'text-red-700',
            glow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)]',
            hoverGlow: 'hover:shadow-[0_0_35px_rgba(239,68,68,0.6)]',
            leftBorder: 'border-l-4 border-l-red-500',
          };
        default:
          // ✅ Exhaustive check: TypeScript will error if new states are added without handling them
          return assertNever(state, `Unknown ProjectItem state: ${state}`);
      }
    };
    return getStateColor(item.state);
  }, [item.state, isDarkMode]);

  return (
    <motion.div
      drag={!isInCluster}
      dragMomentum={false}
      dragElastic={0}
      dragTransition={{
        bounceStiffness: ANIMATION_SETTINGS.DRAG_BOUNCE_STIFFNESS,
        bounceDamping: ANIMATION_SETTINGS.DRAG_BOUNCE_DAMPING,
      }}
      dragConstraints={dragConstraints} // ✅ Fixed: Now uses dynamic constraints instead of hard-coded 1700x1700
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        const newX = (item.position?.x || 0) + info.offset.x;
        const newY = (item.position?.y || 0) + info.offset.y;
        onPositionChange(item.id, { x: newX, y: newY });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // ✅ HIGH PRIORITY FIX: Accessibility improvements
      role="article"
      aria-label={`Idea card: ${item.text?.substring(0, 50)}${(item.text?.length || 0) > 50 ? '...' : ''}`}
      aria-describedby={`card-state-${item.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard navigation support
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onArchive(item.id);
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (onToggleSelection) {
            e.preventDefault();
            onToggleSelection(item.id);
          }
        }
      }}
      style={
        isInCluster
          ? { position: 'relative' }
          : {
              position: 'absolute',
              left: item.position?.x || 0,
              top: item.position?.y || 0,
              willChange: 'transform',
            }
      }
      className={`${
        isInCluster ? 'w-full' : 'w-64'
      } ${!isInCluster && 'cursor-grab active:cursor-grabbing'} ${
        isDragging ? `z-${Z_INDEX.DRAGGING_CARD}` : `z-${Z_INDEX.NORMAL_CARD}`
      } ${
        isSelected ? `ring-${SELECTION.RING_WIDTH} ring-blue-500 ring-offset-${SELECTION.RING_OFFSET}` : ''
      } focus:outline-none focus:ring-2 focus:ring-cyan-primary/50`}
      whileHover={!isInCluster ? { scale: ANIMATION_SETTINGS.HOVER_SCALE } : undefined}
      whileTap={!isInCluster ? { scale: ANIMATION_SETTINGS.TAP_SCALE } : undefined}
    >
      {/* Selection Checkbox - Only show if not in cluster and has onToggleSelection */}
      {!isInCluster && onToggleSelection && (isHovered || isSelected) && (
        <div
          className="absolute -top-2 -left-2 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(item.id);
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : isDarkMode
                ? 'bg-gray-800 border-gray-600 hover:border-blue-400'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </motion.div>
        </div>
      )}

      <div
        className={`p-5 rounded-2xl border-2 ${colors.border} ${colors.leftBorder} ${colors.bg} backdrop-blur-xl ${
          isDragging ? colors.glow : isHovered ? colors.hoverGlow : ''
        } ${isSelected ? 'ring-2 ring-blue-400/50' : ''} transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            id={`card-state-${item.id}`}
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${colors.badgeText} ${colors.badgeBg} border border-current/40 uppercase tracking-wide`}
            role="status"
            aria-label={`Card state: ${item.state}`}
          >
            {item.state}
          </span>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              // ✅ MEDIUM PRIORITY FIX: Add loading state during archive
              setIsArchiving(true);
              try {
                await onArchive(item.id);
              } finally {
                setIsArchiving(false);
              }
            }}
            disabled={isArchiving}
            className={`text-xs ${
              isArchiving
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                ? 'text-gray-400 hover:text-red-400'
                : 'text-gray-500 hover:text-red-500'
            } transition-colors`}
            aria-label={isArchiving ? 'Archiving card...' : 'Archive this card'}
            title={isArchiving ? 'Archiving...' : 'Archive card (Delete key)'}
          >
            {isArchiving ? '⏳' : '📦'}
          </button>
        </div>

        {/* Content */}
        {/* ✅ HIGH PRIORITY FIX: Sanitize text to prevent XSS - using textContent via dangerouslySetInnerHTML alternative */}
        <p
          className={`text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} line-clamp-4`}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {/* React automatically escapes text content, preventing XSS. Additional sanitization for safety: */}
          {String(item.text || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {item.tags.slice(0, TAG_LIMITS.VISIBLE).map((tag, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > TAG_LIMITS.VISIBLE && (
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                +{item.tags.length - TAG_LIMITS.VISIBLE}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          {item.confidence !== undefined && (
            <div className="flex items-center gap-2" role="group" aria-label="Confidence rating">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Confidence:
              </span>
              <div
                className="flex gap-0.5"
                role="img"
                aria-label={`${Math.round((item.confidence || 0) / 20)} out of 5 stars`}
              >
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < Math.round((item.confidence || 0) / CONFIDENCE_SETTINGS.STAR_VALUE)
                        ? colors.text
                        : isDarkMode
                        ? 'text-gray-600'
                        : 'text-gray-300'
                    }
                    aria-hidden="true"
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          )}
          <time
            className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
            dateTime={item.created_at}
            aria-label={`Created on ${new Date(item.created_at).toLocaleDateString()}`}
          >
            {new Date(item.created_at).toLocaleDateString()}
          </time>
        </div>

        {/* State Change Buttons */}
        {onStateChange && (
          <div
            className="flex gap-2 mt-3 pt-3 border-t border-current/20"
            role="group"
            aria-label="Change card state"
          >
            {(['decided', 'exploring', 'parked'] as const).map((state) => (
              <button
                key={state}
                onClick={async (e) => {
                  e.stopPropagation();
                  // ✅ MEDIUM PRIORITY FIX: Add loading state during state change
                  setChangingState(true);
                  try {
                    await onStateChange?.(item.id, state);
                  } finally {
                    setChangingState(false);
                  }
                }}
                disabled={item.state === state || changingState}
                aria-label={`Change state to ${state}`}
                aria-pressed={item.state === state}
                className={`flex-1 text-xs py-1 rounded-lg transition-all ${
                  item.state === state || changingState
                    ? 'bg-current/20 text-current opacity-50 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {changingState && item.state !== state ? '...' : state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ✅ MEDIUM PRIORITY FIX: Export memoized version with custom comparison
export const CanvasCard = React.memo(CanvasCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.state === nextProps.item.state &&
    prevProps.item.position?.x === nextProps.item.position?.x &&
    prevProps.item.position?.y === nextProps.item.position?.y &&
    prevProps.item.isArchived === nextProps.item.isArchived &&
    prevProps.isDarkMode === nextProps.isDarkMode &&
    prevProps.isInCluster === nextProps.isInCluster &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.canvasSize?.width === nextProps.canvasSize?.width &&
    prevProps.canvasSize?.height === nextProps.canvasSize?.height
  );
});
