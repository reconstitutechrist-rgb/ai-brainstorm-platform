import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClusterSuggestion {
  name: string;
  description: string;
  cardIds: string[];
  position: { x: number; y: number };
  color: string;
  reasoning: string;
}

export interface OrganizationSuggestion {
  id: string;
  type: 'canvas-organize' | 'canvas-layout' | 'canvas-cleanup';
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  actionData: {
    action: 'cluster-cards' | 'optimize-layout' | 'archive-cards';
    clusters?: ClusterSuggestion[];
    cardIdsToArchive?: string[];
    layout?: 'grid' | 'flow' | 'circular';
  };
}

export class CanvasAnalysisService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Analyze project items and suggest intelligent clustering based on semantic similarity
   */
  async analyzeCardsForClustering(
    items: any[],
    threshold: number = 5
  ): Promise<ClusterSuggestion[]> {
    // Need at least 5 cards to suggest clustering
    if (items.length < threshold) {
      return [];
    }

    console.log(`[CanvasAnalysis] Analyzing ${items.length} cards for clustering`);

    // Prepare card data for AI analysis
    const cardData = items.map((item, index) => ({
      id: item.id,
      text: item.text || '',
      state: item.state || 'exploring',
      index: index + 1,
    }));

    // Build AI prompt
    const prompt = `You are an expert at organizing and clustering related ideas on a visual canvas.

Analyze these ${cardData.length} cards and group them into meaningful clusters based on semantic similarity and context:

${cardData.map(card => `[Card ${card.index}] (${card.state}): ${card.text}`).join('\n')}

CLUSTERING RULES:
1. Create 2-5 clusters maximum (avoid too many small groups)
2. Each cluster should have at least 2 cards
3. Cluster names should be clear, concise themes (2-4 words)
4. Cards in a cluster should have related topics, features, or goals
5. If a card doesn't fit any cluster, put it in a "Miscellaneous" cluster
6. Provide reasoning for each cluster

POSITIONING:
- Place clusters in a grid layout
- First cluster at (100, 100)
- Subsequent clusters spaced 350px apart horizontally
- Use different rows if needed (300px vertical spacing)

RESPONSE FORMAT (valid JSON only):
{
  "clusters": [
    {
      "name": "Cluster Name",
      "description": "Brief description of this theme",
      "cardIds": ["card-id-1", "card-id-2"],
      "position": { "x": 100, "y": 100 },
      "color": "#3B82F6",
      "reasoning": "Why these cards belong together"
    }
  ]
}

AVAILABLE COLORS (use these exact hex codes):
- "#3B82F6" (Blue)
- "#10B981" (Green)
- "#F59E0B" (Amber)
- "#EF4444" (Red)
- "#8B5CF6" (Purple)
- "#EC4899" (Pink)
- "#14B8A6" (Teal)

Return ONLY valid JSON, no explanation text.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse AI response
      const cleanResponse = content.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const result = JSON.parse(cleanResponse);

      if (!result.clusters || !Array.isArray(result.clusters)) {
        throw new Error('Invalid clustering response format');
      }

      console.log(`[CanvasAnalysis] Generated ${result.clusters.length} clusters`);

      return result.clusters;
    } catch (error) {
      console.error('[CanvasAnalysis] Error analyzing cards:', error);
      return [];
    }
  }

  /**
   * Generate organization suggestions for a project
   */
  async generateOrganizationSuggestions(
    projectId: string
  ): Promise<OrganizationSuggestion[]> {
    try {
      // Fetch project data
      const { data: project, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !project) {
        throw new Error('Project not found');
      }

      const items = project.items || [];
      const activeItems = items.filter(
        (item: any) => !item.isArchived && (item.state === 'decided' || item.state === 'exploring')
      );

      const suggestions: OrganizationSuggestion[] = [];

      // Suggestion 1: Cluster cards if we have 12+
      if (activeItems.length >= 12) {
        const clusters = await this.analyzeCardsForClustering(activeItems, 12);

        if (clusters.length > 0) {
          suggestions.push({
            id: `org-cluster-${Date.now()}`,
            type: 'canvas-organize',
            title: 'Organize Canvas: Group Related Cards',
            description: `Automatically cluster ${activeItems.length} cards into ${clusters.length} themed groups for better organization`,
            reasoning: `You have ${activeItems.length} cards on the canvas. Clustering them into ${clusters.length} semantic groups will make it easier to navigate and understand your project.`,
            priority: activeItems.length >= 20 ? 'high' : 'medium',
            actionData: {
              action: 'cluster-cards',
              clusters: clusters,
            },
          });
        }
      }

      // Suggestion 2: Archive old parked items
      const parkedItems = items.filter((item: any) => item.state === 'parked' && !item.isArchived);
      if (parkedItems.length >= 5) {
        suggestions.push({
          id: `org-archive-${Date.now()}`,
          type: 'canvas-cleanup',
          title: 'Clean Up Canvas: Archive Parked Ideas',
          description: `Move ${parkedItems.length} parked ideas to the archive sidebar to declutter`,
          reasoning: `These ${parkedItems.length} parked ideas are taking up canvas space. Archiving them will keep your active workspace focused while preserving them for later.`,
          priority: 'low',
          actionData: {
            action: 'archive-cards',
            cardIdsToArchive: parkedItems.map((item: any) => item.id),
          },
        });
      }

      // Suggestion 3: Optimize layout if cards are scattered
      if (activeItems.length >= 8) {
        const hasPositions = activeItems.some((item: any) => item.position);

        if (hasPositions) {
          // Calculate position variance
          const positions = activeItems
            .filter((item: any) => item.position)
            .map((item: any) => item.position);

          if (positions.length > 0) {
            const avgX = positions.reduce((sum: number, p: any) => sum + (p.x || 0), 0) / positions.length;
            const avgY = positions.reduce((sum: number, p: any) => sum + (p.y || 0), 0) / positions.length;

            const variance = positions.reduce((sum: number, p: any) => {
              return sum + Math.pow((p.x || 0) - avgX, 2) + Math.pow((p.y || 0) - avgY, 2);
            }, 0) / positions.length;

            // If variance is high (cards scattered), suggest optimization
            if (variance > 50000) {
              suggestions.push({
                id: `org-layout-${Date.now()}`,
                type: 'canvas-layout',
                title: 'Optimize Canvas Layout',
                description: `Reorganize ${activeItems.length} cards into a clean grid layout`,
                reasoning: 'Your cards are scattered across the canvas. An optimized grid layout will make them easier to scan and navigate.',
                priority: 'low',
                actionData: {
                  action: 'optimize-layout',
                  layout: 'grid',
                },
              });
            }
          }
        }
      }

      console.log(`[CanvasAnalysis] Generated ${suggestions.length} organization suggestions`);
      return suggestions;
    } catch (error) {
      console.error('[CanvasAnalysis] Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Apply clustering to a project
   */
  async applyClustering(
    projectId: string,
    clusters: ClusterSuggestion[]
  ): Promise<any> {
    try {
      const { data: project, error: fetchError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (fetchError || !project) {
        throw new Error('Project not found');
      }

      const items = project.items || [];

      // Update positions for all cards in clusters
      const updatedItems = items.map((item: any) => {
        // Find which cluster this card belongs to
        const cluster = clusters.find(c => c.cardIds.includes(item.id));

        if (cluster) {
          // Update card position to cluster position with small offset based on index
          const cardIndex = cluster.cardIds.indexOf(item.id);
          const offsetX = (cardIndex % 3) * 120; // 3 cards per row
          const offsetY = Math.floor(cardIndex / 3) * 80; // Row height

          return {
            ...item,
            position: {
              x: cluster.position.x + offsetX,
              y: cluster.position.y + offsetY,
            },
            clusterId: cluster.name.toLowerCase().replace(/\s+/g, '-'),
          };
        }

        return item;
      });

      // Prepare cluster metadata for storage
      const clusterMetadata = clusters.map(cluster => ({
        id: cluster.name.toLowerCase().replace(/\s+/g, '-'),
        name: cluster.name,
        color: cluster.color,
        description: cluster.description,
        position: cluster.position,
      }));

      // Update project with new positions and cluster metadata
      const { data: updatedProject, error: updateError } = await this.supabase
        .from('projects')
        .update({
          items: updatedItems,
          clusters: clusterMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log(`[CanvasAnalysis] Applied ${clusters.length} clusters to project`);
      return updatedProject;
    } catch (error) {
      console.error('[CanvasAnalysis] Error applying clustering:', error);
      throw error;
    }
  }
}
