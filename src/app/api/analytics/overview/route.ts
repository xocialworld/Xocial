import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Calculate date ranges for comparison
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - daysDiff);

    // Get current period metrics
    const { data: currentAccounts } = await supabase
      .from('social_accounts')
      .select('followers_count')
      .eq('workspace_id', workspace.id);

    const totalFollowers = currentAccounts?.reduce((sum, acc) => sum + (acc.followers_count || 0), 0) || 0;

    // Get current period posts and analytics
    const { data: currentPosts } = await supabase
      .from('posts')
      .select('id, post_analytics(platform, likes, comments, shares, views)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published');

    let currentEngagement = 0;
    let currentViews = 0;
    let youtubeViews = 0;
    let youtubeEngagement = 0;

    currentPosts?.forEach((post) => {
      const analytics = post.post_analytics as any;
      if (analytics && Array.isArray(analytics)) {
        analytics.forEach((a: any) => {
          const engagement = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
          currentEngagement += engagement;
          currentViews += (a.views || 0);
          
          // Track YouTube specific metrics
          if (a.platform === 'youtube') {
            youtubeViews += (a.views || 0);
            youtubeEngagement += engagement;
          }
        });
      }
    });

    const currentPostCount = currentPosts?.length || 0;
    const avgEngagementRate = currentPostCount > 0 && totalFollowers > 0
      ? (currentEngagement / totalFollowers) * 100
      : 0;

    // Get previous period metrics for comparison
    const { data: prevPosts } = await supabase
      .from('posts')
      .select('id, post_analytics(platform, likes, comments, shares, views)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', prevFromDate.toISOString())
      .lt('published_at', fromDate.toISOString())
      .eq('status', 'published');

    let prevEngagement = 0;
    let prevViews = 0;
    let prevYoutubeViews = 0;

    prevPosts?.forEach((post) => {
      const analytics = post.post_analytics as any;
      if (analytics && Array.isArray(analytics)) {
        analytics.forEach((a: any) => {
          const engagement = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
          prevEngagement += engagement;
          prevViews += (a.views || 0);
          
          if (a.platform === 'youtube') {
            prevYoutubeViews += (a.views || 0);
          }
        });
      }
    });

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
    const viewsChange = prevViews > 0
      ? ((currentViews - prevViews) / prevViews) * 100
      : 0;
    const youtubeViewsChange = prevYoutubeViews > 0
      ? ((youtubeViews - prevYoutubeViews) / prevYoutubeViews) * 100
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
      totalViews: currentViews,
      viewsChange,
      youtube: {
        views: youtubeViews,
        viewsChange: youtubeViewsChange,
        engagement: youtubeEngagement,
      },
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}

