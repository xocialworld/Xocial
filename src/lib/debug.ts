/**
 * Debug Instrumentation
 * 
 * Provides correlation IDs and debug utilities for tracing requests
 * across the application stack.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Debug log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug context interface
 */
export interface DebugContext {
  correlationId: string;
  operation: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create a debug context for tracking an operation
 */
export function createDebugContext(operation: string, metadata?: Record<string, unknown>): DebugContext {
  return {
    correlationId: generateCorrelationId(),
    operation,
    startTime: Date.now(),
    metadata,
  };
}

/**
 * Log with correlation ID and context
 */
export function debugLog(
  level: LogLevel,
  context: DebugContext,
  message: string,
  data?: Record<string, unknown>
): void {
  const duration = Date.now() - context.startTime;
  const logData = {
    correlationId: context.correlationId,
    operation: context.operation,
    duration: `${duration}ms`,
    ...data,
  };

  const prefix = `[${context.correlationId.slice(0, 8)}][${context.operation}]`;

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${prefix} ${message}`, logData);
      }
      break;
    case 'info':
      console.info(`${prefix} ${message}`, logData);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, logData);
      break;
    case 'error':
      console.error(`${prefix} ${message}`, logData);
      break;
  }
}

/**
 * Request header name for correlation ID
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Get correlation ID from request headers or generate new one
 */
export function getOrCreateCorrelationId(headers: Headers): string {
  return headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.XOCIAL_DEBUG === 'true'
  );
}

/**
 * Debug-only execution wrapper
 */
export function debugOnly<T>(fn: () => T): T | undefined {
  if (isDebugEnabled()) {
    return fn();
  }
  return undefined;
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  if (isDebugEnabled()) {
    console.log(`[TIMING] ${operation}: ${duration}ms`);
  }
  
  return { result, duration };
}

/**
 * Create a request tracker for debugging
 */
export class RequestTracker {
  private correlationId: string;
  private operation: string;
  private startTime: number;
  private events: Array<{ event: string; time: number; data?: unknown }> = [];

  constructor(operation: string, correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
    this.operation = operation;
    this.startTime = Date.now();
    this.track('start');
  }

  get id(): string {
    return this.correlationId;
  }

  track(event: string, data?: unknown): void {
    this.events.push({
      event,
      time: Date.now() - this.startTime,
      data,
    });
  }

  complete(result?: unknown): void {
    this.track('complete', result);
    
    if (isDebugEnabled()) {
      console.log(`[REQUEST] ${this.correlationId.slice(0, 8)} | ${this.operation}`, {
        duration: `${Date.now() - this.startTime}ms`,
        events: this.events,
      });
    }
  }

  error(error: unknown): void {
    this.track('error', error instanceof Error ? error.message : error);
    
    console.error(`[REQUEST ERROR] ${this.correlationId.slice(0, 8)} | ${this.operation}`, {
      duration: `${Date.now() - this.startTime}ms`,
      events: this.events,
      error,
    });
  }

  toHeaders(): Record<string, string> {
    return {
      [CORRELATION_ID_HEADER]: this.correlationId,
    };
  }
}

/**
 * Format debug info for display
 */
export function formatDebugInfo(info: Record<string, unknown>): string {
  return Object.entries(info)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
}

