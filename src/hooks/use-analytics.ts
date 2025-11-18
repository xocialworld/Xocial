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
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  // Fetch analytics data
  const { data: analyticsData, error: analyticsError } = await supabase
    .from("post_analytics")
    .select(`
      *,
      posts!inner(workspace_id)
    `)
    .eq("posts.workspace_id", workspace.id)
    .gte("fetched_at", startDate.toISOString())
    .lte("fetched_at", endDate.toISOString());

  if (analyticsError) throw analyticsError;

  // Calculate metrics
  const totalImpressions = analyticsData?.reduce((sum, item) => sum + (item.impressions || 0), 0) || 0;
  const totalEngagement = analyticsData?.reduce((sum, item) => sum + (item.engagement || 0), 0) || 0;
  const totalReach = analyticsData?.reduce((sum, item) => sum + (item.reach || 0), 0) || 0;

  // Calculate previous period for comparison
  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange));

  const { data: prevAnalyticsData } = await supabase
    .from("post_analytics")
    .select(`
      *,
      posts!inner(workspace_id)
    `)
    .eq("posts.workspace_id", workspace.id)
    .gte("fetched_at", prevStartDate.toISOString())
    .lte("fetched_at", prevEndDate.toISOString());

  const prevImpressions = prevAnalyticsData?.reduce((sum, item) => sum + (item.impressions || 0), 0) || 0;
  const prevEngagement = prevAnalyticsData?.reduce((sum, item) => sum + (item.engagement || 0), 0) || 0;
  const prevEngagementRate = prevImpressions > 0 ? (prevEngagement / prevImpressions) * 100 : 0;

  // Calculate changes
  const impressionsChange = prevImpressions > 0 
    ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 
    : 0;
  const engagementChange = prevEngagement > 0 
    ? ((totalEngagement - prevEngagement) / prevEngagement) * 100 
    : 0;
  
  const currentEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
  const engagementRateChange = prevEngagementRate > 0 
    ? ((currentEngagementRate - prevEngagementRate) / prevEngagementRate) * 100 
    : 0;

  const metrics: AnalyticsData = {
    impressions: {
      value: totalImpressions,
      change: Math.round(impressionsChange * 10) / 10,
      trend: impressionsChange > 0 ? "up" : impressionsChange < 0 ? "down" : "neutral",
    },
    engagement: {
      value: totalEngagement,
      change: Math.round(engagementChange * 10) / 10,
      trend: engagementChange > 0 ? "up" : engagementChange < 0 ? "down" : "neutral",
    },
    followers: {
      value: 15234, // TODO: Fetch from social accounts
      change: 5.2, // TODO: Calculate from historical data
      trend: "up",
    },
    engagementRate: {
      value: Math.round(currentEngagementRate * 10) / 10,
      change: Math.round(engagementRateChange * 10) / 10,
      trend: engagementRateChange > 0 ? "up" : engagementRateChange < 0 ? "down" : "neutral",
    },
  };

  return metrics;
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

  // Realtime: subscribe to analytics upserts/updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-post-analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_analytics' },
        () => {
          // Lightweight debounce could be added if events are frequent
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    analytics: analytics || null,
    loading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

