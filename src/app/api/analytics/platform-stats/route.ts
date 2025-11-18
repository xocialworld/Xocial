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

    // Rate limit platform stats analytics
    const limited = checkRateLimit(`${user.id}:analytics:platform-stats`, 60, 60_000);
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

    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('id, platform, follower_count')
      .eq('workspace_id', workspace.id);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const followerMap = accounts.reduce<Map<string, number>>((map, account) => {
      const current = map.get(account.platform) || 0;
      map.set(account.platform, current + (account.follower_count || 0));
      return map;
    }, new Map());

    const { data: posts } = await supabase
      .from('posts')
      .select('platforms, post_analytics(platform, likes, comments, shares)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published');

    const statsMap = new Map<
      string,
      { platform: string; followers: number; engagement: number; posts: number; engagementRate: number }
    >();

    posts?.forEach((post) => {
      const platforms = Array.isArray(post.platforms) ? post.platforms : [];
      const analytics = (post.post_analytics as any[]) || [];

      platforms.forEach((platform: string) => {
        const entry =
          statsMap.get(platform) ||
          {
            platform,
            followers: followerMap.get(platform) || 0,
            engagement: 0,
            posts: 0,
            engagementRate: 0,
          };

        const platformAnalytics = analytics.filter(
          (metric) => metric?.platform === platform
        );

        const engagementDelta = platformAnalytics.reduce(
          (sum, metric) =>
            sum + (metric?.likes || 0) + (metric?.comments || 0) + (metric?.shares || 0),
          0
        );

        entry.posts += 1;
        entry.engagement += engagementDelta;
        statsMap.set(platform, entry);
      });
    });

    followerMap.forEach((followers, platform) => {
      if (!statsMap.has(platform)) {
        statsMap.set(platform, {
          platform,
          followers,
          engagement: 0,
          posts: 0,
          engagementRate: 0,
        });
      }
    });

    const platformStats = Array.from(statsMap.values()).map((stat) => ({
      ...stat,
      engagementRate:
        stat.followers > 0 && stat.posts > 0
          ? (stat.engagement / (stat.followers * stat.posts)) * 100
          : 0,
    }));

    platformStats.sort((a, b) => b.followers - a.followers);

    return NextResponse.json({
      success: true,
      data: platformStats,
    });
  } catch (error) {
    logger.error('Platform stats error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch platform stats' },
      { status: 500 }
    );
  }
}

