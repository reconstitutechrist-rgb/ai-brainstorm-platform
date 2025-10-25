import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExtractedIdea {
  id: string;
  source: 'user_mention' | 'ai_suggestion' | 'collaborative';
  conversationContext: {
    messageId: string;
    timestamp: string;
    leadingQuestions: string[];
    topic?: string;
    topicConfidence?: number;
    relatedMessageIds?: string[];
  };
  idea: {
    title: string;
    description: string;
    reasoning: string;
    userIntent: string;
  };
  status: 'mentioned' | 'exploring' | 'refined' | 'ready_to_extract';
  evolution: any[];
  tags: string[];
  innovationLevel: 'practical' | 'moderate' | 'experimental';
}

export interface TopicGroup {
  topic: string;
  icon: string;
  ideas: ExtractedIdea[];
  messageRange: {
    start: string;
    end: string;
  };
}

/**
 * Context Grouping Service
 *
 * Analyzes conversation flow and groups ideas by topic/context
 * using AI-powered topic identification
 */
export class ContextGroupingService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Main method: Group ideas by conversation context/topic
   */
  async groupIdeasByContext(
    ideas: ExtractedIdea[],
    conversationHistory: Message[]
  ): Promise<TopicGroup[]> {
    console.log(`[ContextGrouping] Grouping ${ideas.length} ideas from ${conversationHistory.length} messages`);

    if (ideas.length === 0) {
      return [];
    }

    // Step 1: Identify distinct topics from conversation
    const topics = await this.identifyConversationTopics(conversationHistory, ideas);
    console.log(`[ContextGrouping] Identified ${topics.length} topics:`, topics);

    // Step 2: Map each idea to most relevant topic
    const grouped: { [topic: string]: ExtractedIdea[] } = {};
    const topicIcons: { [topic: string]: string } = {};
    const topicMessageRanges: { [topic: string]: { start: string; end: string } } = {};

    for (const topicInfo of topics) {
      grouped[topicInfo.topic] = [];
      topicIcons[topicInfo.topic] = topicInfo.icon || '💡';
      topicMessageRanges[topicInfo.topic] = topicInfo.messageRange || { start: '', end: '' };
    }

    // Assign ideas to topics
    for (const idea of ideas) {
      const assignment = await this.matchIdeaToTopic(idea, topics, conversationHistory);

      if (!grouped[assignment.topic]) {
        grouped[assignment.topic] = [];
        topicIcons[assignment.topic] = '💡';
      }

      // Enhance idea with topic context
      const enhancedIdea: ExtractedIdea = {
        ...idea,
        conversationContext: {
          ...idea.conversationContext,
          topic: assignment.topic,
          topicConfidence: assignment.confidence,
          relatedMessageIds: assignment.relatedMessageIds,
        },
      };

      grouped[assignment.topic].push(enhancedIdea);
    }

    // Step 3: Convert to TopicGroup array
    const topicGroups: TopicGroup[] = Object.entries(grouped)
      .filter(([_, ideas]) => ideas.length > 0)
      .map(([topic, ideas]) => ({
        topic,
        icon: topicIcons[topic],
        ideas,
        messageRange: topicMessageRanges[topic] || { start: '', end: '' },
      }))
      .sort((a, b) => {
        // Sort by first message appearance
        const aTime = a.ideas[0]?.conversationContext?.timestamp || '';
        const bTime = b.ideas[0]?.conversationContext?.timestamp || '';
        return aTime.localeCompare(bTime);
      });

    console.log(`[ContextGrouping] Created ${topicGroups.length} topic groups`);
    return topicGroups;
  }

  /**
   * Use Claude AI to identify distinct topics discussed in conversation
   */
  private async identifyConversationTopics(
    messages: Message[],
    ideas: ExtractedIdea[]
  ): Promise<Array<{ topic: string; icon: string; messageRange: { start: string; end: string } }>> {

    const conversationText = messages
      .slice(-30) // Use last 30 messages for context
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n');

    const ideasText = ideas
      .map((idea, i) => `${i + 1}. ${idea.idea.title}: ${idea.idea.description}`)
      .join('\n');

    const prompt = `Analyze this brainstorm conversation and identify distinct topics discussed.

CONVERSATION:
${conversationText}

IDEAS EXTRACTED:
${ideasText}

TASK: Identify 2-5 distinct topics/themes that group these ideas. Each topic should:
- Represent a coherent theme or feature area
- Have a clear, concise name (2-4 words)
- Have an appropriate emoji icon
- Group related ideas together

Return ONLY valid JSON (no markdown, no explanation):
[
  {
    "topic": "Authentication Strategy",
    "icon": "🔐",
    "description": "Login and user identity features"
  },
  {
    "topic": "Mobile Support",
    "icon": "📱",
    "description": "Mobile app and responsive design"
  }
]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Clean response and parse JSON
        let cleanResponse = content.text.trim();
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const topics = JSON.parse(cleanResponse);

        // Add message ranges (approximate based on idea timestamps)
        return topics.map((t: any) => ({
          ...t,
          messageRange: { start: '', end: '' }, // Will be filled by actual message IDs if needed
        }));
      }

      // Fallback
      return [{ topic: 'General Ideas', icon: '💡', messageRange: { start: '', end: '' } }];
    } catch (error) {
      console.error('[ContextGrouping] Error identifying topics:', error);
      return [{ topic: 'General Ideas', icon: '💡', messageRange: { start: '', end: '' } }];
    }
  }

  /**
   * Match an idea to the most relevant topic
   */
  private async matchIdeaToTopic(
    idea: ExtractedIdea,
    topics: Array<{ topic: string; icon: string }>,
    conversationHistory: Message[]
  ): Promise<{
    topic: string;
    confidence: number;
    relatedMessageIds: string[];
  }> {

    const topicNames = topics.map(t => t.topic).join(', ');

    const prompt = `Match this idea to the most relevant topic.

IDEA:
Title: ${idea.idea.title}
Description: ${idea.idea.description}
Reasoning: ${idea.idea.reasoning}

AVAILABLE TOPICS:
${topicNames}

Return ONLY valid JSON (no markdown):
{
  "topic": "Authentication Strategy",
  "confidence": 95,
  "reasoning": "Idea clearly relates to user login and identity"
}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        let cleanResponse = content.text.trim();
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const match = JSON.parse(cleanResponse);

        // Find related messages (messages that mention this idea)
        const relatedMessageIds = this.findRelatedMessages(idea, conversationHistory);

        return {
          topic: match.topic,
          confidence: match.confidence || 80,
          relatedMessageIds,
        };
      }

      // Fallback: assign to first topic
      return {
        topic: topics[0]?.topic || 'General Ideas',
        confidence: 50,
        relatedMessageIds: [],
      };
    } catch (error) {
      console.error('[ContextGrouping] Error matching idea to topic:', error);
      return {
        topic: topics[0]?.topic || 'General Ideas',
        confidence: 50,
        relatedMessageIds: [],
      };
    }
  }

  /**
   * Find messages in conversation that are related to this idea
   */
  private findRelatedMessages(idea: ExtractedIdea, messages: Message[]): string[] {
    const relatedIds: string[] = [];

    // Simple keyword matching
    const keywords = [
      ...idea.idea.title.toLowerCase().split(' '),
      ...idea.tags,
    ].filter(k => k.length > 3); // Only meaningful words

    for (const message of messages) {
      const contentLower = message.content.toLowerCase();

      // Check if message mentions keywords from the idea
      const matchCount = keywords.filter(keyword =>
        contentLower.includes(keyword.toLowerCase())
      ).length;

      if (matchCount >= 2) { // At least 2 keyword matches
        relatedIds.push(message.id);
      }
    }

    return relatedIds;
  }

  /**
   * Get chronological topic flow (topic transitions over time)
   */
  getTopicFlow(topicGroups: TopicGroup[]): string[] {
    return topicGroups.map(g => g.topic);
  }

  /**
   * Get statistics about grouping
   */
  getGroupingStats(topicGroups: TopicGroup[]): {
    totalTopics: number;
    totalIdeas: number;
    averageIdeasPerTopic: number;
    largestTopic: string;
    smallestTopic: string;
  } {
    if (topicGroups.length === 0) {
      return {
        totalTopics: 0,
        totalIdeas: 0,
        averageIdeasPerTopic: 0,
        largestTopic: '',
        smallestTopic: '',
      };
    }

    const totalIdeas = topicGroups.reduce((sum, g) => sum + g.ideas.length, 0);
    const sorted = [...topicGroups].sort((a, b) => b.ideas.length - a.ideas.length);

    return {
      totalTopics: topicGroups.length,
      totalIdeas,
      averageIdeasPerTopic: totalIdeas / topicGroups.length,
      largestTopic: sorted[0]?.topic || '',
      smallestTopic: sorted[sorted.length - 1]?.topic || '',
    };
  }
}
