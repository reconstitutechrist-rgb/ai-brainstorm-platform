import { useState, useMemo } from 'react';
import type { ProjectItem } from '../types';

export const useArchive = (projectItems: ProjectItem[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ProjectItem['state']>('all');

  // Get archived cards from project items
  const archivedCards = useMemo(() => {
    return projectItems.filter(item => item.isArchived);
  }, [projectItems]);

  // Get filtered cards based on search and filter
  const filteredCards = useMemo(() => {
    return archivedCards.filter(card => {
      const matchesSearch = searchQuery === '' ||
        card.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesType = filterType === 'all' || card.state === filterType;

      return matchesSearch && matchesType;
    });
  }, [archivedCards, searchQuery, filterType]);

  return {
    archivedCards,
    filteredCards,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
  };
};
