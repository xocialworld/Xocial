import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { getYouTubeChannelStats, getYouTubeVideoStats } from '@/lib/oauth/youtube';

/**
 * GET /api/analytics/youtube?accountId=xxx
 * Get YouTube channel and video analytics
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    throw new APIError(400, 'Account ID is required', 'MISSING_ACCOUNT_ID');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Get the YouTube social account
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
    // Fetch channel statistics
    const channelStats = await getYouTubeChannelStats(
      account.access_token,
      account.platform_user_id
    );

    // Get recent videos from the database (platform_posts)
    const { data: recentVideos, error: videosError } = await supabase
      .from('platform_posts')
      .select(`
        *,
        posts!inner(
          id,
          content,
          created_at
        )
      `)
      .eq('platform', 'youtube')
      .eq('posts.workspace_id', workspace.id)
      .order('published_at', { ascending: false })
      .limit(10);

    if (videosError) {
      console.error('[YouTube Analytics] Error fetching videos:', videosError);
    }

    // Fetch detailed stats for recent videos
    const videoStats = await Promise.all(
      (recentVideos || []).slice(0, 5).map(async (video: any) => {
        try {
          const stats = await getYouTubeVideoStats(
            account.access_token,
            video.platform_post_id
          );
          return {
            id: video.platform_post_id,
            title: stats.snippet?.title || 'Untitled',
            publishedAt: video.published_at,
            thumbnail: stats.snippet?.thumbnails?.medium?.url,
            views: parseInt(stats.statistics?.viewCount || '0'),
            likes: parseInt(stats.statistics?.likeCount || '0'),
            comments: parseInt(stats.statistics?.commentCount || '0'),
            permalink: video.permalink,
          };
        } catch (error) {
          console.error(`Error fetching stats for video ${video.platform_post_id}:`, error);
          return null;
        }
      })
    );

    // Calculate total metrics from recent videos
    const totalViews = videoStats.reduce((sum, video) => sum + (video?.views || 0), 0);
    const totalLikes = videoStats.reduce((sum, video) => sum + (video?.likes || 0), 0);
    const totalComments = videoStats.reduce((sum, video) => sum + (video?.comments || 0), 0);

    // Get historical engagement data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: historicalData } = await supabase
      .from('post_analytics')
      .select(`
        *,
        posts!inner(workspace_id)
      `)
      .eq('posts.workspace_id', workspace.id)
      .eq('platform', 'youtube')
      .gte('fetched_at', thirtyDaysAgo.toISOString())
      .order('fetched_at', { ascending: true });

    return successResponse({
      channel: {
        id: channelStats.id,
        name: channelStats.snippet?.title,
        description: channelStats.snippet?.description,
        thumbnail: channelStats.snippet?.thumbnails?.high?.url || 
                   channelStats.snippet?.thumbnails?.medium?.url,
        customUrl: channelStats.snippet?.customUrl,
        subscribers: parseInt(channelStats.statistics?.subscriberCount || '0'),
        totalViews: parseInt(channelStats.statistics?.viewCount || '0'),
        videoCount: parseInt(channelStats.statistics?.videoCount || '0'),
      },
      recentPerformance: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        videos: videoStats.filter(v => v !== null).length,
      },
      recentVideos: videoStats.filter(v => v !== null),
      historicalData: historicalData || [],
    });
  } catch (error: any) {
    console.error('[YouTube Analytics] Error:', error);
    throw new APIError(
      500,
      error.message || 'Failed to fetch YouTube analytics',
      'YOUTUBE_API_ERROR'
    );
  }
});
