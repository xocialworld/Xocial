"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/react-query";

export interface AnalyticsMetric {
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

export interface AnalyticsData {
  impressions: AnalyticsMetric;
  engagement: AnalyticsMetric;
  followers: AnalyticsMetric;
  engagementRate: AnalyticsMetric;
}

/**
 * Fetch analytics data for a given date range
 */
async function fetchAnalytics(dateRange: string): Promise<AnalyticsData> {
  const response = await fetch(`/api/analytics?days=${dateRange}`);

  if (!response.ok) {
    let errorMessage = 'Failed to fetch analytics';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const payload = await response.json();

  if (!payload.success || !payload.data?.metrics) {
    throw new Error(payload.error?.message || 'Invalid analytics data received');
  }

  return payload.data.metrics;
}

/**
 * Hook to fetch and manage analytics data with React Query
 */
export function useAnalytics(dateRange: string = "30") {
  const {
    data: analytics,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.analytics.overview({ dateRange }),
    queryFn: () => fetchAnalytics(dateRange),
    staleTime: 15 * 60 * 1000, // 15 minutes
    // Refetch in background to keep data fresh
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    // Provide default data while loading
    placeholderData: (previousData) => previousData,
  });

  return {
    analytics: analytics || null,
    loading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

