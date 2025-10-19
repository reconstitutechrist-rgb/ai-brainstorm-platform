import { useState, useEffect, useCallback } from 'react';
import type { CardCapacityState, CapacityWarning } from '../types/canvas.types';
import { CAPACITY_LIMITS, CAPACITY_MESSAGES } from '../types/canvas.types';

export const useCardCapacity = (activeCardCount: number, archivedCardCount: number) => {
  const [capacityState, setCapacityState] = useState<CardCapacityState>({
    activeCards: 0,
    archivedCards: 0,
    totalCards: 0,
    capacityPercentage: 0,
    warningLevel: 'none',
  });

  const [currentWarning, setCurrentWarning] = useState<CapacityWarning | null>(null);
  const [hasShownWarning, setHasShownWarning] = useState<Record<number, boolean>>({});

  // Calculate capacity state
  useEffect(() => {
    const totalCards = activeCardCount + archivedCardCount;
    const capacityPercentage = (activeCardCount / CAPACITY_LIMITS.HARD_LIMIT) * 100;

    let warningLevel: CardCapacityState['warningLevel'] = 'none';
    if (activeCardCount >= CAPACITY_LIMITS.HARD_LIMIT) {
      warningLevel = 'critical';
    } else if (activeCardCount >= CAPACITY_LIMITS.WARNING_LIMIT) {
      warningLevel = 'warning';
    } else if (activeCardCount >= CAPACITY_LIMITS.INFO_THRESHOLD) {
      warningLevel = 'info';
    }

    setCapacityState({
      activeCards: activeCardCount,
      archivedCards: archivedCardCount,
      totalCards,
      capacityPercentage,
      warningLevel,
    });
  }, [activeCardCount, archivedCardCount]);

  // Check for warnings
  useEffect(() => {
    if (activeCardCount >= CAPACITY_LIMITS.HARD_LIMIT && !hasShownWarning[30]) {
      setCurrentWarning(CAPACITY_MESSAGES.CRITICAL);
      setHasShownWarning(prev => ({ ...prev, 30: true }));
    } else if (activeCardCount >= CAPACITY_LIMITS.WARNING_LIMIT && !hasShownWarning[20]) {
      setCurrentWarning(CAPACITY_MESSAGES.WARNING);
      setHasShownWarning(prev => ({ ...prev, 20: true }));
    } else if (activeCardCount >= CAPACITY_LIMITS.INFO_THRESHOLD && !hasShownWarning[12]) {
      setCurrentWarning(CAPACITY_MESSAGES.INFO);
      setHasShownWarning(prev => ({ ...prev, 12: true }));
    }
  }, [activeCardCount, hasShownWarning]);

  const dismissWarning = useCallback(() => {
    setCurrentWarning(null);
  }, []);

  const resetWarnings = useCallback(() => {
    setHasShownWarning({});
    setCurrentWarning(null);
  }, []);

  const canAddCard = activeCardCount < CAPACITY_LIMITS.HARD_LIMIT;

  return {
    capacityState,
    currentWarning,
    dismissWarning,
    resetWarnings,
    canAddCard,
  };
};
