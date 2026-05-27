import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  checkRateLimit,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/youtube?accountId=xxx&startDate=xxx&endDate=xxx&videoId=xxx
 * Fetch YouTube analytics data
 * 
 * Query params:
 * - accountId: UUID (required)
 * - startDate: ISO date (optional, defaults to 30 days ago)
 * - endDate: ISO date (optional, defaults to today)
 * - videoId: YouTube video ID (optional, for specific video analytics)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

  // Basic rate limiting to protect the Analytics API/quota
  const limited = checkRateLimit(`${user.id}:analytics:youtube`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many requests. Please slow down.', 'RATE_LIMITED');
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const videoId = searchParams.get('videoId');
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const metrics = searchParams.get('metrics') || 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares';
  const dimensions = searchParams.get('dimensions') || 'day';
  const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '200', 10) || 200, 200);
  const startIndex = Math.max(parseInt(searchParams.get('startIndex') || '1', 10) || 1, 1);

  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }

  // Get YouTube account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();

  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Decrypt access token
  const accessToken = decryptToken(account.access_token);

  try {
    if (videoId) {
      // Fetch specific video analytics
      const videoStats = await fetchYouTubeVideoAnalytics(accessToken, videoId);

      return NextResponse.json({
        success: true,
        data: videoStats,
        meta: undefined,
      });
    } else {
      // Fetch channel analytics for date range
      const channelStats = await fetchYouTubeChannelAnalytics(
        accessToken,
        account.account_id,
        startDate,
        endDate,
        { metrics, dimensions, maxResults, startIndex }
      );

      return NextResponse.json({
        success: true,
        data: channelStats,
        meta: {
          pagination: { startIndex, maxResults },
        },
      });
    }
  } catch (error: any) {
    // Preserve APIError status codes (e.g., 403 for missing scopes)
    if (error instanceof APIError) {
      throw error;
    }
    logger.error(`Failed to fetch YouTube analytics: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });

    throw new APIError(500, `Failed to fetch YouTube analytics: ${error.message}`, 'ANALYTICS_FAILED');
  }
});

/**
 * Fetch analytics for a specific YouTube video
 */
async function fetchYouTubeVideoAnalytics(
  accessToken: string,
  videoId: string
): Promise<any> {
  const params = new URLSearchParams({
    part: 'statistics,snippet,contentDetails',
    id: videoId,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch video analytics');
  }

  const data = await response.json();
  const video = data.items?.[0];

  if (!video) {
    throw new Error('Video not found');
  }

  return {
    videoId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    thumbnails: video.snippet.thumbnails,
    duration: video.contentDetails.duration,
    statistics: {
      views: parseInt(video.statistics.viewCount || '0'),
      likes: parseInt(video.statistics.likeCount || '0'),
      dislikes: parseInt(video.statistics.dislikeCount || '0'),
      comments: parseInt(video.statistics.commentCount || '0'),
      favorites: parseInt(video.statistics.favoriteCount || '0'),
    },
  };
}

/**
 * Fetch analytics for YouTube channel over a date range
 * Uses YouTube Analytics API for more detailed metrics
 */
async function fetchYouTubeChannelAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
  options: {
    metrics: string;
    dimensions: string;
    maxResults: number;
    startIndex: number;
  }
): Promise<any> {
  // YouTube Analytics API requires the reporting API
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: options.metrics,
    dimensions: options.dimensions,
    maxResults: String(options.maxResults),
    'start-index': String(options.startIndex),
  });

  const response = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    let errorBody: any = {};
    try {
      errorBody = await response.json();
    } catch { }
    // 403 Forbidden is most often missing analytics scope
    if (response.status === 403) {
      throw new APIError(
        403,
        'Advanced YouTube Analytics requires additional permissions. Please reconnect your YouTube account.',
        'ANALYTICS_SCOPE_MISSING'
      );
    }
    // Fallback to basic channel statistics if Analytics API not available or other errors
    return await fetchBasicChannelStats(accessToken, channelId);
  }

  const data = await response.json();

  type ColumnHeader = { name: string };
  type AnalyticsRow = Array<string | number | null>;

  const columnHeaders = (data.columnHeaders || []) as ColumnHeader[];
  const rows = (data.rows || []) as AnalyticsRow[];

  const indexMap = columnHeaders.reduce<Record<string, number>>(
    (acc, header, idx) => {
      acc[header.name] = idx;
      return acc;
    },
    {}
  );

  const toNumber = (value: any) => (typeof value === 'number' ? value : Number(value || 0));

  interface Totals {
    views: number;
    watchTimeMinutes: number;
    avgViewDurationSeconds: number;
    subscribersGained: number;
    subscribersLost: number;
    likes: number;
    comments: number;
    shares: number;
  }

  const totals = rows.reduce<Totals>(
    (acc, row) => {
      acc.views += toNumber(row[indexMap['views']]);
      acc.watchTimeMinutes += toNumber(row[indexMap['estimatedMinutesWatched']]);
      acc.avgViewDurationSeconds += toNumber(row[indexMap['averageViewDuration']]);
      acc.subscribersGained += toNumber(row[indexMap['subscribersGained']]);
      acc.subscribersLost += toNumber(row[indexMap['subscribersLost']]);
      acc.likes += toNumber(row[indexMap['likes']]);
      acc.comments += toNumber(row[indexMap['comments']]);
      acc.shares += toNumber(row[indexMap['shares']]);
      return acc;
    },
    {
      views: 0,
      watchTimeMinutes: 0,
      avgViewDurationSeconds: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    }
  );

  const daily = rows.map((row) => ({
    date: row[indexMap['day']] || '',
    views: toNumber(row[indexMap['views']]),
    watchTimeMinutes: toNumber(row[indexMap['estimatedMinutesWatched']]),
    averageViewDurationSeconds: toNumber(row[indexMap['averageViewDuration']]),
    subscribersGained: toNumber(row[indexMap['subscribersGained']]),
    subscribersLost: toNumber(row[indexMap['subscribersLost']]),
    likes: toNumber(row[indexMap['likes']]),
    comments: toNumber(row[indexMap['comments']]),
    shares: toNumber(row[indexMap['shares']]),
  }));

  const averageViewDurationSeconds =
    totals.views > 0 && totals.watchTimeMinutes > 0
      ? (totals.watchTimeMinutes * 60) / totals.views
      : totals.avgViewDurationSeconds / (rows.length || 1);

  const netSubscribers = totals.subscribersGained - totals.subscribersLost;
  const engagementInteractions = totals.likes + totals.comments + totals.shares;
  const engagementRate = totals.views > 0 ? (engagementInteractions / totals.views) * 100 : 0;

  return {
    channelId,
    dateRange: { startDate, endDate },
    metrics: {
      totalViews: totals.views,
      totalWatchTimeMinutes: totals.watchTimeMinutes,
      averageViewDurationSeconds,
      subscribersGained: totals.subscribersGained,
      subscribersLost: totals.subscribersLost,
      netSubscribers,
      likes: totals.likes,
      comments: totals.comments,
      shares: totals.shares,
      engagementRate,
    },
    daily,
  };
}

/**
 * Fallback: Fetch basic channel statistics when Analytics API not available
 */
async function fetchBasicChannelStats(
  accessToken: string,
  channelId: string
): Promise<any> {
  // First try: Fetch by channel ID
  let params = new URLSearchParams({
    part: 'statistics,snippet',
    id: channelId,
  });

  let response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  let data: any = null;
  let channel: any = null;

  if (response.ok) {
    data = await response.json();
    channel = data.items?.[0];
  }

  // Fallback: If channel not found by ID, try using mine=true
  if (!channel) {
    logger.warn('Channel not found by ID, trying mine=true fallback', { channelId });

    params = new URLSearchParams({
      part: 'statistics,snippet',
      mine: 'true',
    });

    response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Failed to fetch basic channel stats with mine=true', new Error(response.statusText), {
        status: response.status,
        statusText: response.statusText,
        errorBody,
        channelId,
      });
      throw new Error(`Failed to fetch basic channel stats: ${response.status} ${response.statusText}`);
    }

    data = await response.json();
    channel = data.items?.[0];
  }

  if (!channel) {
    logger.error('No channel data returned from YouTube API', new Error('Channel not found'), {
      channelId,
      responseData: data,
    });
    throw new Error('Channel not found - no channel data returned from YouTube API');
  }

  logger.info('Successfully fetched basic channel stats', {
    channelId: channel.id,
    channelTitle: channel.snippet?.title,
  });

  return {
    channelId: channel.id,
    metrics: {
      totalViews: parseInt(channel.statistics?.viewCount || '0'),
      totalWatchTimeMinutes: 0,
      averageViewDurationSeconds: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      netSubscribers: parseInt(channel.statistics?.subscriberCount || '0'),
      likes: 0,
      comments: 0,
      shares: 0,
      engagementRate: 0,
    },
    daily: [],
  };
}

export const runtime = 'nodejs';
