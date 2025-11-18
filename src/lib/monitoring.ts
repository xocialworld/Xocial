/**
 * Monitoring and Error Tracking System
 * Simple logging-based monitoring using Next.js built-in capabilities
 */

// Initialize monitoring (no-op, kept for API compatibility)
export function initMonitoring() {
  // No initialization needed - using Next.js built-in error handling
}

// Log custom events
export function logEvent(event: string, data?: Record<string, any>) {
  console.log(`[Event] ${event}`, data);
}

// Track errors
export function trackError(error: Error, context?: Record<string, any>) {
  console.error('[Error]', error, context);
}

// Set user context (no-op, kept for API compatibility)
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  // User context not needed without external monitoring service
}

// Clear user context (no-op, kept for API compatibility)
export function clearUserContext() {
  // User context not needed without external monitoring service
}

// Performance monitoring (no-op, kept for API compatibility)
export function startTransaction(name: string, op: string) {
  return null;
}

// Capture message
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

