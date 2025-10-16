import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Singleton Anthropic client instance (optimization: shared across all agents)
let sharedClient: Anthropic | null = null;

function getSharedAnthropicClient(): Anthropic {
  if (!sharedClient) {
    sharedClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('[BaseAgent] Initialized shared Anthropic client');
  }
  return sharedClient;
}

export class BaseAgent {
  protected client: Anthropic;
  protected name: string;
  protected systemPrompt: string;

  constructor(name: string, systemPrompt: string) {
    // Use shared singleton client instead of creating new instance per agent
    this.client = getSharedAnthropicClient();
    this.name = name;
    this.systemPrompt = systemPrompt;
  }

  protected async callClaude(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      this.log(`Calling Claude API with ${messages.length} messages...`);
      const startTime = Date.now();

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: this.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      });

      const duration = Date.now() - startTime;
      this.log(`Claude API responded in ${duration}ms`);

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      this.log(`Received ${text.length} characters`);

      return text;
    } catch (error: any) {
      console.error(`${this.name} Claude API error:`, error.message || error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
