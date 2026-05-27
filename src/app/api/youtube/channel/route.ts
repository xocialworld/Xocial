import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getYouTubeChannelStats, getYouTubeChannelVideos } from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/youtube/channel
 * Fetch YouTube channel information and recent videos
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 * - includeVideos?: boolean (default: true)
 * - maxResults?: number (default: 25, max: 50)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
  });

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const includeVideos = searchParams.get('includeVideos') !== 'false';
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
    // Fetch channel statistics
    const channelStats = await getYouTubeChannelStats(accessToken, account.account_id);
    
    let videos = null;
    if (includeVideos) {
      // Fetch recent videos
      videos = await getYouTubeChannelVideos(accessToken, account.account_id, maxResults);
      
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
          videos = videos.map((video: any) => {
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
        }
      }
    }
    
    // Fetch channel analytics summary
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const analyticsParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
    });
    
    let analyticsSummary = null;
    try {
      const analyticsResponse = await fetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?${analyticsParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        
        if (analyticsData.rows && analyticsData.rows.length > 0) {
          const totals = analyticsData.rows.reduce((acc: any, row: any[]) => {
            acc.views += row[0];
            acc.estimatedMinutesWatched += row[1];
            acc.subscribersGained += row[2];
            acc.subscribersLost += row[3];
            return acc;
          }, { views: 0, estimatedMinutesWatched: 0, subscribersGained: 0, subscribersLost: 0 });
          
          analyticsSummary = {
            views: totals.views,
            watchTime: totals.estimatedMinutesWatched,
            subscribersGained: totals.subscribersGained,
            subscribersLost: totals.subscribersLost,
            netSubscribers: totals.subscribersGained - totals.subscribersLost,
            period: `${startDate} to ${endDate}`,
          };
        }
      }
    } catch (error: any) {
      logger.warn(`Failed to fetch analytics summary: ${error.message}`);
    }
    
    logger.info(`Fetched YouTube channel info for: ${account.account_name}`, {
      userId: user.id,
      accountId,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        channel: {
          id: channelStats.id,
          title: channelStats.snippet.title,
          description: channelStats.snippet.description,
          customUrl: channelStats.snippet.customUrl,
          thumbnails: channelStats.snippet.thumbnails,
          statistics: {
            subscriberCount: parseInt(channelStats.statistics?.subscriberCount || '0'),
            videoCount: parseInt(channelStats.statistics?.videoCount || '0'),
            viewCount: parseInt(channelStats.statistics?.viewCount || '0'),
          },
        },
        analyticsSummary,
        videos,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to fetch YouTube channel info: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });
    
    throw new APIError(500, `Failed to fetch YouTube channel info: ${error.message}`, 'FETCH_FAILED');
  }
});

export const runtime = 'nodejs';
