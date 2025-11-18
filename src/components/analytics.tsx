'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

function sendMetric(endpoint: string | undefined, payload: any) {
  if (endpoint) {
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, body);
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      }
    } catch (e) {
      console.log('analytics-error', e);
    }
  } else {
    console.log('web-vitals', payload);
  }
}

export function Analytics() {
  useEffect(() => {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
    const errorUrl = process.env.NEXT_PUBLIC_ERROR_URL;

    onCLS((metric) => sendMetric(analyticsUrl, { type: 'CLS', value: metric.value }));
    onFID((metric) => sendMetric(analyticsUrl, { type: 'FID', value: metric.value }));
    onLCP((metric) => sendMetric(analyticsUrl, { type: 'LCP', value: metric.value }));
    onTTFB((metric) => sendMetric(analyticsUrl, { type: 'TTFB', value: metric.value }));
    onINP((metric) => sendMetric(analyticsUrl, { type: 'INP', value: metric.value }));

    const handleError = (event: ErrorEvent) => {
      sendMetric(errorUrl, { type: 'error', message: event.message });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      sendMetric(errorUrl, { type: 'unhandledrejection', reason: String(event.reason) });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}

export default Analytics;