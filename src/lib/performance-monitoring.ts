/**
 * Performance Monitoring
 * Web Vitals tracking and performance budgets
 * Based on SRS Section 8.4
 */

import type { Metric } from 'web-vitals';
import type { Platform } from '@/types';

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE BUDGETS
// ═══════════════════════════════════════════════════════════════

export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets (in milliseconds or score)
  LCP: 2500, // Largest Contentful Paint (ms) - Good: < 2.5s
  FID: 100,  // First Input Delay (ms) - Good: < 100ms
  CLS: 0.1,  // Cumulative Layout Shift (score) - Good: < 0.1
  INP: 200,  // Interaction to Next Paint (ms) - Good: < 200ms

  // Custom metrics
  TTFB: 600, // Time to First Byte (ms) - Good: < 600ms
  FCP: 1800, // First Contentful Paint (ms) - Good: < 1.8s

  // Bundle size budgets (KB)
  JS_BUNDLE: 200,
  CSS_BUNDLE: 50,
  TOTAL_BUNDLE: 250,
  AI_GENERATE: 4000,
} as const;

// ═══════════════════════════════════════════════════════════════
// WEB VITALS REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Report Web Vitals metrics
 * This function is called by Next.js for each Core Web Vital
 */
export function reportWebVitals(metric: Metric): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const rating = getRating(metric.name, metric.value);
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    
    console.log(
      `[Web Vitals] ${color} ${metric.name}: ${Math.round(metric.value)}${getUnit(metric.name)} (${rating})`
    );
  }

  // Check against budget
  const budget = PERFORMANCE_BUDGETS[metric.name as keyof typeof PERFORMANCE_BUDGETS];
  if (budget && metric.value > budget) {
    console.warn(
      `[Performance Budget] ${metric.name} exceeded budget: ${metric.value} > ${budget}`
    );
  }

  // Send to analytics service
  sendToAnalytics(metric);
}

/**
 * Send metric to analytics endpoint
 */
function sendToAnalytics(metric: Metric): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });

  const url = '/api/analytics/vitals';

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Get rating for a metric value
 */
function getRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'FID':
    case 'INP':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value <= 600 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

/**
 * Get unit for a metric
 */
function getUnit(name: string): string {
  switch (name) {
    case 'CLS':
      return '';
    default:
      return 'ms';
  }
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE BUDGET CHECKER
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a metric is within performance budget
 */
export function checkPerformanceBudget(
  metric: string,
  value: number
): boolean {
  const budget = PERFORMANCE_BUDGETS[metric as keyof typeof PERFORMANCE_BUDGETS];

  if (!budget) return true;

  const isWithinBudget = value <= budget;

  if (!isWithinBudget) {
    console.warn(
      `[Performance Budget] ${metric} exceeded: ${value} > ${budget}`
    );
  }

  return isWithinBudget;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM PERFORMANCE TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Track custom performance metric
 */
export function trackPerformance(name: string, startMark: string, endMark?: string): number {
  if (typeof performance === 'undefined') return 0;

  try {
    const measureName = `measure-${name}`;
    
    if (endMark) {
      performance.measure(measureName, startMark, endMark);
    } else {
      performance.measure(measureName, startMark);
    }

    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure ? measure.duration : 0;

    // Clean up marks and measures
    performance.clearMarks(startMark);
    if (endMark) performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return duration;
  } catch (error) {
    console.error('[Performance] Tracking error:', error);
    return 0;
  }
}

type AIMetricMetadata = {
  platforms: Platform[];
  promptLength: number;
};

export function trackAIGeneration(
  duration: number,
  metadata: AIMetricMetadata
): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[AI] Generation took ${Math.round(duration)}ms`, metadata);
  }

  checkPerformanceBudget('AI_GENERATE', duration);
  sendAIMetric('ai_generate', duration, metadata);
}

type EngagementEvent = {
  event: 'cta_click' | 'nav_click' | 'feature_interaction';
  label?: string;
  url?: string;
};

export function trackEngagement(event: EngagementEvent): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    ...event,
    url: event.url || window.location.href,
    timestamp: Date.now(),
  });

  const endpoint = '/api/analytics/events';
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch((error) => {
      console.error('[Engagement Metrics] Failed to send event:', error);
    });
  }
}

function sendAIMetric(
  event: 'ai_generate',
  duration: number,
  metadata: AIMetricMetadata
): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    event,
    duration,
    metadata,
    url: window.location.href,
    timestamp: Date.now(),
  });

  const endpoint = '/api/analytics/ai';
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch((error) => {
      console.error('[AI Metrics] Failed to send metric:', error);
    });
  }
}

/**
 * Mark start of a performance measurement
 */
export function markStart(name: string): void {
  if (typeof performance !== 'undefined') {
    performance.mark(`${name}-start`);
  }
}

/**
 * Mark end of a performance measurement and return duration
 */
export function markEnd(name: string): number {
  if (typeof performance === 'undefined') return 0;

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  performance.mark(endMark);
  return trackPerformance(name, startMark, endMark);
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  markStart(name);
  
  try {
    const result = await fn();
    const duration = markEnd(name);
    
    return { result, duration };
  } catch (error) {
    markEnd(name);
    throw error;
  }
}

/**
 * Measure sync function execution time
 */
export function measure<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  markStart(name);
  
  try {
    const result = fn();
    const duration = markEnd(name);
    
    return { result, duration };
  } catch (error) {
    markEnd(name);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION TIMING
// ═══════════════════════════════════════════════════════════════

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): Record<string, number> | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = navEntries && navEntries.length > 0 ? navEntries[0] : null;

    if (nav) {
      return {
        dnsLookup: (nav.domainLookupEnd ?? 0) - (nav.domainLookupStart ?? 0),
        tcpConnection: (nav.connectEnd ?? 0) - (nav.connectStart ?? 0),
        serverResponse: (nav.responseEnd ?? 0) - (nav.requestStart ?? 0),
        domProcessing: (nav.domComplete ?? 0) - (nav.domInteractive ?? 0),
        pageLoad: (nav.loadEventEnd ?? 0) - (nav.startTime ?? 0),
        domInteractive: (nav.domInteractive ?? 0) - (nav.startTime ?? 0),
        domComplete: (nav.domComplete ?? 0) - (nav.startTime ?? 0),
        navigationType: (performance as any).navigation?.type ?? 0,
      };
    }

    const timing = (window.performance as any).timing;
    const navigation = (window.performance as any).navigation;
    if (!timing) return null;

    return {
      dnsLookup: (timing.domainLookupEnd ?? 0) - (timing.domainLookupStart ?? 0),
      tcpConnection: (timing.connectEnd ?? 0) - (timing.connectStart ?? 0),
      serverResponse: (timing.responseEnd ?? 0) - (timing.requestStart ?? 0),
      domProcessing: (timing.domContentLoadedEventEnd ?? 0) - (timing.domLoading ?? 0),
      pageLoad: (timing.loadEventEnd ?? 0) - (timing.navigationStart ?? 0),
      domInteractive: (timing.domInteractive ?? 0) - (timing.navigationStart ?? 0),
      domComplete: (timing.domComplete ?? 0) - (timing.navigationStart ?? 0),
      navigationType: navigation?.type ?? 0,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Log navigation timing to console (development only)
 */
export function logNavigationTiming(): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const timing = getNavigationTiming();
      if (timing) {
        console.log('[Navigation Timing]', timing);
      }
    }, 0);
  });
}

// ═══════════════════════════════════════════════════════════════
// RESOURCE TIMING
// ═══════════════════════════════════════════════════════════════

/**
 * Get slow resources (> 1s load time)
 */
export function getSlowResources(threshold: number = 1000): PerformanceResourceTiming[] {
  if (typeof performance === 'undefined') return [];

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return resources
    .filter((resource) => resource.duration > threshold)
    .sort((a, b) => b.duration - a.duration);
}

/**
 * Log slow resources to console
 */
export function logSlowResources(threshold: number = 1000): void {
  if (process.env.NODE_ENV !== 'development') return;

  const slowResources = getSlowResources(threshold);
  
  if (slowResources.length > 0) {
    console.warn(`[Performance] Found ${slowResources.length} slow resources (>${threshold}ms):`);
    slowResources.forEach((resource) => {
      console.warn(`  • ${resource.name} - ${Math.round(resource.duration)}ms`);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC INITIALIZATION
// ═══════════════════════════════════════════════════════════════

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    logNavigationTiming();
    
    window.addEventListener('load', () => {
      setTimeout(() => {
        logSlowResources(1000);
      }, 5000);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const PerformanceMonitor = {
  reportWebVitals,
  checkPerformanceBudget,
  trackPerformance,
  markStart,
  markEnd,
  measureAsync,
  measure,
  getNavigationTiming,
  logNavigationTiming,
  getSlowResources,
  logSlowResources,
  PERFORMANCE_BUDGETS,
};

export default PerformanceMonitor;
