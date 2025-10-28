import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { ProjectItem } from '../../types';

interface CanvasCardProps {
  item: ProjectItem;
  isDarkMode: boolean;
  onArchive: (itemId: string) => void;
  onPositionChange: (itemId: string, position: { x: number; y: number }) => void;
  onStateChange?: (itemId: string, newState: ProjectItem['state']) => void;
  isInCluster?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (itemId: string) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
  item,
  isDarkMode,
  onArchive,
  onPositionChange,
  onStateChange,
  isInCluster = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStateColor = (state: ProjectItem['state']) => {
    switch (state) {
      case 'decided':
        return {
          border: 'border-green-400',
          bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-50/90',
          text: 'text-green-500',
          glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
        };
      case 'exploring':
        return {
          border: 'border-blue-400',
          bg: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50/90',
          text: 'text-blue-500',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        };
      case 'parked':
        return {
          border: 'border-gray-400',
          bg: isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/90',
          text: 'text-gray-500',
          glow: 'shadow-[0_0_20px_rgba(107,114,128,0.3)]',
        };
      case 'rejected':
        return {
          border: 'border-red-400',
          bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-50/90',
          text: 'text-red-500',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        };
      default:
        return {
          border: 'border-gray-400',
          bg: isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/90',
          text: 'text-gray-500',
          glow: '',
        };
    }
  };

  const colors = getStateColor(item.state);

  return (
    <motion.div
      drag={!isInCluster}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        const newX = (item.position?.x || 0) + info.offset.x;
        const newY = (item.position?.y || 0) + info.offset.y;
        onPositionChange(item.id, { x: newX, y: newY });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={
        isInCluster
          ? { position: 'relative' }
          : {
              position: 'absolute',
              left: item.position?.x || 0,
              top: item.position?.y || 0,
            }
      }
      className={`${
        isInCluster ? 'w-full' : 'w-64'
      } ${!isInCluster && 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'z-50' : 'z-10'} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      whileHover={!isInCluster ? { scale: 1.03 } : undefined}
      whileTap={!isInCluster ? { scale: 0.98 } : undefined}
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
        className={`p-4 rounded-2xl border-2 ${colors.border} ${colors.bg} backdrop-blur-xl ${
          isDragging ? colors.glow : ''
        } ${isSelected ? 'ring-2 ring-blue-400/50' : ''} transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${colors.text} bg-current/10 border border-current/30`}>
            {item.state}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(item.id);
            }}
            className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'} transition-colors`}
          >
            📦
          </button>
        </div>

        {/* Content */}
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} line-clamp-4`}>
          {item.text}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          {item.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Confidence:
              </span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < Math.round((item.confidence || 0) / 20)
                        ? colors.text
                        : isDarkMode
                        ? 'text-gray-600'
                        : 'text-gray-300'
                    }
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          )}
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* State Change Buttons */}
        {onStateChange && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-current/20">
            {(['decided', 'exploring', 'parked'] as const).map((state) => (
              <button
                key={state}
                onClick={(e) => {
                  e.stopPropagation();
                  onStateChange(item.id, state);
                }}
                disabled={item.state === state}
                className={`flex-1 text-xs py-1 rounded-lg transition-all ${
                  item.state === state
                    ? 'bg-current/20 text-current opacity-50 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
