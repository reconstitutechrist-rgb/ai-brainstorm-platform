import { useState, useCallback } from 'react';
import type { Cluster } from '../types/canvas.types';

export const useClustering = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);

  // Create a new cluster
  const createCluster = useCallback((
    name: string,
    cardIds: string[],
    position: { x: number; y: number },
    description?: string
  ) => {
    const newCluster: Cluster = {
      id: `cluster-${Date.now()}`,
      name,
      description,
      cardIds,
      color: generateClusterColor(),
      isExpanded: false,
      position,
      createdAt: new Date(),
    };
    setClusters(prev => [...prev, newCluster]);
    return newCluster;
  }, []);

  // Add card to cluster
  const addCardToCluster = useCallback((clusterId: string, cardId: string) => {
    setClusters(prev => prev.map(cluster =>
      cluster.id === clusterId
        ? { ...cluster, cardIds: [...cluster.cardIds, cardId] }
        : cluster
    ));
  }, []);

  // Remove card from cluster
  const removeCardFromCluster = useCallback((clusterId: string, cardId: string) => {
    setClusters(prev => prev.map(cluster =>
      cluster.id === clusterId
        ? { ...cluster, cardIds: cluster.cardIds.filter(id => id !== cardId) }
        : cluster
    ));
  }, []);

  // Toggle cluster expansion
  const toggleCluster = useCallback((clusterId: string) => {
    setClusters(prev => prev.map(cluster =>
      cluster.id === clusterId
        ? { ...cluster, isExpanded: !cluster.isExpanded }
        : cluster
    ));
  }, []);

  // Delete cluster
  const deleteCluster = useCallback((clusterId: string) => {
    setClusters(prev => prev.filter(cluster => cluster.id !== clusterId));
  }, []);

  // Update cluster position
  const updateClusterPosition = useCallback((clusterId: string, position: { x: number; y: number }) => {
    setClusters(prev => prev.map(cluster =>
      cluster.id === clusterId
        ? { ...cluster, position }
        : cluster
    ));
  }, []);

  return {
    clusters,
    createCluster,
    addCardToCluster,
    removeCardFromCluster,
    toggleCluster,
    deleteCluster,
    updateClusterPosition,
  };
};

// Helper function to generate cluster colors
function generateClusterColor(): string {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
