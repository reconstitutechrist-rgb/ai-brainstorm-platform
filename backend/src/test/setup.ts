/**
 * Test setup file for backend tests
 * Loads environment variables and sets up test environment
 */

import dotenv from 'dotenv';
import { vi, beforeEach } from 'vitest';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error,
};
