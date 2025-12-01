/**
 * Simplified Mode System - Main Router
 *
 * Replaces the complex 9-agent orchestration with 3 simple modes.
 * Detects user intent and routes to the appropriate mode handler.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Mode, ConversationContext, ModeResponse, Item } from './types';
import { brainstormMode } from './brainstormMode';
import { decideMode } from './decideMode';
import { exportMode } from './exportMode';
import { supabase } from '../services/supabase';

// Singleton Anthropic client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('[SimpleModes] Initialized Anthropic client');
  }
  return client;
}

/**
 * Simple keyword-based mode detection
 * No AI call needed - just pattern matching
 */
export function detectMode(message: string): Mode {
  const lower = message.toLowerCase().trim();

  // Export mode triggers
  if (
    lower.startsWith('/export') ||
    lower.startsWith('/summary') ||
    lower.startsWith('/prd') ||
    lower.startsWith('/tasks') ||
    lower.startsWith('/roadmap') ||
    lower.includes('generate a summary') ||
    lower.includes('generate a prd') ||
    lower.includes('create a roadmap') ||
    lower.includes('export my')
  ) {
    return 'export';
  }

  // Decide mode triggers
  if (
    lower.includes("i've decided") ||
    lower.includes("i have decided") ||
    lower.includes("we've decided") ||
    lower.includes("we have decided") ||
    lower.includes("let's go with") ||
    lower.includes("lets go with") ||
    lower.includes("decision:") ||
    lower.includes("my decision is") ||
    lower.includes("final decision") ||
    lower.includes("i'm going with") ||
    lower.includes("we're going with") ||
    lower.startsWith("decided:") ||
    lower.startsWith("/decide")
  ) {
    return 'decide';
  }

  // Default to brainstorm
  return 'brainstorm';
}

/**
 * Load context from database
 */
async function loadContext(projectId: string): Promise<ConversationContext> {
  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('title, items')
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error('[SimpleModes] Error loading project:', projectError);
    throw new Error('Failed to load project');
  }

  // Get recent messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (messagesError) {
    console.error('[SimpleModes] Error loading messages:', messagesError);
  }

  // Parse items from project (handle both old and new format)
  const items: Item[] = (project.items || []).map((item: any) => ({
    id: item.id,
    text: item.text || item.content,
    type: item.type || (item.state === 'decided' ? 'decision' : 'idea'),
    tags: item.tags,
    createdAt: item.createdAt || item.created_at,
  }));

  const ideas = items.filter(i => i.type === 'idea');
  const decisions = items.filter(i => i.type === 'decision');

  // Reverse messages to chronological order
  const recentMessages = (messages || [])
    .reverse()
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  return {
    projectId,
    projectTitle: project.title || 'Untitled Project',
    ideas,
    decisions,
    recentMessages,
  };
}

/**
 * Save items to database
 */
async function saveItems(projectId: string, newItems: Item[]): Promise<void> {
  if (newItems.length === 0) return;

  // Get current items
  const { data: project, error: getError } = await supabase
    .from('projects')
    .select('items')
    .eq('id', projectId)
    .single();

  if (getError) {
    console.error('[SimpleModes] Error getting project items:', getError);
    throw new Error('Failed to get project items');
  }

  // Merge new items with existing
  const existingItems = project.items || [];
  const updatedItems = [...existingItems, ...newItems];

  // Update project
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      items: updatedItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (updateError) {
    console.error('[SimpleModes] Error saving items:', updateError);
    throw new Error('Failed to save items');
  }

  console.log(`[SimpleModes] Saved ${newItems.length} items to project`);
}

/**
 * Save message to database
 */
async function saveMessage(
  projectId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  mode: Mode
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    project_id: projectId,
    user_id: userId,
    role,
    content,
    agent_type: `simple_${mode}`, // Track which mode was used
    metadata: { mode, simplified: true },
  });

  if (error) {
    console.error('[SimpleModes] Error saving message:', error);
    // Don't throw - message saving is not critical
  }
}

/**
 * Main entry point - handles a user message
 */
export async function handleMessage(
  message: string,
  projectId: string,
  userId: string
): Promise<ModeResponse> {
  console.log(`[SimpleModes] Processing message for project ${projectId}`);

  const startTime = Date.now();

  // 1. Detect mode (instant, no API call)
  const mode = detectMode(message);
  console.log(`[SimpleModes] Detected mode: ${mode}`);

  // 2. Load context from database
  const context = await loadContext(projectId);
  console.log(`[SimpleModes] Loaded context: ${context.ideas.length} ideas, ${context.decisions.length} decisions`);

  // 3. Save user message
  await saveMessage(projectId, userId, 'user', message, mode);

  // 4. Route to appropriate mode handler
  const anthropicClient = getClient();
  let response: ModeResponse;

  switch (mode) {
    case 'decide':
      response = await decideMode(anthropicClient, message, context);
      break;
    case 'export':
      response = await exportMode(anthropicClient, message, context);
      break;
    default:
      response = await brainstormMode(anthropicClient, message, context);
  }

  // 5. Save assistant response
  await saveMessage(projectId, userId, 'assistant', response.message, mode);

  // 6. Save any extracted items
  if (response.extractedItems.length > 0) {
    await saveItems(projectId, response.extractedItems);
  }

  const duration = Date.now() - startTime;
  console.log(`[SimpleModes] Completed in ${duration}ms (1 API call)`);

  return response;
}

// Re-export types
export * from './types';
