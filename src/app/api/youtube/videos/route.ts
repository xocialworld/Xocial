import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getYouTubeChannelVideos } from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * GET /api/youtube/videos
 * Fetch videos for a YouTube channel
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 * - maxResults?: number (default: 25, max: 50)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
  });
  
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const maxResults = parseInt(searchParams.get('maxResults') || '25', 10);
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
  if (maxResults > 50) {
    throw new APIError(400, 'maxResults cannot exceed 50', 'INVALID_MAX_RESULTS');
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
    // Fetch channel videos
    const videos = await getYouTubeChannelVideos(accessToken, account.account_id, maxResults);
    
    // Fetch statistics for each video
    if (videos && videos.length > 0) {
      const videoIds = videos.map((v: any) => v.id.videoId).join(',');
      const statsParams = new URLSearchParams({
        part: 'statistics,snippet',
        id: videoIds,
      });
      
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${statsParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        // Merge statistics with video data
        const enrichedVideos = videos.map((video: any) => {
          const stats = statsData.items.find((item: any) => item.id === video.id.videoId);
          return {
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
            thumbnails: video.snippet.thumbnails,
            statistics: stats?.statistics ? {
              views: parseInt(stats.statistics.viewCount || '0'),
              likes: parseInt(stats.statistics.likeCount || '0'),
              comments: parseInt(stats.statistics.commentCount || '0'),
            } : null,
          };
        });
        
        logger.info(`Fetched ${enrichedVideos.length} videos for channel: ${account.account_name}`, {
          userId: user.id,
          accountId,
        });
        
        return NextResponse.json({
          success: true,
          data: enrichedVideos,
          count: enrichedVideos.length,
        });
      }
    }
    
    // Return basic video data if stats fetch fails
    const basicVideos = videos.map((video: any) => ({
      id: video.id.videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails,
      statistics: null,
    }));
    
    return NextResponse.json({
      success: true,
      data: basicVideos,
      count: basicVideos.length,
    });
  } catch (error: any) {
    logger.error(`Failed to fetch YouTube videos: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });
    
    throw new APIError(500, `Failed to fetch YouTube videos: ${error.message}`, 'FETCH_FAILED');
  }
});

export const runtime = 'nodejs';
