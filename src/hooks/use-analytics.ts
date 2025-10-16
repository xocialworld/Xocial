"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface AnalyticsMetric {
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface AnalyticsData {
  impressions: AnalyticsMetric;
  engagement: AnalyticsMetric;
  followers: AnalyticsMetric;
  engagementRate: AnalyticsMetric;
}

export function useAnalytics(dateRange: string = "30") {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
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

      // Mock trend calculations (in production, compare with previous period)
      const metrics: AnalyticsData = {
        impressions: {
          value: totalImpressions,
          change: 12.5,
          trend: "up",
        },
        engagement: {
          value: totalEngagement,
          change: 8.3,
          trend: "up",
        },
        followers: {
          value: 15234, // Mock value
          change: 5.2,
          trend: "up",
        },
        engagementRate: {
          value: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
          change: -0.3,
          trend: "down",
        },
      };

      setAnalytics(metrics);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      // Set default mock data on error
      setAnalytics({
        impressions: { value: 125000, change: 12.5, trend: "up" },
        engagement: { value: 8420, change: 8.3, trend: "up" },
        followers: { value: 15234, change: 5.2, trend: "up" },
        engagementRate: { value: 4.2, change: -0.3, trend: "down" },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

