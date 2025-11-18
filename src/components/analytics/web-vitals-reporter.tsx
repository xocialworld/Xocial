'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onLCP, onINP, onTTFB, onFCP } from 'web-vitals';
import { reportWebVitals } from '@/lib/performance-monitoring';

export default function WebVitalsReporter() {
  useEffect(() => {
    onCLS(reportWebVitals);
    onFID(reportWebVitals);
    onLCP(reportWebVitals);
    onINP(reportWebVitals);
    onTTFB(reportWebVitals);
    onFCP(reportWebVitals);
  }, []);

  return null;
}