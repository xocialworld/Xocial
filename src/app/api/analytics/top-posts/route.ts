import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Rate limit top posts analytics
    const limited = checkRateLimit(`${user.id}:analytics:top-posts`, 60, 60_000);
    if (!limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
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

    // Get posts with their analytics
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        platforms,
        published_at,
        post_analytics(platform, likes, comments, shares)
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
      const analytics = Array.isArray(post.post_analytics) ? post.post_analytics : [];
      let likes = 0;
      let comments = 0;
      let shares = 0;

      analytics.forEach((a: any) => {
        likes += a?.likes || 0;
        comments += a?.comments || 0;
        shares += a?.shares || 0;
      });

      const engagement = likes + comments + shares;
      const contentText = extractContentSnippet(post.content).slice(0, 150);

      const platformLeader = analytics.reduce<{ platform?: string; score: number } | null>(
        (leader, metric) => {
          const score =
            (metric?.likes || 0) + (metric?.comments || 0) + (metric?.shares || 0);
          if (!leader || score > leader.score) {
            return {
              platform: metric?.platform,
              score,
            };
          }
          return leader;
        },
        null
      );

      const primaryPlatform =
        platformLeader?.platform ||
        (Array.isArray(post.platforms) && post.platforms[0]) ||
        'unknown';

      return {
        id: post.id,
        content: contentText,
        platform: primaryPlatform,
        publishedAt: post.published_at,
        likes,
        comments,
        shares,
        engagement,
        engagementRate: 0,
        impressions: analytics.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0),
        reach: analytics.reduce((sum: number, a: any) => sum + (a.reach || 0), 0),
        saves: analytics.reduce((sum: number, a: any) => sum + (a.saves || 0), 0),
        clicks: analytics.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0),
        type: (post.post_analytics?.[0] as any)?.type || 'text',
      };
    });

    // Get follower counts for engagement rate calculation
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('platform, follower_count')
      .eq('workspace_id', workspace.id);

    const followerMap = new Map<string, number>();
    accounts?.forEach(account => {
      followerMap.set(account.platform, account.follower_count || 0);
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
    logger.error('Top posts error', error as Error);
    return handleAPIError(error);
  }
}

function extractContentSnippet(content: any): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    for (const entry of content) {
      if (typeof entry === 'string') {
        return entry;
      }
      if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
        return entry.text;
      }
    }
  }

  if (typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text;
    }
    for (const value of Object.values(content)) {
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object' && typeof (value as any).text === 'string') {
        return (value as any).text;
      }
    }
  }

  return '';
}
