import { Router, Request, Response } from 'express';
import { UnifiedResearchAgent } from '../agents/unifiedResearchAgent';

const router = Router();
const unifiedResearchAgent = new UnifiedResearchAgent();

/**
 * POST /api/research-stream/live
 * Streaming research endpoint with real-time progress updates
 * Uses Server-Sent Events (SSE)
 */
router.post('/live', async (req: Request, res: Response) => {
  const { query, projectId, userId, maxSources = 5 } = req.body;

  if (!query || !projectId || !userId) {
    return res.status(400).json({
      success: false,
      error: 'query, projectId, and userId are required',
    });
  }

  console.log(`[ResearchStream] Starting streaming research for: "${query}"`);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Helper function to send SSE events
  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Send initial event
    sendEvent('start', {
      message: 'Starting research...',
      query,
      maxSources,
    });

    // Perform research with streaming callbacks (web-only mode)
    const result = await unifiedResearchAgent.research(
      query,
      projectId,
      userId,
      {
        sources: 'web',
        intent: 'research',
        maxWebSources: maxSources,
        maxDocumentSources: 0,
        includeAnalysis: true,
        saveToDB: true,
      },
      {
        // Callback: Web search complete
        onWebSearchComplete: async (count: number) => {
          sendEvent('search_complete', {
            message: `Found ${count} sources`,
            count,
            progress: 50,
          });
        },

        // Callback: Analysis complete
        onAnalysisComplete: async (count: number) => {
          sendEvent('analysis_complete', {
            message: `Analyzed ${count} sources`,
            count,
            progress: 80,
          });
        },
      }
    );

    // Send synthesis in chunks
    const synthesis = result.synthesis;
    const chunkSize = 100;
    let sentChars = 0;

    while (sentChars < synthesis.length) {
      const chunk = synthesis.substring(sentChars, sentChars + chunkSize);
      sendEvent('synthesis_chunk', {
        chunk,
        progress: 75 + Math.floor((sentChars / synthesis.length) * 25),
      });
      sentChars += chunkSize;

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Send final result
    sendEvent('complete', {
      message: 'Research complete',
      result: {
        query: result.query,
        sources: result.webSources.map(s => ({
          url: s.url,
          title: s.title,
          snippet: s.snippet,
          analysis: s.analysis,
        })),
        synthesis: result.synthesis,
        savedReferences: result.savedReferences,
        metadata: result.metadata,
      },
      progress: 100,
    });

    console.log(`[ResearchStream] ✅ Research completed successfully`);
  } catch (error: any) {
    console.error('[ResearchStream] Error:', error);

    sendEvent('error', {
      message: 'Research failed',
      error: error.message || 'Unknown error',
    });
  } finally {
    // End the SSE stream
    res.end();
  }
});

/**
 * POST /api/research-stream/synthesis
 * Stream synthesis generation in real-time
 */
router.post('/synthesis', async (req: Request, res: Response) => {
  const { referenceIds } = req.body;

  if (!referenceIds || !Array.isArray(referenceIds) || referenceIds.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'At least 2 reference IDs are required',
    });
  }

  console.log(`[SynthesisStream] Starting streaming synthesis for ${referenceIds.length} references`);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('start', {
      message: 'Preparing synthesis...',
      referenceCount: referenceIds.length,
    });

    // This would be replaced with actual streaming synthesis
    // For now, we simulate it
    const messages = [
      'Loading references...',
      'Analyzing content...',
      'Identifying key themes...',
      'Detecting conflicts...',
      'Generating synthesis...',
    ];

    for (let i = 0; i < messages.length; i++) {
      sendEvent('progress', {
        message: messages[i],
        progress: Math.floor(((i + 1) / messages.length) * 100),
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Send completion
    sendEvent('complete', {
      message: 'Synthesis complete',
      progress: 100,
    });

    console.log(`[SynthesisStream] ✅ Synthesis completed successfully`);
  } catch (error: any) {
    console.error('[SynthesisStream] Error:', error);

    sendEvent('error', {
      message: 'Synthesis failed',
      error: error.message || 'Unknown error',
    });
  } finally {
    res.end();
  }
});

/**
 * GET /api/research-stream/test
 * Test SSE connection
 */
router.get('/test', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let counter = 0;

  const interval = setInterval(() => {
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify({ count: counter, time: new Date().toISOString() })}\n\n`);
    
    counter++;

    if (counter >= 10) {
      clearInterval(interval);
      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify({ message: 'Test complete' })}\n\n`);
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;
