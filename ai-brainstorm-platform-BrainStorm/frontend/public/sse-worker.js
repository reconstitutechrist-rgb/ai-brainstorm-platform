/**
 * SharedWorker for SSE Real-Time Updates
 * Manages a single SSE connection shared across all browser tabs
 */

// Connection state
let eventSource = null;
let connectedPorts = [];
let currentProjectId = null;
let apiBaseUrl = null; // Will be set by first connecting client
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Broadcast message to all connected ports (tabs)
 */
function broadcast(message) {
  connectedPorts.forEach((port) => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('[SSEWorker] Failed to broadcast to port:', error);
    }
  });
}

/**
 * Connect to SSE endpoint
 */
function connect(projectId, baseUrl) {
  // Set API base URL if provided
  if (baseUrl) {
    apiBaseUrl = baseUrl;
  }
  
  if (!apiBaseUrl) {
    console.error('[SSEWorker] No API base URL configured');
    broadcast({ type: 'error', message: 'No API base URL configured' });
    return;
  }

  if (eventSource && currentProjectId === projectId) {
    console.log('[SSEWorker] Already connected to project:', projectId);
    return;
  }

  // Close existing connection if different project
  if (eventSource) {
    console.log('[SSEWorker] Switching project, closing old connection');
    eventSource.close();
    eventSource = null;
  }

  currentProjectId = projectId;
  const url = `${apiBaseUrl}/conversations/${projectId}/updates-stream`;

  console.log('[SSEWorker] Connecting to SSE:', url);

  try {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSEWorker] SSE connection opened');
      reconnectAttempts = 0;
      broadcast({ type: 'connected' });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSEWorker] Received event:', data.type);
        broadcast({ type: 'event', data });
      } catch (error) {
        // Might be a heartbeat (not JSON)
        console.log('[SSEWorker] Non-JSON message (heartbeat):', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSEWorker] SSE error:', error);
      eventSource.close();
      eventSource = null;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[SSEWorker] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        broadcast({ type: 'reconnecting', attempt: reconnectAttempts });
        
        setTimeout(() => {
          if (currentProjectId) {
            connect(currentProjectId, null); // Use already-set apiBaseUrl
          }
        }, delay);
      } else {
        console.error('[SSEWorker] Max reconnection attempts reached');
        broadcast({ type: 'error', message: 'Connection failed after maximum retries' });
      }
    };

    // Handle specific event types
    eventSource.addEventListener('item_added', (event) => {
      try {
        const data = JSON.parse(event.data);
        broadcast({ type: 'item_added', data });
      } catch (error) {
        console.error('[SSEWorker] Failed to parse item_added event:', error);
      }
    });

    eventSource.addEventListener('item_modified', (event) => {
      try {
        const data = JSON.parse(event.data);
        broadcast({ type: 'item_modified', data });
      } catch (error) {
        console.error('[SSEWorker] Failed to parse item_modified event:', error);
      }
    });

    eventSource.addEventListener('item_moved', (event) => {
      try {
        const data = JSON.parse(event.data);
        broadcast({ type: 'item_moved', data });
      } catch (error) {
        console.error('[SSEWorker] Failed to parse item_moved event:', error);
      }
    });

    eventSource.addEventListener('suggestions_updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        broadcast({ type: 'suggestions_updated', data });
      } catch (error) {
        console.error('[SSEWorker] Failed to parse suggestions_updated event:', error);
      }
    });

    eventSource.addEventListener('workflow_complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        broadcast({ type: 'workflow_complete', data });
      } catch (error) {
        console.error('[SSEWorker] Failed to parse workflow_complete event:', error);
      }
    });

  } catch (error) {
    console.error('[SSEWorker] Failed to create EventSource:', error);
    broadcast({ type: 'error', message: error.message });
  }
}

/**
 * Disconnect from SSE
 */
function disconnect() {
  if (eventSource) {
    console.log('[SSEWorker] Disconnecting SSE');
    eventSource.close();
    eventSource = null;
    currentProjectId = null;
    reconnectAttempts = 0;
    broadcast({ type: 'disconnected' });
  }
}

/**
 * Handle new connections from tabs
 */
self.onconnect = (event) => {
  const port = event.ports[0];
  connectedPorts.push(port);

  console.log('[SSEWorker] New tab connected. Total tabs:', connectedPorts.length);

  port.onmessage = (e) => {
    const { action, projectId, apiUrl } = e.data;

    switch (action) {
      case 'connect':
        connect(projectId, apiUrl);
        break;
      case 'disconnect':
        // Only disconnect if this is the last tab
        connectedPorts = connectedPorts.filter(p => p !== port);
        if (connectedPorts.length === 0) {
          disconnect();
        }
        break;
      case 'getState':
        port.postMessage({
          type: 'state',
          connected: eventSource !== null && eventSource.readyState === EventSource.OPEN,
          projectId: currentProjectId
        });
        break;
      default:
        console.warn('[SSEWorker] Unknown action:', action);
    }
  };

  // Clean up when port closes
  port.onmessageerror = () => {
    connectedPorts = connectedPorts.filter(p => p !== port);
    console.log('[SSEWorker] Tab disconnected. Remaining tabs:', connectedPorts.length);
    if (connectedPorts.length === 0) {
      disconnect();
    }
  };

  // Send current state to new connection
  port.postMessage({
    type: 'state',
    connected: eventSource !== null && eventSource.readyState === EventSource.OPEN,
    projectId: currentProjectId
  });

  port.start();
};

console.log('[SSEWorker] SharedWorker initialized');
