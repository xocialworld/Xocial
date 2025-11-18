/**
 * YouTube Analytics Integration
 * Handles syncing analytics data from YouTube to our database
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getYouTubeVideoStats } from '@/lib/oauth/youtube';
import { logger } from '@/lib/logger';

export interface YouTubeAnalytics {
  videoId: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  watchTime: number;
  averageViewDuration: number;
  subscribersGained: number;
  subscribersLost: number;
  impressions: number;
  clickThroughRate: number;
}

/**
 * Sync analytics for a single YouTube video
 */
export async function syncYouTubeVideoAnalytics(
  accessToken: string,
  videoId: string,
  postId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Fetch video statistics from YouTube Data API
    const videoStats = await getYouTubeVideoStats(accessToken, videoId);
    
    // Fetch detailed analytics from YouTube Analytics API
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const channelId = await getChannelIdFromVideo(accessToken, videoId);
    
    const analyticsParams = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: [
        'views',
        'likes',
        'dislikes',
        'comments',
        'shares',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'subscribersGained',
        'subscribersLost',
        'impressions',
        'ctr'
      ].join(','),
      dimensions: 'video',
      filters: `video==${videoId}`,
    });
    
    let detailedAnalytics = null;
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
          detailedAnalytics = analyticsData.rows[0];
        }
      }
    } catch (error: any) {
      logger.warn(`Could not fetch detailed YouTube Analytics: ${error.message}`);
    }
    
    // Calculate engagement
    const views = parseInt(videoStats.statistics?.viewCount || '0');
    const likes = parseInt(videoStats.statistics?.likeCount || '0');
    const comments = parseInt(videoStats.statistics?.commentCount || '0');
    
    // Use detailed analytics if available, otherwise use basic stats
    const analyticsData = {
      views,
      likes,
      dislikes: detailedAnalytics ? detailedAnalytics[2] : 0,
      comments,
      shares: detailedAnalytics ? detailedAnalytics[4] : 0,
      saves: 0, // YouTube doesn't provide saves in API
      reach: views, // Use views as reach approximation
      impressions: detailedAnalytics ? detailedAnalytics[9] : views,
      clicks: 0, // Not directly available
      engagement_rate: views > 0 ? ((likes + comments) / views) * 100 : 0,
    };
    
    // Store or update analytics in database
    const supabase = await createClient();
    
    const { error: upsertError } = await supabase
      .from('post_analytics')
      .upsert({
        post_id: postId,
        platform: 'youtube',
        external_post_id: videoId,
        ...analyticsData,
        metrics_history: {
          timestamp: new Date().toISOString(),
          ...analyticsData,
        },
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'post_id,platform',
      });
    
    if (upsertError) {
      throw upsertError;
    }
    
    logger.info(`Synced YouTube analytics for video: ${videoId}`, {
      postId,
      views: analyticsData.views,
      likes: analyticsData.likes,
      comments: analyticsData.comments,
    });
  } catch (error: any) {
    logger.error(`Failed to sync YouTube analytics for video ${videoId}: ${error.message}`, error);
    throw error;
  }
}

/**
 * Sync analytics for all YouTube posts in a workspace
 */
export async function syncWorkspaceYouTubeAnalytics(workspaceId: string): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };
  
  try {
    // Get all published YouTube posts for this workspace
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, external_ids, platforms')
      .eq('workspace_id', workspaceId)
      .eq('status', 'published')
      .contains('platforms', ['youtube']);
    
    if (postsError) {
      throw postsError;
    }
    
    if (!posts || posts.length === 0) {
      logger.info('No YouTube posts found for workspace', { workspaceId });
      return results;
    }
    
    // Get all YouTube accounts for this workspace
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('id, account_id, access_token')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'youtube')
      .eq('is_active', true);
    
    if (accountsError || !accounts || accounts.length === 0) {
      throw new Error('No active YouTube accounts found for workspace');
    }
    
    // Sync analytics for each post
    for (const post of posts) {
      const youtubeVideoId = post.external_ids?.youtube;
      
      if (!youtubeVideoId) {
        logger.warn(`Post ${post.id} has no YouTube video ID`);
        continue;
      }
      
      // Find the account that published this video
      // For now, use the first account (in future, store account_id with external_ids)
      const account = accounts[0];
      
      try {
        const accessToken = decryptToken(account.access_token);
        await syncYouTubeVideoAnalytics(accessToken, youtubeVideoId, post.id, workspaceId);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Post ${post.id}: ${error.message}`);
        logger.error(`Failed to sync analytics for post ${post.id}`, error);
      }
    }
    
    logger.info(`YouTube analytics sync completed for workspace ${workspaceId}`, results);
    return results;
  } catch (error: any) {
    logger.error(`Failed to sync YouTube analytics for workspace ${workspaceId}`, error);
    throw error;
  }
}

/**
 * Helper function to get channel ID from video ID
 */
async function getChannelIdFromVideo(accessToken: string, videoId: string): Promise<string> {
  const params = new URLSearchParams({
    part: 'snippet',
    id: videoId,
  });
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch video info for channel ID');
  }
  
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }
  
  return data.items[0].snippet.channelId;
}

/**
 * Update channel follower count
 */
export async function updateYouTubeChannelStats(
  workspaceId: string,
  accountId: string
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get YouTube account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('account_id, access_token')
      .eq('id', accountId)
      .eq('workspace_id', workspaceId)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();
    
    if (accountError || !account) {
      throw new Error('YouTube account not found');
    }
    
    const accessToken = decryptToken(account.access_token);
    
    // Fetch channel statistics
    const params = new URLSearchParams({
      part: 'statistics',
      id: account.account_id,
    });
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch channel statistics');
    }
    
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const subscriberCount = parseInt(data.items[0].statistics.subscriberCount || '0');
    
    // Update follower count in database
    await supabase
      .from('social_accounts')
      .update({
        follower_count: subscriberCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);
    
    logger.info(`Updated YouTube channel subscriber count for account ${accountId}: ${subscriberCount}`);
  } catch (error: any) {
    logger.error(`Failed to update YouTube channel stats for account ${accountId}`, error);
    throw error;
  }
}

