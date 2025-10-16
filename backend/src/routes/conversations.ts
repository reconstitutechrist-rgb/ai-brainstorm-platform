import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { AgentCoordinationService } from '../services/agentCoordination';

const router = Router();
const coordinationService = new AgentCoordinationService();

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
  console.log('  - body:', req.body);
  console.log('  - headers:', req.headers);

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

    // Save agent responses (only those with showToUser=true)
    const agentMessages = [];
    for (const response of responses.filter((r: any) => r.showToUser)) {
      const { data: agentMsg, error } = await supabase
        .from('messages')
        .insert([
          {
            project_id: projectId,
            user_id: userId,
            role: 'assistant',
            content: response.message,
            agent_type: response.agent, // Now using the agent_type column
            metadata: response.metadata || {},
          },
        ])
        .select()
        .single();

      if (!error && agentMsg) {
        agentMessages.push(agentMsg);
        console.log(`[Conversations] Saved message from ${response.agent}`);
      } else if (error) {
        console.error('[Conversations] Failed to save agent message:', error);
      }
    }

    // If no responses (agents hung), send a simple acknowledgment
    if (agentMessages.length === 0) {
      console.log('[Conversations] No agent responses, sending simple acknowledgment');
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
        console.error('[Conversations] Failed to save fallback message:', fallbackError);
      } else if (simpleMsg) {
        console.log('[Conversations] Fallback message saved successfully');
        agentMessages.push(simpleMsg);
      }
    }

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
  } catch (error: any) {
    console.error('Send message error:', error);
    const errorMessage = error.message || error.toString();
    console.error('Error details:', errorMessage);
    res.status(500).json({
      success: false,
      error: `Failed to process message: ${errorMessage}`
    });
  }
});

/**
 * Get conversation history
 */
router.get('/:projectId/messages', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, messages: data });
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

export default router;