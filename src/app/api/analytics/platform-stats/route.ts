import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getWorkspaceFromRequest } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Platform-specific metric keys for proper data mapping
const PLATFORM_METRIC_KEYS: Record<string, string[]> = {
  youtube: ['views', 'subscribers', 'likes', 'comments', 'watchTime'],
  tiktok: ['views', 'likes', 'comments', 'shares', 'profileViews'],
  instagram: ['reach', 'impressions', 'likes', 'comments', 'saves'],
  facebook: ['reach', 'impressions', 'likes', 'comments', 'shares'],
  twitter: ['impressions', 'likes', 'retweets', 'replies', 'profileClicks'],
  linkedin: ['impressions', 'likes', 'comments', 'shares', 'clicks'],
};

// Platform-specific primary metric for engagement calculation
const PRIMARY_METRIC_BY_PLATFORM: Record<string, string> = {
  youtube: 'views',
  tiktok: 'views',
  instagram: 'reach',
  facebook: 'reach',
  twitter: 'impressions',
  linkedin: 'impressions',
};

interface PlatformMetrics {
  views?: number;
  reach?: number;
  impressions?: number;
  saves?: number;
  retweets?: number;
  replies?: number;
  clicks?: number;
  watchTime?: number;
  profileViews?: number;
  profileClicks?: number;
}

interface PlatformStat {
  platform: string;
  followers: number;
  engagement: number;
  posts: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  platformMetrics: PlatformMetrics;
}

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

    // Fetch posts with all analytics fields for platform-specific metrics
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        platforms,
        post_analytics(
          platform,
          likes,
          comments,
          shares,
          impressions,
          reach,
          saves,
          clicks,
          video_views,
          engagement_rate
        )
      `)
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published');

    const statsMap = new Map<string, PlatformStat>();

    posts?.forEach((post) => {
      const platforms = Array.isArray(post.platforms) ? post.platforms : [];
      const analytics = (post.post_analytics as any[]) || [];

      platforms.forEach((platform: string) => {
        const platformLower = platform.toLowerCase();
        const entry: PlatformStat = statsMap.get(platformLower) || {
          platform: platformLower,
          followers: followerMap.get(platformLower) || 0,
          engagement: 0,
          posts: 0,
          engagementRate: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          platformMetrics: {},
        };

        const platformAnalytics = analytics.filter(
          (metric) => metric?.platform?.toLowerCase() === platformLower
        );

        platformAnalytics.forEach((metric: any) => {
          // Core engagement metrics
          entry.likes += metric?.likes || 0;
          entry.comments += metric?.comments || 0;
          entry.shares += metric?.shares || 0;

          // Platform-specific metrics
          const pm = entry.platformMetrics;

          // Views (YouTube, TikTok)
          if (platformLower === 'youtube' || platformLower === 'tiktok') {
            pm.views = (pm.views || 0) + (metric?.video_views || metric?.impressions || 0);
          }

          // Reach (Instagram, Facebook)
          if (platformLower === 'instagram' || platformLower === 'facebook') {
            pm.reach = (pm.reach || 0) + (metric?.reach || 0);
            pm.impressions = (pm.impressions || 0) + (metric?.impressions || 0);
          }

          // Impressions (Twitter, LinkedIn)
          if (platformLower === 'twitter' || platformLower === 'linkedin') {
            pm.impressions = (pm.impressions || 0) + (metric?.impressions || 0);
          }

          // Saves (Instagram)
          if (platformLower === 'instagram') {
            pm.saves = (pm.saves || 0) + (metric?.saves || 0);
          }

          // Clicks (LinkedIn)
          if (platformLower === 'linkedin') {
            pm.clicks = (pm.clicks || 0) + (metric?.clicks || 0);
          }
        });

        // Calculate total engagement
        entry.engagement = entry.likes + entry.comments + entry.shares;
        entry.posts += 1;
        statsMap.set(platformLower, entry);
      });
    });

    // Add platforms with no posts but have connected accounts
    followerMap.forEach((followers, platform) => {
      const platformLower = platform.toLowerCase();
      if (!statsMap.has(platformLower)) {
        statsMap.set(platformLower, {
          platform: platformLower,
          followers,
          engagement: 0,
          posts: 0,
          engagementRate: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          platformMetrics: {},
        });
      }
    });

    // Calculate engagement rate using platform-appropriate base metric
    const platformStats = Array.from(statsMap.values()).map((stat) => {
      const primaryMetric = PRIMARY_METRIC_BY_PLATFORM[stat.platform] || 'followers';
      let baseValue = stat.followers;

      // Use platform-specific primary metric for engagement rate calculation
      if (primaryMetric === 'views' && stat.platformMetrics.views) {
        baseValue = stat.platformMetrics.views;
      } else if (primaryMetric === 'reach' && stat.platformMetrics.reach) {
        baseValue = stat.platformMetrics.reach;
      } else if (primaryMetric === 'impressions' && stat.platformMetrics.impressions) {
        baseValue = stat.platformMetrics.impressions;
      }

      return {
        ...stat,
        engagementRate: baseValue > 0 ? (stat.engagement / baseValue) * 100 : 0,
        metricKeys: PLATFORM_METRIC_KEYS[stat.platform] || [],
      };
    });

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

