/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Based on SRS Section 7.3
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { trackError } from '@/lib/monitoring';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary Class Component
 * Catches errors during rendering, in lifecycle methods, and in constructors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error with component stack information
    console.error('Error Boundary caught error:', error, errorInfo);

    // Track error for monitoring
    trackError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} reset={this.reset} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Shown when an error is caught by the boundary
 */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Don&rsquo;t worry, your data is safe.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-40">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Error Fallback for Sections
 * Use this for error boundaries around specific sections of a page
 */
export function CompactErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            Error loading this section
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {error.message}
          </p>
          <Button onClick={reset} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

