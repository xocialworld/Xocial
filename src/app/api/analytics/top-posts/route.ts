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
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Get posts with their analytics
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        platforms,
        published_at,
        post_analytics(likes, comments, shares)
      `)
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Calculate engagement for each post
    const postsWithEngagement = posts.map(post => {
      const analytics = post.post_analytics as any;
      let likes = 0;
      let comments = 0;
      let shares = 0;

      if (analytics && Array.isArray(analytics)) {
        analytics.forEach((a: any) => {
          likes += a.likes || 0;
          comments += a.comments || 0;
          shares += a.shares || 0;
        });
      }

      const engagement = likes + comments + shares;
      
      // Extract text content from JSONB
      let contentText = '';
      if (typeof post.content === 'object' && post.content !== null) {
        const contentObj = post.content as Record<string, any>;
        const firstPlatform = Object.keys(contentObj)[0];
        if (firstPlatform && contentObj[firstPlatform]?.text) {
          contentText = contentObj[firstPlatform].text;
        }
      }

      // Get first platform
      const platform = Array.isArray(post.platforms) && post.platforms.length > 0
        ? post.platforms[0]
        : 'unknown';

      return {
        id: post.id,
        content: contentText.slice(0, 150), // Truncate for display
        platform,
        publishedAt: post.published_at,
        likes,
        comments,
        shares,
        engagement,
        engagementRate: 0, // Will calculate after getting follower counts
      };
    });

    // Get follower counts for engagement rate calculation
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('platform, followers_count')
      .eq('workspace_id', workspace.id);

    const followerMap = new Map<string, number>();
    accounts?.forEach(account => {
      followerMap.set(account.platform, account.followers_count || 0);
    });

    // Calculate engagement rates
    postsWithEngagement.forEach(post => {
      const followers = followerMap.get(post.platform) || 0;
      post.engagementRate = followers > 0 ? (post.engagement / followers) * 100 : 0;
    });

    // Sort by engagement and limit
    const topPosts = postsWithEngagement
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: topPosts,
    });
  } catch (error) {
    console.error('Top posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top posts' },
      { status: 500 }
    );
  }
}

