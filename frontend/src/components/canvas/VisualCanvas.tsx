import React, { useEffect, useMemo } from 'react';
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

  // Auto-position items that don't have a position
  useEffect(() => {
    items.forEach((item, index) => {
      if (!item.position) {
        const position = calculateAutoPosition(items, index);
        updateItemPosition(item.id, position);
      }
    });
  }, [items, updateItemPosition]);

  const handlePositionChange = (itemId: string, position: { x: number; y: number }) => {
    updateItemPosition(itemId, position);
  };

  const handleStateChange = (itemId: string, newState: ProjectItem['state']) => {
    updateItemFields(itemId, { state: newState });
  };

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
    <div className="relative w-full h-full overflow-auto scrollbar-thin">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? '#00d4ff' : '#00d4ff'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? '#00d4ff' : '#00d4ff'} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Canvas Content */}
      <motion.div
        className="relative min-w-full min-h-full"
        style={{ width: '2000px', height: '2000px' }}
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
    </div>
  );
};
