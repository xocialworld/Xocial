import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
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
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

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

    // Fetch metrics from materialized view
    const { data: summaryRows, error: metricsError } = await supabase
      .from('daily_metrics_summary')
      .select('*')
      .eq('workspace_id', workspace.id)
      .gte('metric_date', from)
      .lte('metric_date', to);

    if (metricsError) {
      throw new Error(metricsError.message);
    }

    const statsMap = new Map<string, PlatformStat>();

    // Initialize map with accounts (followers)
    followerMap.forEach((followers, platform) => {
      const platformLower = platform.toLowerCase();
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
    });

    // Aggregate from summary view
    summaryRows?.forEach((row) => {
      const platformLower = row.platform?.toLowerCase();
      if (!platformLower) return;

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

      entry.likes += (row.likes || 0);
      entry.comments += (row.comments || 0);
      entry.shares += (row.shares || 0);
      entry.posts += (row.post_count || 0);

      // We can use the 'engagement' column from MV which is likely sum of interactions
      // OR calculate it from likes+comments+shares to be consistent with previous logic.
      // Previous logic: entry.engagement = entry.likes + entry.comments + entry.shares;
      // Let's stick to calculated for consistency with this specific endpoint's definition
      entry.engagement = entry.likes + entry.comments + entry.shares;

      const pm = entry.platformMetrics;

      // Map MV columns to platform metrics
      if (typeof row.video_views === 'number') pm.views = (pm.views || 0) + row.video_views;
      if (typeof row.reach === 'number') pm.reach = (pm.reach || 0) + row.reach;
      if (typeof row.impressions === 'number') pm.impressions = (pm.impressions || 0) + row.impressions;
      if (typeof row.saves === 'number') pm.saves = (pm.saves || 0) + row.saves;
      if (typeof row.clicks === 'number') pm.clicks = (pm.clicks || 0) + row.clicks;

      // Fill in platform specific "Views" holes if generic names differ
      // e.g. TikTok uses 'views' but MV has 'video_views'. Handled above.

      statsMap.set(platformLower, entry);
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
    return handleAPIError(error);
  }
}
