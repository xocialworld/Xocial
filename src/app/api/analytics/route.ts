import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';

/**
 * GET /api/analytics - Get analytics metrics
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Get time range from query params
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get posts for the period
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      status,
      published_at,
      post_analytics(*)
    `)
    .eq('workspace_id', workspace.id)
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString())
    .order('published_at', { ascending: false });

  if (postsError) {
    throw new APIError(500, postsError.message, 'DATABASE_ERROR');
  }

  // Calculate metrics
  const analytics = posts?.flatMap((post: any) => post.post_analytics || []) || [];

  const totalImpressions = analytics.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0);
  const totalEngagement = analytics.reduce((sum: number, a: any) => sum + (a.engagement || 0), 0);
  const totalReach = analytics.reduce((sum: number, a: any) => sum + (a.reach || 0), 0);

  const avgEngagementRate =
    analytics.length > 0
      ? analytics.reduce((sum: number, a: any) => sum + (a.engagement_rate || 0), 0) /
        analytics.length
      : 0;

  // Get follower count from social accounts
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('follower_count')
    .eq('workspace_id', workspace.id)
    .eq('is_active', true);

  const totalFollowers = accounts?.reduce(
    (sum, acc) => sum + (acc.follower_count || 0),
    0
  ) || 0;

  // TODO: Calculate changes from previous period
  // For now, using mock data
  const metrics = {
    impressions: {
      value: totalImpressions,
      change: 12.5,
      trend: 'up' as const,
    },
    engagement: {
      value: totalEngagement,
      change: 8.3,
      trend: 'up' as const,
    },
    followers: {
      value: totalFollowers,
      change: 5.2,
      trend: 'up' as const,
    },
    engagementRate: {
      value: avgEngagementRate,
      change: 2.1,
      trend: 'up' as const,
    },
  };

  return successResponse({
    metrics,
    posts: posts || [],
    analytics: analytics || [],
  });
});

