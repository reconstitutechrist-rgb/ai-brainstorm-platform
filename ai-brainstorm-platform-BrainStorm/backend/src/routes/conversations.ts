import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { AgentCoordinationService } from '../services/agentCoordination';
import { EmbeddingService } from '../services/embeddingService';
import { updatesCache } from '../services/updatesCache';
import { ChatOrchestrator } from '../orchestrators/ChatOrchestrator';

const router = Router();
const coordinationService = new AgentCoordinationService();
const chatOrchestrator = new ChatOrchestrator();
const embeddingService = new EmbeddingService(supabase);

// Helper to send SSE events
function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Send message with Server-Sent Events streaming (real-time updates)
 */
router.post('/:projectId/message-stream', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Message and userId are required'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      // Send start event
      sendSSE(res, 'start', { message: 'Processing your message...' });

      // Save user message
      const { data: userMessage, error: saveError } = await supabase
        .from('messages')
        .insert([{
          project_id: projectId,
          user_id: userId,
          role: 'user',
          content: message,
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      sendSSE(res, 'user-message-saved', { message: userMessage });

      // Generate embedding for user message asynchronously (don't await)
      embeddingService.generateAndStoreMessageEmbedding(userMessage.id, message).catch((err: any) => {
        console.error('Failed to generate embedding for user message:', err);
      });

      // Process through agent system with streaming updates
      sendSSE(res, 'agent-processing', { status: 'Classifying intent...' });

      const result = await coordinationService.processUserMessage(projectId, userId, message);
      const { responses, updates, workflow } = result;

      sendSSE(res, 'workflow-determined', {
        intent: workflow.intent,
        confidence: workflow.confidence
      });

      // Save agent responses
      const agentMessages = [];
      for (const response of responses.filter((r: any) => r.showToUser)) {
        sendSSE(res, 'agent-response', {
          agent: response.agent,
          preview: response.message.substring(0, 100)
        });

        const { data: agentMsg, error } = await supabase
          .from('messages')
          .insert([{
            project_id: projectId,
            user_id: userId,
            role: 'assistant',
            content: response.message,
            agent_type: response.agent,
            metadata: response.metadata || {},
          }])
          .select()
          .single();

        if (!error && agentMsg) {
          agentMessages.push(agentMsg);

          // Generate embedding for agent message asynchronously
          embeddingService.generateAndStoreMessageEmbedding(agentMsg.id, response.message).catch((err: any) => {
            console.error('Failed to generate embedding for agent message:', err);
          });
        }
      }

      // Send completion event
      sendSSE(res, 'complete', {
        success: true,
        userMessage,
        agentMessages,
        updates,
        workflow: {
          intent: workflow.intent,
          confidence: workflow.confidence,
        },
      });

      res.end();
    } catch (error: any) {
      console.error('[Conversations Stream] Error:', error);
      sendSSE(res, 'error', {
        message: error.message || 'Processing failed'
      });
      res.end();
    }
  } catch (error: any) {
    console.error('Stream setup error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to setup stream: ${error.message}`
    });
  }
});

/**
 * Send message and get agent responses (non-streaming version for backwards compatibility)
 */
router.post('/:projectId/message', async (req: Request, res: Response) => {
  console.log('🟢 ===== BACKEND ROUTE HIT: POST /:projectId/message =====');
  console.log('  - projectId:', req.params.projectId);
  console.log('  - userId from body:', req.body.userId);
  console.log('  - userId type:', typeof req.body.userId);
  console.log('  - message:', req.body.message?.substring(0, 50) + '...');
  console.log('  - full body:', req.body);

  try {
    const { projectId } = req.params;
    const { message, userId } = req.body;

    if (!message || !userId) {
      console.log('❌ Validation failed - missing message or userId');
      return res.status(400).json({
        success: false,
        error: 'Message and userId are required'
      });
    }

    // Save user message
    const { data: userMessage, error: saveError } = await supabase
      .from('messages')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          role: 'user',
          content: message,
        },
      ])
      .select()
      .single();

    if (saveError) throw saveError;

    // Process through agent system with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Agent processing timeout')), 60000) // 60 second timeout (increased for review workflows)
    );

    let responses: any[] = [];
    let updates: any = { itemsAdded: [], itemsModified: [], itemsMoved: [] };
    let workflow: any = { intent: 'general', confidence: 0 };

    try {
      console.log(`[Conversations] Starting agent processing for message: "${message.substring(0, 50)}..."`);
      const startTime = Date.now();

      const result = await Promise.race([
        coordinationService.processUserMessage(projectId, userId, message),
        timeoutPromise
      ]);

      const processingTime = Date.now() - startTime;
      console.log(`[Conversations] Agent processing completed in ${processingTime}ms`);

      ({ responses, updates, workflow } = result as any);
      console.log(`[Conversations] Received ${responses.length} responses from agents`);
      console.log(`[Conversations] Workflow: ${workflow.intent} (confidence: ${workflow.confidence})`);

      responses.forEach((r: any, i: number) => {
        console.log(`[Conversations] Response ${i}: agent=${r.agent}, showToUser=${r.showToUser}, messageLength=${r.message?.length || 0}`);
      });

      // Filter for user-facing responses
      const userFacingResponses = responses.filter((r: any) => r.showToUser);
      console.log(`[Conversations] ${userFacingResponses.length} responses have showToUser=true`);
    } catch (error: any) {
      console.error('[Conversations] Agent processing timed out or failed:', error.message);
      console.error('[Conversations] Error stack:', error.stack);
      // Continue with empty responses - will trigger fallback below
    }

    // Create response payload with agent messages (but not saved to DB yet)
    const agentMessages = responses
      .filter((r: any) => r.showToUser)
      .map((response: any) => ({
        project_id: projectId,
        user_id: userId,
        role: 'assistant',
        content: response.message,
        agent_type: response.agent,
        metadata: response.metadata || {},
        created_at: new Date().toISOString(), // Add timestamp for frontend display
      }));

    const responseStartTime = Date.now();
    console.log(`[Conversations] ⚡ NON-BLOCKING: Sending response immediately with ${agentMessages.length} agent messages`);
    console.log(`[Conversations] ⏱️  Response being sent at ${new Date().toISOString()} (before DB saves)`);

    // Send response to user IMMEDIATELY (don't wait for DB saves)
    res.json({
      success: true,
      userMessage,
      agentMessages,
      updates,
      workflow: {
        intent: workflow.intent,
        confidence: workflow.confidence,
      },
    });

    // Save agent responses to database in background (non-blocking)
    // This runs AFTER the response is sent to the user
    (async () => {
      const dbSaveStartTime = Date.now();
      console.log(`[Conversations] 📝 Background DB save starting at ${new Date().toISOString()}`);
      try {
        if (agentMessages.length === 0) {
          console.log('[Conversations] No agent responses, saving fallback acknowledgment');
          const { data: simpleMsg, error: fallbackError } = await supabase
            .from('messages')
            .insert([
              {
                project_id: projectId,
                user_id: userId,
                role: 'assistant',
                content: `I received your message: "${message}". The full AI agent system is processing slowly. Your message has been recorded.`,
                agent_type: 'system',
                metadata: {
                  fallback: true,
                },
              },
            ])
            .select()
            .single();

          if (fallbackError) {
            console.error('[Conversations] ❌ Failed to save fallback message:', fallbackError);
          } else {
            console.log('[Conversations] ✅ Fallback message saved');
          }
        } else {
          // Save all agent messages in parallel
          const savePromises = agentMessages.map(async (agentMessage: any) => {
            const { data: agentMsg, error } = await supabase
              .from('messages')
              .insert([agentMessage])
              .select()
              .single();

            if (error) {
              console.error('[Conversations] ❌ Failed to save agent message:', error);
            } else {
              console.log(`[Conversations] ✅ Saved message from ${agentMessage.agent_type}`);

              // Generate embedding for agent message asynchronously
              embeddingService.generateAndStoreMessageEmbedding(agentMsg.id, agentMessage.content).catch((err: any) => {
                console.error('Failed to generate embedding for agent message:', err);
              });
            }

            return agentMsg;
          });

          await Promise.all(savePromises);
          const dbSaveTime = Date.now() - dbSaveStartTime;
          console.log(`[Conversations] ✅ All agent messages saved to database in ${dbSaveTime}ms`);
        }
      } catch (error) {
        console.error('[Conversations] ❌ Background save failed (non-fatal):', error);
      }
    })().catch(err => {
      console.error('[Conversations] Background save error (non-fatal):', err);
    });
  } catch (error: any) {
    console.error('❌ [Conversations] Send message error:', error);
    console.error('❌ [Conversations] Error name:', error.name);
    console.error('❌ [Conversations] Error message:', error.message);
    console.error('❌ [Conversations] Error stack:', error.stack);

    // Extract more specific error information
    let errorMessage = error.message || error.toString();
    let errorType = 'Unknown Error';

    // Categorize errors for better debugging
    if (error.message?.includes('uuid')) {
      errorType = 'Database UUID Error';
      errorMessage = `Invalid UUID format. Please ensure you are logged in with a valid account. Details: ${error.message}`;
    } else if (error.message?.includes('API') || error.message?.includes('Anthropic')) {
      errorType = 'AI Service Error';
      errorMessage = `AI service error. Please try again or contact support. Details: ${error.message}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'Database Connection Error';
      errorMessage = 'Unable to connect to database. Please contact support.';
    } else if (error.message?.includes('timeout')) {
      errorType = 'Timeout Error';
      errorMessage = 'Request timed out. Please try again with a shorter message.';
    }

    console.error(`❌ [Conversations] Error Type: ${errorType}`);
    console.error(`❌ [Conversations] User-facing message: ${errorMessage}`);

    res.status(500).json({
      success: false,
      error: `Failed to process message: ${errorMessage}`,
      errorType,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get conversation history with pagination support
 */
router.get('/:projectId/messages', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50; // Default to 50 for better performance
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`[GET /messages] projectId=${projectId}, limit=${limit}, offset=${offset}`);

    // Get messages with pagination using range
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1); // Supabase uses inclusive range

    if (error) throw error;

    // Get total count to determine if there are more messages
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) {
      console.error('Error getting message count:', countError);
      // Continue without count - hasMore will default to false
    }

    const hasMore = count ? (offset + limit) < count : false;
    const total = count || 0;

    console.log(`[GET /messages] Returning ${data?.length || 0} messages, hasMore=${hasMore}, total=${total}`);

    res.json({ 
      success: true, 
      messages: data || [],
      hasMore,
      total
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

/**
 * Clear conversation history
 */
router.delete('/:projectId/messages', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;

    res.json({ success: true, message: 'Conversation cleared' });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear conversation' });
  }
});

/**
 * Generate embeddings for all messages in a project
 * This is useful for backfilling embeddings for existing messages
 */
router.post('/:projectId/generate-embeddings', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`Starting embedding generation for project ${projectId}...`);
    const processedCount = await embeddingService.generateMissingEmbeddings(projectId);

    res.json({
      success: true,
      message: `Generated embeddings for ${processedCount} messages`,
      processedCount,
    });
  } catch (error: any) {
    console.error('Generate embeddings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate embeddings',
    });
  }
});

/**
 * Poll for pending updates from background workflow
 * Frontend calls this after receiving initial conversation response
 */
router.get('/:projectId/pending-updates', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`[Conversations] Polling for updates for project ${projectId}`);

    // Check if updates are available
    const updates = updatesCache.get(projectId);

    if (!updates) {
      console.log(`[Conversations] No updates available for project ${projectId}`);
      return res.json({
        success: true,
        hasUpdates: false,
      });
    }

    console.log(`[Conversations] Returning updates for project ${projectId}:`, {
      itemsAdded: updates.itemsAdded.length,
      itemsModified: updates.itemsModified.length,
      itemsMoved: updates.itemsMoved.length,
    });

    res.json({
      success: true,
      hasUpdates: true,
      updates: {
        itemsAdded: updates.itemsAdded,
        itemsModified: updates.itemsModified,
        itemsMoved: updates.itemsMoved,
      },
      workflow: updates.workflow,
    });
  } catch (error: any) {
    console.error('[Conversations] Error polling for updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to poll for updates',
    });
  }
});

export default router;
