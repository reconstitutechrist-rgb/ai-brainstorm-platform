import { HelpCircle, AlertCircle, Info, Brain, CheckCircle, Search, Lightbulb } from 'lucide-react';

export interface AgentConfig {
  type: string;
  name: string;
  displayName: string;
  color: string;
  glowColor: string;
  icon: any;
  description: string;
  greeting?: string;
}

export const agentConfig: Record<string, AgentConfig> = {
  questioner: {
    type: 'questioner',
    name: 'QuestionerAgent',
    displayName: 'Questioner',
    color: '#3B82F6', // Blue
    glowColor: 'rgba(59, 130, 246, 0.5)',
    icon: HelpCircle,
    description: 'Asks strategic questions to clarify your vision',
    greeting: "I'm here to help clarify your ideas through thoughtful questions.",
  },
  clarification: {
    type: 'clarification',
    name: 'ClarificationAgent',
    displayName: 'Clarification',
    color: '#F59E0B', // Amber
    glowColor: 'rgba(245, 158, 11, 0.5)',
    icon: AlertCircle,
    description: 'Resolves ambiguities and conflicts in your project',
    greeting: "I'll help resolve any ambiguities or conflicts in your decisions.",
  },
  gapDetection: {
    type: 'gapDetection',
    name: 'GapDetectionAgent',
    displayName: 'Gap Detection',
    color: '#F97316', // Orange
    glowColor: 'rgba(249, 115, 22, 0.5)',
    icon: Info,
    description: 'Identifies missing information in your project',
    greeting: "I'll identify any missing information that's important for your project.",
  },
  brainstorming: {
    type: 'brainstorming',
    name: 'BrainstormingAgent',
    displayName: 'Brainstorming',
    color: '#8B5CF6', // Purple
    glowColor: 'rgba(139, 92, 246, 0.5)',
    icon: Lightbulb,
    description: 'Reflects on your ideas and generates insights',
    greeting: "Let's brainstorm and explore your ideas together!",
  },
  verification: {
    type: 'verification',
    name: 'VerificationAgent',
    displayName: 'Verification',
    color: '#10B981', // Green
    glowColor: 'rgba(16, 185, 129, 0.5)',
    icon: CheckCircle,
    description: 'Verifies the accuracy of recorded information',
    greeting: "I'll verify that everything is recorded accurately.",
  },
  assumptionBlocker: {
    type: 'assumptionBlocker',
    name: 'AssumptionBlockerAgent',
    displayName: 'Assumption Blocker',
    color: '#EF4444', // Red
    glowColor: 'rgba(239, 68, 68, 0.5)',
    icon: AlertCircle,
    description: 'Prevents assumptions by ensuring everything is explicit',
    greeting: "I'll make sure we're not making any unspoken assumptions.",
  },
  reviewer: {
    type: 'reviewer',
    name: 'ReviewerAgent',
    displayName: 'Reviewer',
    color: '#6366F1', // Indigo
    glowColor: 'rgba(99, 102, 241, 0.5)',
    icon: Search,
    description: 'Reviews conversations for completeness and accuracy',
    greeting: "I'll review the conversation to ensure nothing was missed.",
  },
};

// Helper to get agent config by agent type string
export const getAgentConfig = (agentType: string): AgentConfig | null => {
  // Normalize agent type (remove 'Agent' suffix if present)
  const normalizedType = agentType.replace(/Agent$/i, '').toLowerCase();

  // Try exact match first
  if (agentConfig[normalizedType]) {
    return agentConfig[normalizedType];
  }

  // Try fuzzy match
  for (const key in agentConfig) {
    if (normalizedType.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedType)) {
      return agentConfig[key];
    }
  }

  // Return default if not found
  return {
    type: normalizedType,
    name: agentType,
    displayName: agentType.replace(/Agent$/i, ''),
    color: '#6B7280', // Gray
    glowColor: 'rgba(107, 114, 128, 0.5)',
    icon: Brain,
    description: 'AI Assistant',
    greeting: "I'm here to help with your project.",
  };
};

// Helper to check if an agent type asks questions
export const isQuestionAgent = (agentType: string): boolean => {
  const normalizedType = agentType.replace(/Agent$/i, '').toLowerCase();
  return ['questioner', 'clarification', 'gapdetection'].includes(normalizedType);
};

// Helper to get agent display name
export const getAgentDisplayName = (agentType: string): string => {
  const config = getAgentConfig(agentType);
  return config?.displayName || agentType.replace(/Agent$/i, '');
};

// Helper to get agent color
export const getAgentColor = (agentType: string): string => {
  const config = getAgentConfig(agentType);
  return config?.color || '#6B7280';
};

// Helper to get agent icon
export const getAgentIcon = (agentType: string): any => {
  const config = getAgentConfig(agentType);
  return config?.icon || Brain;
};
