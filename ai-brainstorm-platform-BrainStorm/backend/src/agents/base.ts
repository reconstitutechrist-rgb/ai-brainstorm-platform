import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { AI_MODELS, getModelForAgent } from '../config/aiModels';

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
  protected defaultModel: string;

  constructor(name: string, systemPrompt: string, model?: string) {
    // Use shared singleton client instead of creating new instance per agent
    this.client = getSharedAnthropicClient();
    this.name = name;
    this.systemPrompt = systemPrompt;
    // Auto-select model based on agent name, or use provided model, or fallback to Sonnet
    this.defaultModel = model || getModelForAgent(name) || AI_MODELS.SONNET;
    this.log(`Initialized with model: ${this.defaultModel}`);
  }

  /**
   * Sanitize text content to remove invalid Unicode characters that break JSON encoding
   */
  protected sanitizeText(text: string): string {
    if (!text) return '';

    try {
      // Step 1: Remove all surrogate code units to prevent JSON encoding issues
      let sanitized = text.replace(/[\uD800-\uDFFF]/g, '');

      // Step 2: Remove control characters except newlines, tabs, and carriage returns
      sanitized = sanitized.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

      // Step 3: Replace replacement characters with question marks
      sanitized = sanitized.replace(/\uFFFD/g, '?');

      // Step 4: Ensure it's valid UTF-8 by converting through Buffer
      const buffer = Buffer.from(sanitized, 'utf8');
      sanitized = buffer.toString('utf8');

      return sanitized;
    } catch (error) {
      console.error(`[${this.name}] Text sanitization error:`, error);
      // Fallback: keep only printable ASCII characters
      return text.replace(/[^\x20-\x7E\n\r\t]/g, '');
    }
  }

  protected async callClaude(
    messages: Array<{ role: string; content: string | any[] }>,
    maxTokens: number = 1000,
    model?: string
  ): Promise<string> {
    try {
      const selectedModel = model || this.defaultModel;
      this.log(`Calling Claude API (${selectedModel}) with ${messages.length} messages...`);
      const startTime = Date.now();

      const response = await this.client.messages.create({
        model: selectedModel,
        max_tokens: maxTokens,
        system: this.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string' ? this.sanitizeText(msg.content) : msg.content,
        })),
      });

      const duration = Date.now() - startTime;
      this.log(`Claude API (${selectedModel}) responded in ${duration}ms`);

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      this.log(`Received ${text.length} characters`);

      return text;
    } catch (error: any) {
      console.error(`${this.name} Claude API error:`, error.message || error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Call Claude with vision support for image analysis
   */
  protected async callClaudeVision(
    textPrompt: string,
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    maxTokens: number = 2000,
    model?: string
  ): Promise<string> {
    try {
      const selectedModel = model || this.defaultModel;
      this.log(`Calling Claude Vision API (${selectedModel}) with image...`);
      const startTime = Date.now();

      const response = await this.client.messages.create({
        model: selectedModel,
        max_tokens: maxTokens,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: textPrompt,
              },
            ],
          },
        ],
      });

      const duration = Date.now() - startTime;
      this.log(`Claude Vision API (${selectedModel}) responded in ${duration}ms`);

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      this.log(`Received ${text.length} characters`);

      return text;
    } catch (error: any) {
      console.error(`${this.name} Claude Vision API error:`, error.message || error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
