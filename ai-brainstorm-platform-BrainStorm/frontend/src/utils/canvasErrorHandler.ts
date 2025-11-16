/**
 * ✅ MEDIUM PRIORITY FIX: Standardized Error Handling for Canvas Operations
 *
 * Provides consistent error handling, logging, and user feedback across all canvas operations.
 */

export interface CanvasError {
  code: string;
  message: string;
  userMessage: string;
  context?: Record<string, any>;
  originalError?: Error;
}

export class CanvasOperationError extends Error implements CanvasError {
  code: string;
  userMessage: string;
  context?: Record<string, any>;
  originalError?: Error;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CanvasOperationError';
    this.code = code;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
  }
}

// Error codes for different operation types
export const CanvasErrorCodes = {
  ARCHIVE_FAILED: 'ARCHIVE_FAILED',
  RESTORE_FAILED: 'RESTORE_FAILED',
  POSITION_UPDATE_FAILED: 'POSITION_UPDATE_FAILED',
  STATE_CHANGE_FAILED: 'STATE_CHANGE_FAILED',
  CLUSTER_OPERATION_FAILED: 'CLUSTER_OPERATION_FAILED',
  SELECTION_FAILED: 'SELECTION_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Handle canvas operation errors with consistent logging and user messaging
 */
export function handleCanvasError(
  operation: string,
  error: unknown,
  context?: Record<string, any>
): CanvasOperationError {
  // Log to console for debugging
  console.error(`[Canvas ${operation}] Error:`, {
    error,
    context,
    timestamp: new Date().toISOString(),
  });

  // Determine error details
  if (error instanceof CanvasOperationError) {
    return error;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new CanvasOperationError(
        CanvasErrorCodes.NETWORK_ERROR,
        `Network error during ${operation}`,
        'Network connection failed. Please check your internet connection and try again.',
        context,
        error
      );
    }

    // Generic error
    return new CanvasOperationError(
      CanvasErrorCodes.UNKNOWN_ERROR,
      `${operation} failed: ${error.message}`,
      `Failed to ${operation}. Please try again.`,
      context,
      error
    );
  }

  // Unknown error type
  return new CanvasOperationError(
    CanvasErrorCodes.UNKNOWN_ERROR,
    `${operation} failed with unknown error`,
    `An unexpected error occurred. Please try again.`,
    context
  );
}

/**
 * Create specific error handlers for common canvas operations
 */
export const CanvasErrorHandlers = {
  archive: (itemId: string, error: unknown) =>
    handleCanvasError('archive card', error, { itemId }),

  restore: (itemId: string, error: unknown) =>
    handleCanvasError('restore card', error, { itemId }),

  updatePosition: (itemId: string, position: { x: number; y: number }, error: unknown) =>
    handleCanvasError('update position', error, { itemId, position }),

  changeState: (itemId: string, newState: string, error: unknown) =>
    handleCanvasError('change state', error, { itemId, newState }),

  cluster: (operation: string, error: unknown, context?: Record<string, any>) =>
    handleCanvasError(`cluster ${operation}`, error, context),

  selection: (operation: string, error: unknown, context?: Record<string, any>) =>
    handleCanvasError(`selection ${operation}`, error, context),
};

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  canRecover: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: () => void;
}

export function getRecoveryStrategy(error: CanvasOperationError): RecoveryStrategy {
  switch (error.code) {
    case CanvasErrorCodes.NETWORK_ERROR:
      return {
        canRecover: true,
        retryDelay: 2000,
        maxRetries: 3,
      };

    case CanvasErrorCodes.VALIDATION_ERROR:
      return {
        canRecover: false, // Don't retry validation errors
      };

    case CanvasErrorCodes.ARCHIVE_FAILED:
    case CanvasErrorCodes.RESTORE_FAILED:
    case CanvasErrorCodes.STATE_CHANGE_FAILED:
      return {
        canRecover: true,
        retryDelay: 1000,
        maxRetries: 2,
      };

    default:
      return {
        canRecover: true,
        retryDelay: 1500,
        maxRetries: 1,
      };
  }
}

/**
 * Toast notification helper for user-facing errors
 */
export function showCanvasErrorToast(error: CanvasOperationError): void {
  // This would integrate with your toast notification system
  // For now, we'll use console.warn as a placeholder
  console.warn('[Canvas Error]', error.userMessage, {
    code: error.code,
    details: error.context,
  });

  // TODO: Integrate with actual toast notification system
  // Example: toast.error(error.userMessage)
}
