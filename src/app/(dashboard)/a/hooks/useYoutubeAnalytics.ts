'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SocialAccountMetrics } from '@/types';

interface YoutubeAccount {
  id: string;
  account_name: string;
  follower_count?: number;
  metadata?: Record<string, any>;
  metrics?: SocialAccountMetrics;
}

export interface YoutubeMetrics {
  totalViews: number;
  totalWatchTimeMinutes: number;
  averageViewDurationSeconds: number;
  subscribersGained: number;
  subscribersLost: number;
  netSubscribers: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface YoutubeDailyPoint {
  date: string;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  subscribersGained: number;
  subscribersLost: number;
  likes: number;
  comments: number;
  shares: number;
}

interface UseYoutubeAnalyticsReturn {
  accounts: YoutubeAccount[];
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  metrics: YoutubeMetrics | null;
  daily: YoutubeDailyPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useYoutubeAnalytics(dateRange: { from: Date; to: Date }): UseYoutubeAnalyticsReturn {
  const [accounts, setAccounts] = useState<YoutubeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<YoutubeMetrics | null>(null);
  const [daily, setDaily] = useState<YoutubeDailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts?limit=100');
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.error ?? 'Failed to load connected accounts');
      }
      const youtubeAccounts: YoutubeAccount[] =
        json?.data?.accounts?.filter((account: any) => account.platform === 'youtube') || [];
      setAccounts(youtubeAccounts);
      if (youtubeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(youtubeAccounts[0].id);
      }
    } catch (err) {
      console.error('YouTube accounts fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load YouTube accounts');
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        accountId: selectedAccountId,
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/analytics/youtube?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        const errorMessage = typeof payload?.error === 'string'
          ? payload.error
          : payload?.message || 'Failed to load YouTube analytics';
        throw new Error(errorMessage);
      }

      setMetrics(payload.data?.metrics || null);
      setDaily(payload.data?.daily || []);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Failed to load YouTube analytics';
      // Only log as warning since this can happen when no YouTube accounts are connected
      if (process.env.NODE_ENV === 'development') {
        console.warn('YouTube analytics:', errorMessage);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const orderedDaily = useMemo(() => {
    if (!daily.length) return [];
    return [...daily].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [daily]);

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    metrics,
    daily: orderedDaily,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}


