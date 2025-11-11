import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { 
  getYouTubeVideoStats, 
  getYouTubeVideoComments 
} from '@/lib/oauth/youtube';

/**
 * GET /api/youtube/insights?videoId=xxx&accountId=xxx
 * Get detailed insights and comments for a YouTube video
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const accountId = searchParams.get('accountId');

  if (!videoId || !accountId) {
    throw new APIError(400, 'Video ID and Account ID are required', 'MISSING_PARAMETERS');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Verify account access
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .single();

  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }

  if (!account.access_token) {
    throw new APIError(400, 'YouTube account not authenticated', 'NOT_AUTHENTICATED');
  }

  try {
    // Fetch video statistics
    const videoStats = await getYouTubeVideoStats(account.access_token, videoId);

    if (!videoStats) {
      throw new APIError(404, 'Video not found', 'VIDEO_NOT_FOUND');
    }

    // Fetch comments
    let comments: any[] = [];
    try {
      comments = await getYouTubeVideoComments(account.access_token, videoId, 50);
    } catch (error: any) {
      // Comments may be disabled or restricted
      console.warn('[YouTube Insights] Could not fetch comments:', error.message);
    }

    // Process comments
    const processedComments = comments.map((item: any) => {
      const comment = item.snippet?.topLevelComment?.snippet;
      return {
        id: item.id,
        author: comment?.authorDisplayName,
        authorChannelUrl: comment?.authorChannelUrl,
        authorProfileImage: comment?.authorProfileImageUrl,
        text: comment?.textDisplay,
        likeCount: comment?.likeCount || 0,
        publishedAt: comment?.publishedAt,
        updatedAt: comment?.updatedAt,
        replyCount: item.snippet?.totalReplyCount || 0,
      };
    });

    // Calculate engagement metrics
    const views = parseInt(videoStats.statistics?.viewCount || '0');
    const likes = parseInt(videoStats.statistics?.likeCount || '0');
    const commentCount = parseInt(videoStats.statistics?.commentCount || '0');
    const engagement = likes + commentCount;
    const engagementRate = views > 0 ? (engagement / views) * 100 : 0;

    // Get historical data from database
    const { data: historicalData } = await supabase
      .from('post_analytics')
      .select(`
        *,
        posts!inner(id)
      `)
      .eq('platform', 'youtube')
      .eq('posts.workspace_id', workspace.id)
      .order('fetched_at', { ascending: true });

    // Filter for this video if possible
    const videoHistorical = historicalData?.filter((record: any) => {
      // Try to match by platform_post_id
      return record.post_id;
    }) || [];

    return successResponse({
      video: {
        id: videoStats.id,
        title: videoStats.snippet?.title,
        description: videoStats.snippet?.description,
        publishedAt: videoStats.snippet?.publishedAt,
        thumbnails: videoStats.snippet?.thumbnails,
        channelTitle: videoStats.snippet?.channelTitle,
      },
      statistics: {
        views,
        likes,
        comments: commentCount,
        engagement,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        favorites: parseInt(videoStats.statistics?.favoriteCount || '0'),
      },
      comments: processedComments,
      historicalData: videoHistorical.slice(-30), // Last 30 data points
    });

  } catch (error: any) {
    console.error('[YouTube Insights] Error:', error);
    throw new APIError(
      500,
      error.message || 'Failed to fetch YouTube insights',
      'YOUTUBE_INSIGHTS_ERROR'
    );
  }
});

export const dynamic = 'force-dynamic';

