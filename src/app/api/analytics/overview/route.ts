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
      .select('id, published_at, post_analytics(likes, comments, shares, impressions)')
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

    // Try to get historical follower counts for accurate change calculation
    let prevFollowers = totalFollowers; // Default to current if no history
    try {
      const { data: historyData } = await supabase
        .from('social_account_history')
        .select('follower_count, recorded_at')
        .eq('workspace_id', workspace.id)
        .gte('recorded_at', prevFromDate.toISOString())
        .lt('recorded_at', fromDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (historyData && historyData.length > 0) {
        prevFollowers = historyData[0].follower_count || totalFollowers;
      }
    } catch {
      // Table might not exist yet, use current followers
      prevFollowers = totalFollowers;
    }

    // Calculate percentage changes with proper historical comparison
    const followersChange = prevFollowers > 0
      ? ((totalFollowers - prevFollowers) / prevFollowers) * 100
      : 0;
    const engagementChange = prevEngagement > 0
      ? ((currentEngagement - prevEngagement) / prevEngagement) * 100
      : 0;
    const engagementRateChange = prevEngagementRate > 0
      ? ((avgEngagementRate - prevEngagementRate) / prevEngagementRate) * 100
      : 0;
    const postsChange = prevPostCount > 0
      ? ((currentPostCount - prevPostCount) / prevPostCount) * 100
      : 0;

    // Calculate sparkline data (daily aggregation)
    const sparklineMap = new Map<string, {
      impressions: number;
      engagement: number;
      followers: number;
      posts: number;
    }>();

    // Initialize map with all dates in range
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      sparklineMap.set(d.toISOString().split('T')[0], {
        impressions: 0,
        engagement: 0,
        followers: totalFollowers, // Assuming constant for now or could interpolate
        posts: 0,
      });
    }

    currentPosts?.forEach((post) => {
      const date = new Date(post.published_at).toISOString().split('T')[0];
      const entry = sparklineMap.get(date);
      if (entry) {
        const analytics = post.post_analytics as any;
        let engagement = 0;
        let impressions = 0;

        if (analytics && Array.isArray(analytics)) {
          analytics.forEach((a: any) => {
            engagement += (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
            impressions += (a.impressions || 0);
          });
        }

        entry.engagement += engagement;
        entry.impressions += impressions;
        entry.posts += 1;
      }
    });

    const sparklineData = Array.from(sparklineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        ...data,
        engagementRate: data.followers > 0 ? (data.engagement / data.followers) * 100 : 0,
      }));

    const metrics = {
      totalFollowers,
      followersChange,
      totalEngagement: currentEngagement,
      engagementChange,
      avgEngagementRate,
      engagementRateChange,
      totalPosts: currentPostCount,
      postsChange,
      sparklineData, // Add this to response
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

