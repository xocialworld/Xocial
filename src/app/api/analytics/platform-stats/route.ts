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

    // Get all social accounts for the workspace
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('id, platform, follower_count')
      .eq('workspace_id', workspace.id)
      .eq('is_active', true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get posts and analytics per platform
    const platformStats = await Promise.all(
      accounts.map(async (account) => {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, post_analytics(likes, comments, shares)')
          .eq('workspace_id', workspace.id)
          .contains('platforms', [account.platform])
          .gte('published_at', from)
          .lte('published_at', to)
          .eq('status', 'published');

        const postCount = posts?.length || 0;
        const engagement = posts?.reduce((sum, post) => {
          const analytics = post.post_analytics as any;
          if (analytics && Array.isArray(analytics)) {
            return sum + analytics.reduce((s: number, a: any) => 
              s + (a.likes || 0) + (a.comments || 0) + (a.shares || 0), 0);
          }
          return sum;
        }, 0) || 0;

        const followerCount = account.follower_count || 0;
        const engagementRate = followerCount > 0 && postCount > 0
          ? (engagement / (followerCount * postCount)) * 100
          : 0;

        return {
          platform: account.platform,
          followers: followerCount,
          engagement,
          posts: postCount,
          engagementRate,
        };
      })
    );

    // Sort by followers descending
    platformStats.sort((a, b) => b.followers - a.followers);

    return NextResponse.json({
      success: true,
      data: platformStats,
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform stats' },
      { status: 500 }
    );
  }
}

