import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getWorkspaceFromRequest } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Basic rate limiting to protect analytics endpoints
    const limited = checkRateLimit(`${user.id}:analytics:overview`, 60, 60_000);
    if (!limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    // Calculate date ranges for comparison
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - daysDiff);

    // Get current period metrics
    const { data: currentAccounts } = await supabase
      .from('social_accounts')
      .select('follower_count')
      .eq('workspace_id', workspace.id);

    const totalFollowers = currentAccounts?.reduce((sum, acc) => sum + (acc.follower_count || 0), 0) || 0;

    // Get current period posts and analytics
    const { data: currentPosts } = await supabase
      .from('posts')
      .select('id, post_analytics(likes, comments, shares)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published');

    const currentEngagement = currentPosts?.reduce((sum, post) => {
      const analytics = post.post_analytics as any;
      if (analytics && Array.isArray(analytics)) {
        return sum + analytics.reduce((s: number, a: any) => 
          s + (a.likes || 0) + (a.comments || 0) + (a.shares || 0), 0);
      }
      return sum;
    }, 0) || 0;

    const currentPostCount = currentPosts?.length || 0;
    const avgEngagementRate = currentPostCount > 0 && totalFollowers > 0
      ? (currentEngagement / totalFollowers) * 100
      : 0;

    // Get previous period metrics for comparison
    const { data: prevPosts } = await supabase
      .from('posts')
      .select('id, post_analytics(likes, comments, shares)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', prevFromDate.toISOString())
      .lt('published_at', fromDate.toISOString())
      .eq('status', 'published');

    const prevEngagement = prevPosts?.reduce((sum, post) => {
      const analytics = post.post_analytics as any;
      if (analytics && Array.isArray(analytics)) {
        return sum + analytics.reduce((s: number, a: any) => 
          s + (a.likes || 0) + (a.comments || 0) + (a.shares || 0), 0);
      }
      return sum;
    }, 0) || 0;

    const prevPostCount = prevPosts?.length || 0;
    const prevEngagementRate = prevPostCount > 0 && totalFollowers > 0
      ? (prevEngagement / totalFollowers) * 100
      : 0;

    // Calculate percentage changes
    const followersChange = 0; // We don't track historical follower counts yet
    const engagementChange = prevEngagement > 0
      ? ((currentEngagement - prevEngagement) / prevEngagement) * 100
      : 0;
    const engagementRateChange = prevEngagementRate > 0
      ? ((avgEngagementRate - prevEngagementRate) / prevEngagementRate) * 100
      : 0;
    const postsChange = prevPostCount > 0
      ? ((currentPostCount - prevPostCount) / prevPostCount) * 100
      : 0;

    const metrics = {
      totalFollowers,
      followersChange,
      totalEngagement: currentEngagement,
      engagementChange,
      avgEngagementRate,
      engagementRateChange,
      totalPosts: currentPostCount,
      postsChange,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Analytics overview error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}

