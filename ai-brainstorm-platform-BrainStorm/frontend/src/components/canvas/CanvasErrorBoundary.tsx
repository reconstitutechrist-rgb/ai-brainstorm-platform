import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  isDarkMode?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ✅ HIGH PRIORITY FIX: Error Boundary for Canvas Components
 *
 * Prevents one bad card from crashing the entire canvas.
 * Provides graceful error recovery with user-friendly fallback UI.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CanvasErrorBoundary] Caught error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const isDarkMode = this.props.isDarkMode ?? true;

      return (
        <div
          className={`p-4 rounded-lg border-2 ${
            isDarkMode
              ? 'bg-red-900/20 border-red-500/50 text-red-300'
              : 'bg-red-50 border-red-300 text-red-700'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label="Error">
              ⚠️
            </span>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Canvas Item Error</h3>
              <p className="text-sm mb-2">
                This item encountered an error and couldn't be displayed.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer hover:underline">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className={`mt-3 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
                aria-label="Retry loading this item"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
