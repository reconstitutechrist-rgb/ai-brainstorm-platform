import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ProjectItem } from '../../types';
import { CanvasCard } from './CanvasCard';
import { ClusterContainer } from './ClusterContainer';
import { useProjectStore } from '../../store/projectStore';
import { calculateAutoPosition } from '../../hooks/useCanvasSync';

interface VisualCanvasProps {
  items: ProjectItem[];
  isDarkMode: boolean;
  onArchive: (itemId: string) => void;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  items,
  isDarkMode,
  onArchive,
}) => {
  const { currentProject, updateItemPosition, updateItemFields, selectedCardIds, toggleCardSelection } = useProjectStore();
  const isDraggingRef = useRef(false);
  const positionedItemsRef = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setForceUpdate] = useState(0);

  // Auto-position items that don't have a position
  useEffect(() => {
    // Skip if currently dragging to prevent interference
    if (isDraggingRef.current) return;

    let hasChanges = false;
    items.forEach((item, index) => {
      // Only position items that haven't been positioned yet
      if (!item.position && !positionedItemsRef.current.has(item.id)) {
        const position = calculateAutoPosition(items, index);
        updateItemPosition(item.id, position);
        positionedItemsRef.current.add(item.id);
        hasChanges = true;
      }
    });

    // Only force update if we actually made changes
    if (hasChanges) {
      setForceUpdate(prev => prev + 1);
    }
  }, [items.length, updateItemPosition]); // Only depend on length, not items array itself

  // Memoized position handler
  const handlePositionChange = useCallback((itemId: string, position: { x: number; y: number }) => {
    updateItemPosition(itemId, position);
  }, [updateItemPosition]);

  const handleStateChange = useCallback((itemId: string, newState: ProjectItem['state']) => {
    updateItemFields(itemId, { state: newState });
  }, [updateItemFields]);

  // Handle drag end from @dnd-kit
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const itemId = active.id as string;

    // Find the item
    const item = items.find(i => i.id === itemId);
    if (!item) {
      isDraggingRef.current = false;
      return;
    }

    // Calculate new position
    const currentX = item.position?.x || 0;
    const currentY = item.position?.y || 0;
    const newPosition = {
      x: currentX + delta.x,
      y: currentY + delta.y,
    };

    // Update position in store
    updateItemPosition(itemId, newPosition);
    isDraggingRef.current = false;
  }, [items, updateItemPosition]);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Configure sensors to disable auto-scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    })
  );

  // Group items by cluster
  const { clusteredItems, unclusteredItems } = useMemo(() => {
    const clusters = currentProject?.clusters || [];

    if (clusters.length === 0) {
      return {
        clusteredItems: new Map<string, ProjectItem[]>(),
        unclusteredItems: items,
      };
    }

    const grouped = new Map<string, ProjectItem[]>();
    const unclustered: ProjectItem[] = [];

    items.forEach((item) => {
      if (item.clusterId) {
        const existing = grouped.get(item.clusterId) || [];
        grouped.set(item.clusterId, [...existing, item]);
      } else {
        unclustered.push(item);
      }
    });

    return {
      clusteredItems: grouped,
      unclusteredItems: unclustered,
    };
  }, [items, currentProject?.clusters]);

  // Get cluster metadata
  const clusters = currentProject?.clusters || [];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-auto scrollbar-thin"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? '#00d4ff' : '#00d4ff'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? '#00d4ff' : '#00d4ff'} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Canvas Content */}
      <DndContext 
        sensors={sensors}
        onDragEnd={handleDragEnd} 
        onDragStart={handleDragStart}
        autoScroll={false}
      >
        <motion.div
          className="relative min-w-full min-h-full"
          style={{ 
            width: '2000px', 
            height: '2000px',
            isolation: 'isolate',
          }}
        >
          {items.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-8xl mb-6"
                >
                  💭
                </motion.div>
                <p className={`text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start brainstorming!
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Your ideas will appear here as you chat
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Render Clustered Items */}
              {clusters.map((cluster) => {
                const clusterItems = clusteredItems.get(cluster.id) || [];

                if (clusterItems.length === 0) return null;

                return (
                  <ClusterContainer
                    key={cluster.id}
                    clusterId={cluster.id}
                    name={cluster.name}
                    color={cluster.color}
                    position={cluster.position}
                    cardCount={clusterItems.length}
                    isDarkMode={isDarkMode}
                  >
                    {clusterItems.map((item) => (
                      <CanvasCard
                        key={item.id}
                        item={item}
                        isDarkMode={isDarkMode}
                        onArchive={onArchive}
                        onPositionChange={handlePositionChange}
                        onStateChange={handleStateChange}
                        isInCluster={true}
                      />
                    ))}
                  </ClusterContainer>
                );
              })}

              {/* Render Unclustered Items */}
              {unclusteredItems.map((item) => (
                <CanvasCard
                  key={item.id}
                  item={item}
                  isDarkMode={isDarkMode}
                  onArchive={onArchive}
                  onPositionChange={handlePositionChange}
                  onStateChange={handleStateChange}
                  isSelected={selectedCardIds.has(item.id)}
                  onToggleSelection={toggleCardSelection}
                />
              ))}
            </>
          )}
        </motion.div>
      </DndContext>
    </div>
  );
};
