import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Anthropic API globally for tests
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        id: 'msg_test',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isEndIntent: true,
              confidence: 95,
              topics: ['Authentication'],
              accepted: [],
              rejected: [],
              unmarked: [],
              needsClarification: false,
            }),
          },
        ],
        model: 'claude-sonnet-4-20250514',
        role: 'assistant',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      }),
    },
  })),
}));

// Global test utilities
global.console = {
  ...console,
  error: vi.fn(), // Suppress error logs in tests
  warn: vi.fn(), // Suppress warning logs in tests
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
