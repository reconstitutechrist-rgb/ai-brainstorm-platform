import { BaseAgent } from './base';
import { AgentResponse, ProjectState } from '../types';
import { CanvasAnalysisService, OrganizationSuggestion } from '../services/canvasAnalysisService';
import { SuggestionCacheService, ProjectContext } from '../services/suggestionCache';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Suggestion {
  id: string;
  type: 'action' | 'decision' | 'insight' | 'question' | 'canvas-organize' | 'canvas-layout' | 'canvas-cleanup';
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  agentType: string;
  actionData?: any; // Data needed to execute the suggestion
}

export class SuggestionAgent extends BaseAgent {
  private canvasAnalysisService?: CanvasAnalysisService;
  private cacheService?: SuggestionCacheService;

  constructor(supabase?: SupabaseClient) {
    const systemPrompt = `You are the Suggestion Agent - you provide intelligent, contextual suggestions to help users make progress on their projects.

YOUR PURPOSE:
Analyze the project state, conversation history, and current context to suggest the most helpful next actions.

SUGGESTION TYPES:
1. "action" - Concrete next steps the user should take
2. "decision" - Pending decisions that need to be made
3. "insight" - Observations about the project that could be valuable
4. "question" - Important questions that haven't been answered yet
5. "canvas-organize" - Suggestions to cluster or organize canvas cards
6. "canvas-layout" - Suggestions to optimize canvas layout
7. "canvas-cleanup" - Suggestions to archive or clean up canvas

PRIORITY LEVELS:
- "high": Critical for project success, blocking progress, or time-sensitive
- "medium": Important but not blocking, good next steps
- "low": Nice-to-have improvements or explorations

GENERATE SMART SUGGESTIONS BASED ON:
- Items in "exploring" state that could be decided
- Missing information or gaps in project definition
- Potential conflicts or inconsistencies
- Next logical steps based on recent activity
- Underutilized features (e.g., document generation, reference uploads)
- Stalled conversations or inactive areas

RESPONSE FORMAT:
Return valid JSON array of suggestions:
[
  {
    "id": "unique-id",
    "type": "action|decision|insight|question",
    "title": "Clear, actionable title",
    "description": "1-2 sentence description of what this suggestion involves",
    "reasoning": "Why this suggestion is relevant right now",
    "priority": "high|medium|low",
    "agentType": "which agent would handle this (e.g., 'brainstorming', 'recorder', 'development')",
    "actionData": { "workflowIntent": "deciding", "suggestedMessage": "example user message" }
  }
]

QUALITY CRITERIA:
- Each suggestion must be specific and actionable
- Reasoning must be based on actual project state, not generic
- Limit to 3-5 most relevant suggestions (prioritize quality over quantity)
- Avoid suggesting things the user just did
- Focus on unblocking progress and moving the project forward`;

    super('SuggestionAgent', systemPrompt);

    // Initialize canvas analysis service if supabase client is provided
    if (supabase) {
      this.canvasAnalysisService = new CanvasAnalysisService(supabase);
      this.cacheService = new SuggestionCacheService(supabase);
    }
  }

  async generateSuggestions(
    projectState: ProjectState,
    conversationHistory: any[],
    recentActivity?: string,
    projectId?: string
  ): Promise<Suggestion[]> {
    this.log('Generating contextual suggestions');

    // Analyze project state
    const decidedCount = projectState.decided?.length || 0;
    const exploringCount = projectState.exploring?.length || 0;
    const parkedCount = projectState.parked?.length || 0;
    const totalItems = decidedCount + exploringCount + parkedCount;

    // Build context for caching
    const context: ProjectContext = {
      messageCount: conversationHistory.length,
      decidedCount,
      exploringCount,
      parkedCount,
      recentActivity,
    };

    // Try to get cached suggestions first (allow stale for instant response)
    if (this.cacheService && projectId) {
      const cached = await this.cacheService.getCachedSuggestions(projectId, context, true);
      if (cached) {
        if (cached.isStale) {
          this.log('Using stale cache while revalidating in background');
          // Trigger background regeneration without blocking
          this.regenerateInBackground(projectId, context, projectState, conversationHistory, recentActivity);
        } else {
          this.log('Using fresh cached suggestions');
        }
        return cached.suggestions;
      }
    }

    // Generate canvas organization suggestions if available
    let canvasSuggestions: Suggestion[] = [];
    if (this.canvasAnalysisService && projectId) {
      try {
        const orgSuggestions = await this.canvasAnalysisService.generateOrganizationSuggestions(projectId);
        canvasSuggestions = orgSuggestions.map((org: OrganizationSuggestion) => ({
          id: org.id,
          type: org.type,
          title: org.title,
          description: org.description,
          reasoning: org.reasoning,
          priority: org.priority,
          agentType: 'canvas-organization',
          actionData: org.actionData,
        }));
        this.log(`Generated ${canvasSuggestions.length} canvas organization suggestions`);
      } catch (error) {
        this.log(`Error generating canvas suggestions: ${error}`);
      }
    }

    // CRITICAL FIX: Sanitize conversation history to remove invalid Unicode before processing
    // This prevents JSON encoding errors when sending to Claude API
    const sanitizedHistory = conversationHistory.map(msg => ({
      ...msg,
      content: msg.content ? this.sanitizeText(msg.content) : msg.content
    }));

    // Get recent conversation context (last 10 messages)
    const recentConversation = sanitizedHistory.slice(-10);
    const lastUserMessage = recentConversation.reverse().find(m => m.role === 'user');

    const messages = [
      {
        role: 'user',
        content: `Generate intelligent suggestions for this project.

PROJECT STATE SUMMARY:
- Decided items: ${decidedCount}
- Exploring items: ${exploringCount}
- Parked items: ${parkedCount}
- Total items: ${totalItems}

DECIDED ITEMS:
${projectState.decided?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

EXPLORING ITEMS (need decisions):
${projectState.exploring?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

PARKED ITEMS (might revisit):
${projectState.parked?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

RECENT CONVERSATION (last 10 messages):
${recentConversation.reverse().map((m: any) => `[${m.role}]: ${m.content?.substring(0, 200) || ''}`).join('\n')}

LAST USER MESSAGE: "${lastUserMessage?.content || 'No recent message'}"

${recentActivity ? `RECENT ACTIVITY: ${recentActivity}` : ''}

Based on this context, generate 3-5 highly relevant suggestions that will help the user make progress.
Focus on what's most valuable RIGHT NOW given the current project state.

Return ONLY valid JSON array matching your system prompt format.`,
      },
    ];

    const response = await this.callClaude(messages, 1500);

    // Parse JSON response
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const suggestions: Suggestion[] = JSON.parse(cleanResponse);

    this.log(`Generated ${suggestions.length} AI suggestions`);

    // Combine AI suggestions with canvas organization suggestions
    const allSuggestions = [...canvasSuggestions, ...suggestions];

    this.log(`Total suggestions: ${allSuggestions.length} (${canvasSuggestions.length} canvas + ${suggestions.length} AI)`);

    // Cache the generated suggestions
    if (this.cacheService && projectId) {
      await this.cacheService.cacheSuggestions(projectId, context, allSuggestions);
      this.log('Suggestions cached');
    }

    return allSuggestions;
  }

  /**
   * Regenerate suggestions in the background (for stale-while-revalidate)
   */
  private regenerateInBackground(
    projectId: string,
    context: ProjectContext,
    projectState: ProjectState,
    conversationHistory: any[],
    recentActivity?: string
  ): void {
    // Fire and forget - don't await
    this.generateFreshSuggestions(projectId, context, projectState, conversationHistory, recentActivity)
      .then(() => this.log('Background regeneration complete'))
      .catch(error => this.log(`Background regeneration error: ${error}`));
  }

  /**
   * Generate fresh suggestions and cache them
   */
  private async generateFreshSuggestions(
    projectId: string,
    context: ProjectContext,
    projectState: ProjectState,
    conversationHistory: any[],
    recentActivity?: string
  ): Promise<void> {
    try {
      // Generate canvas organization suggestions if available
      let canvasSuggestions: Suggestion[] = [];
      if (this.canvasAnalysisService) {
        try {
          const orgSuggestions = await this.canvasAnalysisService.generateOrganizationSuggestions(projectId);
          canvasSuggestions = orgSuggestions.map((org: OrganizationSuggestion) => ({
            id: org.id,
            type: org.type,
            title: org.title,
            description: org.description,
            reasoning: org.reasoning,
            priority: org.priority,
            agentType: 'canvas-organization',
            actionData: org.actionData,
          }));
        } catch (error) {
          this.log(`Error generating canvas suggestions: ${error}`);
        }
      }

      // Sanitize conversation history
      const sanitizedHistory = conversationHistory.map(msg => ({
        ...msg,
        content: msg.content ? this.sanitizeText(msg.content) : msg.content
      }));

      const decidedCount = projectState.decided?.length || 0;
      const exploringCount = projectState.exploring?.length || 0;
      const parkedCount = projectState.parked?.length || 0;
      const totalItems = decidedCount + exploringCount + parkedCount;

      // Get recent conversation context
      const recentConversation = sanitizedHistory.slice(-10);
      const lastUserMessage = recentConversation.reverse().find(m => m.role === 'user');

      const messages = [
        {
          role: 'user',
          content: `Generate intelligent suggestions for this project.

PROJECT STATE SUMMARY:
- Decided items: ${decidedCount}
- Exploring items: ${exploringCount}
- Parked items: ${parkedCount}
- Total items: ${totalItems}

DECIDED ITEMS:
${projectState.decided?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

EXPLORING ITEMS (need decisions):
${projectState.exploring?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

PARKED ITEMS (might revisit):
${projectState.parked?.map((item: any) => `- ${item.text}`).join('\n') || 'None yet'}

RECENT CONVERSATION (last 10 messages):
${recentConversation.reverse().map((m: any) => `[${m.role}]: ${m.content?.substring(0, 200) || ''}`).join('\n')}

LAST USER MESSAGE: "${lastUserMessage?.content || 'No recent message'}"

${recentActivity ? `RECENT ACTIVITY: ${recentActivity}` : ''}

Based on this context, generate 3-5 highly relevant suggestions that will help the user make progress.
Focus on what's most valuable RIGHT NOW given the current project state.

Return ONLY valid JSON array matching your system prompt format.`,
        },
      ];

      const response = await this.callClaude(messages, 1500);

      // Parse JSON response
      let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const aiSuggestions: Suggestion[] = JSON.parse(cleanResponse);

      // Combine all suggestions
      const allSuggestions = [...canvasSuggestions, ...aiSuggestions];

      // Cache the generated suggestions
      if (this.cacheService) {
        await this.cacheService.cacheSuggestions(projectId, context, allSuggestions);
        this.log(`Background regeneration: Cached ${allSuggestions.length} fresh suggestions`);
      }
    } catch (error) {
      this.log(`Error in background regeneration: ${error}`);
    }
  }

  /**
   * Generate suggestions specifically for when a project has just been created
   */
  async generateOnboardingSuggestions(projectTitle: string): Promise<Suggestion[]> {
    this.log('Generating onboarding suggestions for new project');

    const suggestions: Suggestion[] = [
      {
        id: 'onboard-1',
        type: 'action',
        title: 'Start brainstorming project requirements',
        description: 'Chat with the AI to explore your ideas and define what you want to build',
        reasoning: 'New project - defining requirements is the critical first step',
        priority: 'high',
        agentType: 'brainstorming',
        actionData: {
          workflowIntent: 'brainstorming',
          suggestedMessage: `Tell me about the key features you want in ${projectTitle}`,
        },
      },
      {
        id: 'onboard-2',
        type: 'insight',
        title: 'Use specialized AI agents',
        description: 'This platform has 18 specialized agents ready to help with architecture, planning, and decisions',
        reasoning: 'Help user understand the multi-agent system capabilities',
        priority: 'medium',
        agentType: 'conversation',
      },
      {
        id: 'onboard-3',
        type: 'action',
        title: 'Upload reference materials',
        description: 'Share documents, specs, or research that will inform this project',
        reasoning: 'Reference materials help agents provide more accurate suggestions',
        priority: 'low',
        agentType: 'referenceAnalysis',
      },
    ];

    return suggestions;
  }
}
