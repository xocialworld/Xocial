/**
 * Query Performance Timing Utility
 * Track and log database query execution time
 * Based on SRS Section 8.3
 */

import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE THRESHOLDS
// ═══════════════════════════════════════════════════════════════

const QUERY_THRESHOLDS = {
  FAST: 100,      // < 100ms = fast query
  NORMAL: 500,    // < 500ms = normal query
  SLOW: 1000,     // < 1s = slow query (warning)
  CRITICAL: 5000, // > 5s = critical (error)
} as const;

// ═══════════════════════════════════════════════════════════════
// QUERY TIMING WRAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap a query function with timing and logging
 */
export async function withQueryTiming<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    // Log based on duration
    logQueryPerformance(queryName, duration, 'success', context);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    // Log error with duration
    logger.error(
      `Query failed: ${queryName}`,
      error as Error,
      {
        queryName,
        duration: Math.round(duration),
        ...context,
      }
    );

    throw error;
  }
}

/**
 * Log query performance based on duration
 */
function logQueryPerformance(
  queryName: string,
  duration: number,
  status: 'success' | 'error',
  context?: Record<string, any>
): void {
  const durationMs = Math.round(duration);
  const message = `Query: ${queryName} (${durationMs}ms)`;

  const logContext = {
    queryName,
    duration: durationMs,
    status,
    ...context,
  };

  // Determine log level based on duration
  if (duration >= QUERY_THRESHOLDS.CRITICAL) {
    logger.error(message, undefined, logContext);
  } else if (duration >= QUERY_THRESHOLDS.SLOW) {
    logger.warn(message, logContext);
  } else if (duration >= QUERY_THRESHOLDS.NORMAL) {
    logger.info(message, logContext);
  } else {
    logger.debug(message, logContext);
  }

  // Track query metrics if in production
  if (typeof window !== 'undefined' && status === 'success') {
    trackQueryMetric(queryName, durationMs);
  }
}

/**
 * Track query metric to analytics
 */
function trackQueryMetric(queryName: string, duration: number): void {
  // Send to analytics endpoint
  fetch('/api/analytics/query-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName,
      duration,
      timestamp: Date.now(),
      url: window.location.href,
    }),
    keepalive: true,
  }).catch(() => {
    // Fail silently
  });
}

// ═══════════════════════════════════════════════════════════════
// QUERY PROFILER
// ═══════════════════════════════════════════════════════════════

/**
 * Query Profiler for detailed analysis
 * Tracks multiple queries in a request
 */
export class QueryProfiler {
  private queries: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }> = [];

  private startTime: number = Date.now();

  /**
   * Profile a query execution
   */
  async profile<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await queryFn();
      const duration = performance.now() - start;

      this.queries.push({
        name: queryName,
        duration: Math.round(duration),
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.queries.push({
        name: `${queryName} (failed)`,
        duration: Math.round(duration),
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Get profiling summary
   */
  getSummary() {
    const totalDuration = Date.now() - this.startTime;
    const queryCount = this.queries.length;
    const totalQueryTime = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = this.queries.filter(
      (q) => q.duration >= QUERY_THRESHOLDS.SLOW
    );

    return {
      totalDuration,
      queryCount,
      totalQueryTime,
      averageQueryTime: queryCount > 0 ? Math.round(totalQueryTime / queryCount) : 0,
      slowQueryCount: slowQueries.length,
      queries: this.queries,
      slowQueries,
    };
  }

  /**
   * Log profiling summary
   */
  logSummary(label: string = 'Request'): void {
    const summary = this.getSummary();

    logger.info(`${label} completed`, {
      totalDuration: summary.totalDuration,
      queryCount: summary.queryCount,
      totalQueryTime: summary.totalQueryTime,
      averageQueryTime: summary.averageQueryTime,
      slowQueryCount: summary.slowQueryCount,
    });

    if (summary.slowQueryCount > 0) {
      logger.warn(`${label} had ${summary.slowQueryCount} slow queries`, {
        slowQueries: summary.slowQueries,
      });
    }
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.queries = [];
    this.startTime = Date.now();
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a simple timer
 */
export function createTimer() {
  const start = performance.now();

  return {
    elapsed: () => Math.round(performance.now() - start),
    stop: () => {
      const duration = Math.round(performance.now() - start);
      return duration;
    },
  };
}

/**
 * Batch multiple queries and track total time
 */
export async function withBatchTiming<T>(
  batchName: string,
  queries: Array<{ name: string; fn: () => Promise<any> }>
): Promise<T[]> {
  const start = performance.now();
  const profiler = new QueryProfiler();

  try {
    const results = await Promise.all(
      queries.map((q) => profiler.profile(q.name, q.fn))
    );

    const duration = performance.now() - start;
    
    logger.info(`Batch ${batchName} completed`, {
      batchName,
      duration: Math.round(duration),
      queryCount: queries.length,
      summary: profiler.getSummary(),
    });

    return results;
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.error(`Batch ${batchName} failed`, error as Error, {
      batchName,
      duration: Math.round(duration),
      queryCount: queries.length,
    });

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLES (commented out)
// ═══════════════════════════════════════════════════════════════

/*
// Basic usage
const posts = await withQueryTiming('fetchPosts', async () => {
  return await supabase.from('posts').select('*');
});

// With context
const user = await withQueryTiming(
  'fetchUser',
  async () => supabase.from('profiles').select('*').eq('id', userId).single(),
  { userId }
);

// Using QueryProfiler for multiple queries
const profiler = new QueryProfiler();

const posts = await profiler.profile('fetchPosts', fetchPosts);
const accounts = await profiler.profile('fetchAccounts', fetchAccounts);
const analytics = await profiler.profile('fetchAnalytics', fetchAnalytics);

profiler.logSummary('Dashboard Load');

// Batch timing
const [posts, accounts, analytics] = await withBatchTiming('Dashboard', [
  { name: 'posts', fn: fetchPosts },
  { name: 'accounts', fn: fetchAccounts },
  { name: 'analytics', fn: fetchAnalytics },
]);
*/

export default withQueryTiming;

