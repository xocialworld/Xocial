/**
 * Centralized Logging Utility
 * Based on SRS Section 7.4
 * Provides structured logging with context and monitoring integration
 */

import { trackError, captureMessage, logEvent } from './monitoring';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  workspaceId?: string;
  action?: string;
  method?: string;
  path?: string;
  duration?: number;
  metadata?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

/**
 * Logger Class
 * Provides structured logging with different levels
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    return `[${timestamp}] [${levelStr}] ${message}${contextStr}`;
  }

  /**
   * Send log to monitoring service in production
   */
  private async sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    // Skip in development
    if (this.isDevelopment) return;

    try {
      // Simple logging for production (Next.js will capture these)
      if (level === 'error' && error) {
        trackError(error, context);
      } else {
        const mappedLevel = level === 'warn' ? 'warning' : (level === 'info' ? 'info' : 'error');
        captureMessage(message, mappedLevel);
        
        // Also log as event for analytics
        logEvent(`log_${level}`, { message, ...context });
      }
    } catch (err) {
      console.error('[Logger] Monitoring send failed:', err);
    }
  }

  /**
   * Debug level logging (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
    this.sendToMonitoring('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
    this.sendToMonitoring('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const fullContext: LogContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } as any : undefined,
    };

    console.error(this.formatMessage('error', message, fullContext));
    this.sendToMonitoring('error', message, fullContext, error);
  }

  /**
   * Helper to log with dynamic level while satisfying type constraints
   */
  private logByLevel(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case 'error':
        this.error(message, undefined, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'info':
        this.info(message, context);
        break;
      case 'debug':
        this.debug(message, context);
        break;
      default:
        this.info(message, context);
    }
  }

  /**
   * Track user action for analytics
   */
  trackAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, { ...context, action });
  }

  ai(
    action: 'ai_generate' | 'ai_refine' | 'ai_schedule',
    context?: LogContext
  ): void {
    this.trackAction(action, context);
  }

  /**
   * Track API request
   */
  trackAPIRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} - ${statusCode} (${duration}ms)`;

    const fullContext: LogContext = {
      ...context,
      method,
      path,
      statusCode: statusCode as any,
      duration,
    };

    this.logByLevel(level, message, fullContext);
  }

  /**
   * Track database query performance
   */
  trackQuery(
    queryName: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = duration > 5000 ? 'error' : duration > 1000 ? 'warn' : 'debug';
    const message = `Query: ${queryName} (${duration}ms)`;

    const fullContext: LogContext = {
      ...context,
      queryName: queryName as any,
      duration,
    };

    this.logByLevel(level, message, fullContext);
  }

  /**
   * Create a child logger with preset context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child Logger
 * Automatically includes parent context in all logs
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  trackAction(action: string, context?: LogContext): void {
    this.parent.trackAction(action, this.mergeContext(context));
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const logger = new Logger();

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLES (commented out)
// ═══════════════════════════════════════════════════════════════

/*
// Basic logging
logger.info('User logged in', { userId: 'user-123' });
logger.warn('Slow query detected', { queryName: 'fetchPosts', duration: 1500 });
logger.error('Failed to publish post', error, { postId: 'post-456' });

// Track user actions
logger.trackAction('post_created', {
  userId: 'user-123',
  workspaceId: 'workspace-456',
  metadata: { platform: 'facebook' },
});

// Track API requests
logger.trackAPIRequest('POST', '/api/posts', 201, 245, { userId: 'user-123' });

// Track queries
logger.trackQuery('fetchPosts', 152, { workspaceId: 'workspace-456' });

// Create child logger with preset context
const apiLogger = logger.child({ 
  userId: 'user-123', 
  workspaceId: 'workspace-456' 
});
apiLogger.info('Processing request'); // Automatically includes userId and workspaceId
*/

export default logger;

