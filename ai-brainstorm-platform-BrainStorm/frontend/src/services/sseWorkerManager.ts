/**
 * SSE Worker Manager
 * Singleton class for managing SharedWorker communication
 */

type EventCallback = (data: unknown) => void;

interface ItemAddedEvent {
  id: string;
  items?: unknown[];
}

interface ItemModifiedEvent {
  id: string;
  items?: unknown[];
}

interface ItemMovedEvent {
  id: string;
  position: { x: number; y: number };
}

interface ConnectionState {
  connected: boolean;
  projectId: string | null;
}

class SSEWorkerManagerClass {
  private worker: SharedWorker | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private connectionState: ConnectionState = { connected: false, projectId: null };
  private supported: boolean;

  constructor() {
    this.supported = typeof SharedWorker !== 'undefined';
    if (!this.supported) {
      console.warn('[SSEWorkerManager] SharedWorker not supported in this browser');
    }
  }

  /**
   * Check if SharedWorker is supported
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Get the current connection state
   */
  getState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Initialize the SharedWorker
   */
  private initWorker(): void {
    if (!this.supported || this.worker) return;

    try {
      this.worker = new SharedWorker('/sse-worker.js');

      this.worker.port.onmessage = (event: MessageEvent) => {
        const { type, data, connected, projectId, message, attempt } = event.data;

        switch (type) {
          case 'connected':
            this.connectionState = { connected: true, projectId: this.connectionState.projectId };
            this.emit('connected', null);
            break;

          case 'disconnected':
            this.connectionState = { connected: false, projectId: null };
            this.emit('disconnected', null);
            break;

          case 'reconnecting':
            this.emit('reconnecting', { attempt });
            break;

          case 'error':
            this.emit('error', { message });
            break;

          case 'state':
            this.connectionState = { connected, projectId };
            break;

          case 'event':
            // Generic event from SSE
            if (data?.type) {
              this.emit(data.type, data);
            }
            break;

          case 'item_added':
          case 'item_modified':
          case 'item_moved':
          case 'suggestions_updated':
          case 'workflow_complete':
            this.emit(type, data);
            break;

          default:
            console.log('[SSEWorkerManager] Unknown message type:', type);
        }
      };

      this.worker.port.onmessageerror = (error: MessageEvent) => {
        console.error('[SSEWorkerManager] Message error:', error);
        this.emit('error', { message: 'Worker communication error' });
      };

      this.worker.port.start();
      console.log('[SSEWorkerManager] SharedWorker initialized');
    } catch (error) {
      console.error('[SSEWorkerManager] Failed to initialize worker:', error);
      this.supported = false;
    }
  }

  /**
   * Connect to SSE for a specific project
   */
  connect(projectId: string): void {
    if (!this.supported) return;

    this.initWorker();

    if (this.worker) {
      this.connectionState.projectId = projectId;
      // Get API URL from environment or default to localhost
      const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) 
        || 'http://localhost:3001/api';
      this.worker.port.postMessage({ action: 'connect', projectId, apiUrl });
    }
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    if (!this.supported || !this.worker) return;

    this.worker.port.postMessage({ action: 'disconnect' });
    this.connectionState = { connected: false, projectId: null };
  }

  /**
   * Subscribe to an event type
   */
  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Unsubscribe from an event type
   */
  off(eventType: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SSEWorkerManager] Error in ${eventType} callback:`, error);
        }
      });
    }
  }

  /**
   * Request current state from worker
   */
  requestState(): void {
    if (this.worker) {
      this.worker.port.postMessage({ action: 'getState' });
    }
  }
}

// Export singleton instance
export const SSEWorkerManager = new SSEWorkerManagerClass();
