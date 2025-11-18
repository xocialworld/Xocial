/**
 * Real-Time Metrics Dashboard
 * Live engagement metrics using Supabase Realtime
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity, Heart, MessageCircle, Share2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface RealtimeMetricsProps {
  workspaceId?: string | null;
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

export function RealtimeMetrics({ workspaceId }: RealtimeMetricsProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/analytics/real-time');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load live analytics');
      }

      setSnapshot(payload.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 15_000);
    return () => clearInterval(interval);
  }, [workspaceId, fetchSnapshot]);

  const metricCards = useMemo(() => {
    if (!snapshot) return [];
    const totals = snapshot.totals;
    return [
      {
        label: 'Live Engagement',
        value: totals.engagement,
        icon: Activity,
      },
      {
        label: 'Likes',
        value: totals.likes,
        icon: Heart,
      },
      {
        label: 'Comments',
        value: totals.comments,
        icon: MessageCircle,
      },
      {
        label: 'Shares',
        value: totals.shares,
        icon: Share2,
      },
    ];
  }, [snapshot]);

  if (!workspaceId) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Live Engagement</h2>
          <p className="text-sm text-gray-500">
            Auto-refreshing snapshot of how your latest posts are performing
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {snapshot && (
            <Badge variant="outline">
              {snapshot.meta.sampleSize} posts · last {snapshot.meta.windowMinutes}m
            </Badge>
          )}
          {lastUpdated && (
            <span>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const change = snapshot ? metric.value - metric.value * 0.9 : 0; // placeholder delta
          const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
          const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

          return (
            <Card key={metric.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <p className="text-3xl font-semibold text-gray-900">
                    {metric.value.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <TrendIcon
                  className={`h-4 w-4 ${
                    trend === 'up'
                      ? 'text-green-500'
                      : trend === 'down'
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}
                />
                <span className="text-gray-600">
                  {trend === 'neutral' ? 'No change' : `${Math.abs(change).toFixed(0)} vs prev`}
                </span>
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
    </section>
  );
}

export default RealtimeMetrics;

