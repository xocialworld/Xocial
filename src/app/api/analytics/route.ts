// ... (imports remain)
import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);

  // Calculate date ranges
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(now.getDate() - days);

  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(currentPeriodStart.getDate() - days);

  // Fetch metrics from materialized view (Optimization: Pre-aggregated data)
  const { data: summaryRows, error: metricsError } = await supabase
    .from('daily_metrics_summary')
    .select('*')
    .eq('workspace_id', workspace.id)
    .gte('metric_date', previousPeriodStart.toISOString());

  if (metricsError) {
    throw new APIError(500, metricsError.message, 'DATABASE_ERROR');
  }

  // Also fetch recent posts for the list view (limit to top 10 recent)
  const { data: recentPosts } = await supabase
    .from('posts')
    .select(`
      id,
      status,
      published_at,
      title, 
      post_analytics(
        impressions,
        engagement,
        engagement_rate
      )
    `)
    .eq('workspace_id', workspace.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10);

  // Helper to aggregate summary rows
  const aggregate = (rows: any[]) => {
    const count = rows.reduce((acc, curr) => acc + (curr.post_count || 0), 0);
    const sum = (field: string) => rows.reduce((acc, curr) => acc + (curr[field] || 0), 0);

    // Engagement rate in MV is average. For total period, weighted avgs are hard without base sums.
    // We will approximate by averaging the daily averages weighted by post count? 
    // Simpler: sum(engagement) / sum(impressions) if available.
    // In MV we have sums of impressions and engagement.
    const totalImpressions = sum('impressions');
    const totalEngagement = sum('engagement');
    const calculatedRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) : 0;

    return {
      impressions: totalImpressions,
      engagement: totalEngagement,
      reach: sum('reach'),
      engagementRate: calculatedRate,
      postCount: count
    };
  };

  // Split summary rows into periods
  // Note: metric_date is a string 'YYYY-MM-DD' returned by Postgres
  // We compare dates.
  const currentRows = summaryRows?.filter(r => new Date(r.metric_date) >= currentPeriodStart) || [];
  const previousRows = summaryRows?.filter(r => new Date(r.metric_date) < currentPeriodStart && new Date(r.metric_date) >= previousPeriodStart) || [];

  const currentMetrics = aggregate(currentRows);
  const previousMetrics = aggregate(previousRows);

  // Calculate changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get follower count (current only, as we don't track history of followers in this simple view efficiently yet)
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('follower_count')
    .eq('workspace_id', workspace.id)
    .eq('is_active', true);

  const totalFollowers = accounts?.reduce((sum, acc) => sum + (acc.follower_count || 0), 0) || 0;

  const metrics = {
    impressions: {
      value: currentMetrics.impressions,
      change: calculateChange(currentMetrics.impressions, previousMetrics.impressions),
      trend: currentMetrics.impressions >= previousMetrics.impressions ? 'up' : 'down',
    },
    engagement: {
      value: currentMetrics.engagement,
      change: calculateChange(currentMetrics.engagement, previousMetrics.engagement),
      trend: currentMetrics.engagement >= previousMetrics.engagement ? 'up' : 'down',
    },
    followers: {
      value: totalFollowers,
      change: 0, // No history for now
      trend: 'up', // Default
    },
    engagementRate: {
      value: currentMetrics.engagementRate,
      change: calculateChange(currentMetrics.engagementRate, previousMetrics.engagementRate),
      trend: currentMetrics.engagementRate >= previousMetrics.engagementRate ? 'up' : 'down',
    },
  };

  return successResponse({
    metrics,
    posts: recentPosts,
    analytics: recentPosts?.flatMap(p => p.post_analytics || []) || [],
  });
});
