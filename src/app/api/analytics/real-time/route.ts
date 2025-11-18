import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getUserWorkspace,
  successResponse,
  APIError,
} from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

interface SparklineBucket {
  timestamp: string;
  engagement: number;
}

type AnalyticsRow = {
  id: string;
  post_id: string;
  platform: string;
  impressions: number | null;
  engagement: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  updated_at: string;
  posts: {
    id: string;
    content: unknown;
    published_at: string | null;
    platforms: string[];
    status: string;
    workspace_id: string;
  } | null;
};

/**
 * GET /api/analytics/real-time
 * Returns aggregated engagement metrics for the last N minutes (default 60)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const workspace = await getUserWorkspace(user.id, supabase);

  const searchParams = request.nextUrl.searchParams;
  const minutes = Math.min(
    Math.max(parseInt(searchParams.get('minutes') || '60', 10), 5),
    720
  );
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('post_analytics')
    .select(
      `
        id,
        post_id,
        platform,
        impressions,
        engagement,
        likes,
        comments,
        shares,
        saves,
        clicks,
        updated_at,
        posts!inner(
          id,
          content,
          published_at,
          platforms,
          status,
          workspace_id
        )
      `
    )
    .eq('posts.workspace_id', workspace.id)
    .eq('posts.status', 'published')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  const analytics: AnalyticsRow[] = (data ?? []).map((row: any) => ({
    ...row,
    posts: Array.isArray(row.posts) ? row.posts[0] : row.posts,
  }));

  const totals = analytics.reduce(
    (acc, row) => {
      const likes = row.likes || 0;
      const comments = row.comments || 0;
      const shares = row.shares || 0;
      const engagement = row.engagement ?? likes + comments + shares;
      acc.engagement += engagement;
      acc.likes += likes;
      acc.comments += comments;
      acc.shares += shares;
      acc.impressions += row.impressions || 0;
      acc.saves += row.saves || 0;
      acc.clicks += row.clicks || 0;
      return acc;
    },
    {
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      impressions: 0,
      saves: 0,
      clicks: 0,
    }
  );

  const bucketSizeMs = 5 * 60 * 1000; // 5-minute buckets
  const sparklineMap = new Map<number, number>();

  analytics.forEach((row) => {
    const time = new Date(row.updated_at).getTime();
    const bucket = Math.floor(time / bucketSizeMs) * bucketSizeMs;
    const likes = row.likes || 0;
    const comments = row.comments || 0;
    const shares = row.shares || 0;
    const engagement = row.engagement ?? likes + comments + shares;

    sparklineMap.set(bucket, (sparklineMap.get(bucket) || 0) + engagement);
  });

  const sparkline: SparklineBucket[] = Array.from(sparklineMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, engagement]) => ({
      timestamp: new Date(timestamp).toISOString(),
      engagement,
    }));

  const topPosts = analytics.slice(0, 6).map((row) => {
    const likes = row.likes || 0;
    const comments = row.comments || 0;
    const shares = row.shares || 0;
    return {
      postId: row.post_id,
      platform: row.platform,
      publishedAt: row.posts?.published_at,
      updatedAt: row.updated_at,
      engagement: row.engagement ?? likes + comments + shares,
      likes,
      comments,
      shares,
      impressions: row.impressions || 0,
      contentPreview: extractContentPreview(row.posts?.content),
    };
  });

  return successResponse({
    totals,
    sparkline,
    topPosts,
    meta: {
      windowMinutes: minutes,
      sampleSize: analytics.length,
    },
  });
});

function extractContentPreview(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') {
    return content.slice(0, 140);
  }

  if (typeof content === 'object') {
    const firstPlatform = Object.keys(content)[0];
    const text = firstPlatform ? content[firstPlatform]?.text : null;
    if (text) {
      return String(text).slice(0, 140);
    }
  }

  return '';
}
