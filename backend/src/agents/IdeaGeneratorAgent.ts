import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class IdeaGeneratorAgent {
  private client: Anthropic;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate creative ideas based on user's project and constraints
   */
  async generateIdeas(params: {
    projectContext: string;
    currentDecisions: any[];
    constraints?: string[];
    direction?: 'innovative' | 'practical' | 'budget' | 'premium' | 'experimental';
    quantity?: number;
  }): Promise<any> {
    const { projectContext, currentDecisions, constraints, direction, quantity = 5 } = params;

    const prompt = this.buildIdeaPrompt(
      projectContext,
      currentDecisions,
      constraints,
      direction,
      quantity
    );

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          ...this.conversationHistory,
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const ideas = this.parseIdeas(content.text);

        // Add to conversation history
        this.conversationHistory.push(
          { role: 'user', content: prompt },
          { role: 'assistant', content: content.text }
        );

        return {
          ideas,
          rawResponse: content.text,
        };
      }
    } catch (error) {
      console.error('Idea generation error:', error);
      throw error;
    }
  }

  /**
   * Build the idea generation prompt
   */
  private buildIdeaPrompt(
    projectContext: string,
    currentDecisions: any[],
    constraints?: string[],
    direction?: string,
    quantity?: number
  ): string {
    const directionGuidance = {
      innovative: 'Focus on cutting-edge, futuristic, and novel approaches',
      practical: 'Focus on realistic, implementable, and proven solutions',
      budget: 'Focus on cost-effective and economical options',
      premium: 'Focus on high-end, luxury, and quality-first approaches',
      experimental: 'Focus on wild, unconventional, and boundary-pushing ideas',
    };

    return `You are the Idea Generator Agent - a creative AI specialized in generating innovative ideas for brainstorming sessions.

PROJECT CONTEXT:
${projectContext}

CURRENT DECISIONS (what the user has already decided):
${currentDecisions.map((d, i) => `${i + 1}. ${d.text}`).join('\n')}

${constraints && constraints.length > 0 ? `CONSTRAINTS:
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}

DIRECTION: ${direction ? directionGuidance[direction as keyof typeof directionGuidance] : 'Generate diverse ideas'}

TASK: Generate ${quantity} creative ideas that:
1. Build upon or complement the existing decisions
2. Respect any stated constraints
3. Follow the specified direction
4. Are concrete and actionable (not vague)
5. Include WHY each idea would work well

For each idea, provide:
- IDEA: Clear, specific description
- WHY IT WORKS: Compelling reasoning
- IMPACT: How it enhances the project
- CONSIDERATIONS: Any trade-offs or things to think about

Format your response as a JSON array:
[
  {
    "id": "idea-1",
    "title": "Short catchy title",
    "description": "Detailed description of the idea",
    "reasoning": "Why this works well for the project",
    "impact": "What value it adds",
    "considerations": "Trade-offs or things to consider",
    "tags": ["tag1", "tag2"],
    "innovationLevel": "practical|moderate|experimental"
  }
]

Generate ideas now:`;
  }

  /**
   * Parse ideas from Claude's response
   */
  private parseIdeas(response: string): any[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: parse manually if JSON not found
      return this.manualParse(response);
    } catch (error) {
      console.error('Idea parsing error:', error);
      return this.manualParse(response);
    }
  }

  /**
   * Manual parsing fallback
   */
  private manualParse(response: string): any[] {
    const ideas: any[] = [];
    const sections = response.split(/IDEA \d+:|Idea \d+:/i).filter(s => s.trim());

    sections.forEach((section, index) => {
      const lines = section.split('\n').filter(l => l.trim());
      const idea: any = {
        id: `idea-${index + 1}`,
        title: '',
        description: '',
        reasoning: '',
        impact: '',
        considerations: '',
        tags: [],
        innovationLevel: 'moderate',
      };

      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('title:') || lower.startsWith('-')) {
          idea.title = line.replace(/^[-\s]*title:\s*/i, '').trim();
        } else if (lower.includes('description:')) {
          idea.description = line.replace(/^[-\s]*description:\s*/i, '').trim();
        } else if (lower.includes('why') || lower.includes('reasoning:')) {
          idea.reasoning = line.replace(/^[-\s]*(why|reasoning):\s*/i, '').trim();
        } else if (lower.includes('impact:')) {
          idea.impact = line.replace(/^[-\s]*impact:\s*/i, '').trim();
        } else if (lower.includes('considerations:') || lower.includes('trade-offs:')) {
          idea.considerations = line.replace(/^[-\s]*(considerations|trade-offs):\s*/i, '').trim();
        }
      });

      if (idea.title || idea.description) {
        ideas.push(idea);
      }
    });

    return ideas;
  }

  /**
   * Refine/expand on a specific idea
   */
  async refineIdea(ideaId: string, idea: any, refinementDirection: string): Promise<any> {
    const prompt = `I want to refine and expand on this idea:

IDEA: ${idea.title}
${idea.description}

REFINEMENT REQUEST: ${refinementDirection}

Please provide:
1. Expanded details on how to implement this
2. Potential variations or alternatives
3. Specific next steps to explore this idea
4. Resources or research needed

Respond in JSON format:
{
  "refinedIdea": "Expanded description",
  "variations": ["variation1", "variation2"],
  "nextSteps": ["step1", "step2"],
  "resources": ["resource1", "resource2"]
}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          ...this.conversationHistory,
          { role: 'user', content: prompt },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Idea refinement error:', error);
      throw error;
    }
  }

  /**
   * Generate ideas that combine multiple existing ideas
   */
  async combineIdeas(ideas: any[]): Promise<any> {
    const prompt = `I have these ideas:

${ideas.map((idea, i) => `${i + 1}. ${idea.title}: ${idea.description}`).join('\n\n')}

Generate 3 innovative combinations that merge elements from 2 or more of these ideas.
Each combination should be MORE than just the sum of parts - create synergy.

Format as JSON:
[
  {
    "title": "Combined idea title",
    "description": "How the ideas work together",
    "sourceIdeas": ["idea-1", "idea-3"],
    "synergy": "Why combining them creates something better",
    "implementation": "How to make it work"
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
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Idea combination error:', error);
      throw error;
    }
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }
}
