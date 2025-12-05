'use client';

import { useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { useSelectedWorkspace } from '@/store/workspaceStore';

export interface SparklinePoint {
  date: string;
  impressions: number;
  engagement: number;
  followers: number;
  posts: number;
  engagementRate: number;
}

export interface OverviewMetrics {
  totalFollowers: number;
  followersChange: number;
  totalEngagement: number;
  engagementChange: number;
  avgEngagementRate: number;
  engagementRateChange: number;
  totalPosts: number;
  postsChange: number;
  sparklineData: SparklinePoint[];
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
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok";
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  engagementRate: number;
  impressions: number;
  reach: number;
  saves: number;
  clicks: number;
  type: "image" | "video" | "carousel" | "text";
}

async function fetchAnalytics<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch analytics');
  }

  return payload.data as T;
}

export function useAnalytics(dateRange: { from: Date; to: Date }, refetchInterval: number | false = false) {
  const fromTime = dateRange.from.getTime();
  const toTime = dateRange.to.getTime();

  const params = useMemo(() => {
    return {
      from: new Date(fromTime).toISOString(),
      to: new Date(toTime).toISOString(),
    };
  }, [fromTime, toTime]);
  const selectedWorkspace = useSelectedWorkspace();
  const workspaceId = selectedWorkspace?.id;
  const workspaceParams = useMemo(
    () => ({
      ...params,
      ...(workspaceId ? { workspaceId } : {}),
    }),
    [params, workspaceId]
  );

  const buildSearch = useCallback(
    (extra?: Record<string, string>) => {
      const search = new URLSearchParams({
        from: params.from,
        to: params.to,
        ...(workspaceId ? { workspaceId } : {}),
        ...(extra || {}),
      });
      return search.toString();
    },
    [params.from, params.to, workspaceId]
  );

  const enabled = Boolean(params.from && params.to);

  const dateKey = `${params.from}-${params.to}-${workspaceId ?? 'all'}`;

  const queryResults = useQueries({
    queries: [
      {
        queryKey: queryKeys.analytics.overview(workspaceParams),
        enabled,
        queryFn: ({ signal }) =>
          fetchAnalytics<OverviewMetrics>(`/api/analytics/overview?${buildSearch()}`, { signal }),
        staleTime: refetchInterval ? 0 : 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchInterval,
        retry: 1,
      },
      {
        queryKey: queryKeys.analytics.engagement(workspaceParams),
        enabled,
        queryFn: ({ signal }) =>
          fetchAnalytics<EngagementDataPoint[]>(`/api/analytics/engagement?${buildSearch()}`, { signal }),
        staleTime: refetchInterval ? 0 : 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchInterval,
        retry: 1,
      },
      {
        queryKey: queryKeys.analytics.platformStats(dateKey),
        enabled,
        queryFn: ({ signal }) =>
          fetchAnalytics<PlatformStat[]>(`/api/analytics/platform-stats?${buildSearch()}`, { signal }),
        staleTime: refetchInterval ? 0 : 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchInterval,
        retry: 1,
      },
      {
        queryKey: queryKeys.analytics.topPosts({ ...workspaceParams, limit: 50 }), // Increased limit for advanced table
        enabled,
        queryFn: ({ signal }) =>
          fetchAnalytics<TopPost[]>(
            `/api/analytics/top-posts?${buildSearch({ limit: '50' })}`,
            { signal }
          ),
        staleTime: refetchInterval ? 0 : 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchInterval,
        retry: 1,
      },
    ],
  });

  const [overviewQuery, engagementQuery, platformQuery, topPostsQuery] = queryResults;

  const loading = queryResults.some((query) => query.isPending || query.isFetching);
  const error = (queryResults.find((query) => query.error)?.error as Error | undefined)?.message ?? null;

  const refetch = useCallback(async () => {
    await Promise.all(queryResults.map((query) => query.refetch()));
  }, [queryResults]);

  return {
    overview: overviewQuery.data ?? null,
    engagementData: engagementQuery.data ?? [],
    platformStats: platformQuery.data ?? [],
    topPosts: topPostsQuery.data ?? [],
    loading,
    error,
    refetch,
  };
}

