'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface OverviewMetrics {
  totalFollowers: number;
  followersChange: number;
  totalEngagement: number;
  engagementChange: number;
  avgEngagementRate: number;
  engagementRateChange: number;
  totalPosts: number;
  postsChange: number;
}

export interface EngagementDataPoint {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  total: number;
}

export interface PlatformStat {
  platform: string;
  followers: number;
  engagement: number;
  posts: number;
  engagementRate: number;
}

export interface TopPost {
  id: string;
  content: string;
  platform: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  engagementRate: number;
}

export function useAnalytics(dateRange: { from: Date; to: Date }) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementDataPoint[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch overview metrics
      const overviewRes = await fetch(
        `/api/analytics/overview?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );
      
      if (!overviewRes.ok) {
        throw new Error('Failed to fetch overview');
      }
      
      const overviewData = await overviewRes.json();
      setOverview(overviewData.data);

      // Fetch engagement time-series data
      const engagementRes = await fetch(
        `/api/analytics/engagement?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );
      
      if (!engagementRes.ok) {
        throw new Error('Failed to fetch engagement data');
      }
      
      const engagementResult = await engagementRes.json();
      setEngagementData(engagementResult.data);

      // Fetch platform stats
      const platformRes = await fetch(
        `/api/analytics/platform-stats?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );
      
      if (!platformRes.ok) {
        throw new Error('Failed to fetch platform stats');
      }
      
      const platformResult = await platformRes.json();
      setPlatformStats(platformResult.data);

      // Fetch top posts
      const topPostsRes = await fetch(
        `/api/analytics/top-posts?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}&limit=10`
      );
      
      if (!topPostsRes.ok) {
        throw new Error('Failed to fetch top posts');
      }
      
      const topPostsResult = await topPostsRes.json();
      setTopPosts(topPostsResult.data);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }

  return {
    overview,
    engagementData,
    platformStats,
    topPosts,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

