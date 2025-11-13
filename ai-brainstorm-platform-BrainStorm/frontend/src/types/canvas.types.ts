// Canvas Capacity Types
export interface CardCapacityState {
  activeCards: number;
  archivedCards: number;
  totalCards: number;
  capacityPercentage: number;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
}

export interface ArchiveCard {
  id: string;
  content: string;
  type: 'decided' | 'exploring' | 'question' | 'concern' | 'parked';
  confidence?: number;
  tags: string[];
  archivedAt: Date;
  createdAt: Date;
  position?: { x: number; y: number };
  clusterId?: string;
}

export interface Cluster {
  id: string;
  name: string;
  description?: string;
  cardIds: string[];
  color: string;
  isExpanded: boolean;
  position: { x: number; y: number };
  createdAt: Date;
}

export interface SessionSnapshot {
  id: string;
  name: string;
  description?: string;
  timestamp: Date;
  activeCards: ArchiveCard[];
  archivedCards: ArchiveCard[];
  clusters: Cluster[];
  canvasState: any; // Canvas-specific state
}

export interface CapacityWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  suggestions: readonly string[];
  threshold: number;
}

// Constants
export const CAPACITY_LIMITS = {
  SOFT_LIMIT: 15,
  WARNING_LIMIT: 20,
  HARD_LIMIT: 30,
  INFO_THRESHOLD: 12,
} as const;

export const CAPACITY_MESSAGES = {
  INFO: {
    level: 'info' as const,
    threshold: 12,
    message: "You have 12 ideas on the canvas. Would you like me to organize them into themes?",
    suggestions: [
      "Create clusters to group related ideas",
      "Archive older or less relevant cards",
      "Continue adding more ideas"
    ]
  },
  WARNING: {
    level: 'warning' as const,
    threshold: 20,
    message: "The canvas is getting crowded with 20 cards. Let's organize to keep things clear.",
    suggestions: [
      "Cluster related cards automatically",
      "Archive 'Parked' ideas to sidebar",
      "Mark completed cards as done"
    ]
  },
  CRITICAL: {
    level: 'critical' as const,
    threshold: 30,
    message: "Canvas is at capacity (30 cards). Please organize before adding more.",
    suggestions: [
      "Archive 5+ cards to sidebar (required)",
      "Create clusters to free space",
      "Mark completed cards as done",
      "Delete unnecessary cards"
    ]
  }
} as const;
