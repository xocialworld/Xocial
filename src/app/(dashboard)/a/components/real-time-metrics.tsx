/**
 * Real-Time Metrics Dashboard
 * Live engagement metrics using Supabase Realtime
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity, Heart, MessageCircle, Share2, Eye } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface RealtimeMetricsProps {
  workspaceId?: string | null;
  isLive?: boolean;
}

interface Snapshot {
  totals: {
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    saves: number;
    clicks: number;
  };
  sparkline: { timestamp: string; engagement: number }[];
  topPosts: {
    postId: string;
    platform: string;
    publishedAt?: string;
    updatedAt: string;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    contentPreview: string;
  }[];
  meta: {
    windowMinutes: number;
    sampleSize: number;
  };
}

// Store previous totals for calculating real deltas
interface PreviousTotals {
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  timestamp: number;
}

export function RealtimeMetrics({ workspaceId, isLive = false }: RealtimeMetricsProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Track previous values for real delta calculations
  const previousTotalsRef = useRef<PreviousTotals | null>(null);
  const [deltas, setDeltas] = useState<Record<string, number>>({
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  });

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/analytics/real-time');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load live analytics');
      }

      const newSnapshot = payload.data as Snapshot;

      // Calculate real deltas from previous snapshot
      if (previousTotalsRef.current && newSnapshot) {
        const prev = previousTotalsRef.current;
        setDeltas({
          engagement: newSnapshot.totals.engagement - prev.engagement,
          likes: newSnapshot.totals.likes - prev.likes,
          comments: newSnapshot.totals.comments - prev.comments,
          shares: newSnapshot.totals.shares - prev.shares,
        });
      }

      // Store current values for next comparison
      if (newSnapshot) {
        previousTotalsRef.current = {
          engagement: newSnapshot.totals.engagement,
          likes: newSnapshot.totals.likes,
          comments: newSnapshot.totals.comments,
          shares: newSnapshot.totals.shares,
          timestamp: Date.now(),
        };
      }

      setSnapshot(newSnapshot);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    // Always fetch once on mount
    fetchSnapshot();

    // Only set up interval if Live Mode is enabled
    if (isLive) {
      const interval = setInterval(fetchSnapshot, 15_000);
      return () => clearInterval(interval);
    }
  }, [workspaceId, fetchSnapshot, isLive]);

  const metricCards = useMemo(() => {
    if (!snapshot) return [];
    const totals = snapshot.totals;
    return [
      {
        label: 'Live Engagement',
        value: totals.engagement,
        icon: Activity,
        deltaKey: 'engagement',
        color: 'blue',
      },
      {
        label: 'Likes',
        value: totals.likes,
        icon: Heart,
        deltaKey: 'likes',
        color: 'pink',
      },
      {
        label: 'Comments',
        value: totals.comments,
        icon: MessageCircle,
        deltaKey: 'comments',
        color: 'purple',
      },
      {
        label: 'Shares',
        value: totals.shares,
        icon: Share2,
        deltaKey: 'shares',
        color: 'green',
      },
    ];
  }, [snapshot]);

  if (!workspaceId) {
    return null;
  }

  // Color mappings for cards
  const colorMap: Record<string, { bg: string; iconBg: string; icon: string }> = {
    blue: { bg: 'from-blue-500/10 to-indigo-500/10', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600', icon: 'text-white' },
    pink: { bg: 'from-pink-500/10 to-rose-500/10', iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600', icon: 'text-white' },
    purple: { bg: 'from-purple-500/10 to-violet-500/10', iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600', icon: 'text-white' },
    green: { bg: 'from-green-500/10 to-emerald-500/10', iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600', icon: 'text-white' },
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Live Engagement
          </h2>
          <p className="text-sm text-gray-500">
            Auto-refreshing snapshot of how your latest posts are performing
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {snapshot && (
            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {snapshot.meta.sampleSize} posts · last {snapshot.meta.windowMinutes}m
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-xs">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const change = deltas[metric.deltaKey] || 0;
          const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
          const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
          const colors = colorMap[metric.color] || colorMap.blue;

          return (
            <Card
              key={metric.label}
              className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${colors.bg} backdrop-blur-sm`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                      {metric.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${colors.iconBg} flex items-center justify-center shadow-lg`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend === 'up'
                    ? 'bg-green-100 text-green-700'
                    : trend === 'down'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                    <TrendIcon className="h-3 w-3" />
                    <span>
                      {trend === 'neutral'
                        ? 'No change'
                        : `${change > 0 ? '+' : ''}${change.toLocaleString()}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">since last refresh</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Engagement sparkline</h3>
              <p className="text-sm text-gray-500">Aggregated 5-minute buckets</p>
            </div>
            {loading && (
              <Badge variant="secondary" className="animate-pulse">
                Refreshing…
              </Badge>
            )}
          </div>
          <div className="h-64">
            {snapshot?.sparkline?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={snapshot.sparkline.map((point) => ({
                    ...point,
                    label: new Date(point.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#2563eb"
                    fill="#93c5fd"
                    strokeWidth={2}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No live engagement in the selected window
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Latest high-performing posts</h3>
            <p className="text-sm text-gray-500">
              Auto-updated view of the posts driving the most engagement right now
            </p>
          </div>

          <div className="space-y-4">
            {snapshot?.topPosts?.length ? (
              snapshot.topPosts.map((post) => (
                <div
                  key={post.postId}
                  className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="uppercase tracking-wide">{post.platform}</span>
                    <span>
                      Updated {new Date(post.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-900 line-clamp-2">
                    {post.contentPreview || 'Untitled post'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                    <span>Engagement: {post.engagement.toLocaleString()}</span>
                    <span>Likes: {post.likes.toLocaleString()}</span>
                    <span>Comments: {post.comments.toLocaleString()}</span>
                    <span>Shares: {post.shares.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No recent posts have updated in the selected time window.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section >
  );
}

export default RealtimeMetrics;

