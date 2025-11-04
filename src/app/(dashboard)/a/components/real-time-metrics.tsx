/**
 * Real-Time Metrics Dashboard
 * Live engagement metrics using Supabase Realtime
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface RealtimeMetric {
  label: string;
  value: number;
  previousValue: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
}

interface Props {
  workspaceId: string;
}

export function RealtimeMetrics({ workspaceId }: Props) {
  const [metrics, setMetrics] = useState<RealtimeMetric[]>([
    {
      label: 'Total Engagement',
      value: 0,
      previousValue: 0,
      change: 0,
      trend: 'neutral',
      icon: Activity,
    },
  ]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Fetch initial data
    fetchMetrics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('realtime-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_analytics',
          filter: `posts.workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Analytics update received:', payload);
          handleRealtimeUpdate(payload);
          setLastUpdate(new Date());
        }
      )
      .on('system', {}, (payload) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
          setIsConnected(true);
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [workspaceId]);

  const fetchMetrics = async () => {
    try {
      // Fetch current metrics
      const { data: analytics, error } = await supabase
        .from('post_analytics')
        .select(`
          impressions,
          engagement,
          likes,
          comments,
          shares,
          posts!inner(workspace_id)
        `)
        .eq('posts.workspace_id', workspaceId);

      if (error) throw error;

      if (analytics && analytics.length > 0) {
        const totalEngagement = analytics.reduce((sum, a: any) => sum + (a.engagement || 0), 0);
        const totalLikes = analytics.reduce((sum, a: any) => sum + (a.likes || 0), 0);
        const totalComments = analytics.reduce((sum, a: any) => sum + (a.comments || 0), 0);
        const totalShares = analytics.reduce((sum, a: any) => sum + (a.shares || 0), 0);

        setMetrics([
          {
            label: 'Total Engagement',
            value: totalEngagement,
            previousValue: 0,
            change: 0,
            trend: 'neutral',
            icon: Activity,
          },
        ]);
      }
    } catch (error) {
      console.error('[Realtime] Failed to fetch metrics:', error);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    // Update metrics based on the change
    setMetrics((prev) =>
      prev.map((metric) => {
        // Calculate new values based on payload
        const newValue = metric.value + (payload.new?.engagement || 0);
        const change = newValue - metric.value;
        
        return {
          ...metric,
          previousValue: metric.value,
          value: newValue,
          change,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        };
      })
    );

    // Show toast notification for significant changes
    if (payload.new?.engagement > 100) {
      toast.success(`New engagement! +${payload.new.engagement}`, {
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-success-500' : 'bg-gray-400'
            } animate-pulse`}
          />
          <span className="text-sm text-secondary-600">
            {isConnected ? 'Live updates active' : 'Connecting...'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-secondary-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Real-time metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon =
            metric.trend === 'up'
              ? TrendingUp
              : metric.trend === 'down'
              ? TrendingDown
              : Minus;

          return (
            <Card key={metric.label} className="p-6 relative overflow-hidden">
              {/* Live indicator */}
              {metric.change !== 0 && (
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="secondary"
                    className="text-xs animate-pulse"
                  >
                    LIVE
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-600">{metric.label}</span>
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-secondary-900">
                  {metric.value.toLocaleString()}
                </h3>
                {metric.change !== 0 && (
                  <div
                    className={`flex items-center text-sm font-medium ${
                      metric.trend === 'up'
                        ? 'text-success-600'
                        : metric.trend === 'down'
                        ? 'text-error-600'
                        : 'text-gray-600'
                    }`}
                  >
                    <TrendIcon className="h-4 w-4 mr-1" />
                    {Math.abs(metric.change).toLocaleString()}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default RealtimeMetrics;

