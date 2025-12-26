/**
 * Cron Job: Sync Engagement Metrics
 * Runs every 15 minutes to sync post engagement metrics from social platforms
 * 
 * Triggered by: Vercel Cron
 * Schedule: every 15 minutes
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { createFacebookClient } from '@/lib/platforms/facebook';
import { createInstagramClient } from '@/lib/platforms/instagram';
import { createTwitterClient } from '@/lib/platforms/twitter';
import { createLinkedInClient } from '@/lib/platforms/linkedin';
import { createYouTubeClient } from '@/lib/platforms/youtube';
import { createTikTokClient } from '@/lib/platforms/tiktok';

/**
 * GET /api/cron/sync-metrics
 * Syncs engagement metrics for recently published posts
 */
export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    console.log('[Cron: Sync Metrics] Starting metrics sync job');

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get recently published platform posts from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: platformPostsData, error: fetchError } = await supabase
      .from('platform_posts')
      .select('post_id, platform, platform_post_id, published_at, posts:posts!inner(workspace_id)')
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo.toISOString())
      .limit(200);

    if (fetchError) {
      console.error('[Cron: Sync Metrics] Error fetching posts:', fetchError);
      return cronErrorResponse('Failed to fetch posts', fetchError);
    }

    if (!platformPostsData || platformPostsData.length === 0) {
      console.log('[Cron: Sync Metrics] No posts to sync');
      return cronSuccessResponse({
        message: 'No posts to sync',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    type PlatformPostRow = {
      post_id: string;
      platform: string;
      platform_post_id: string;
      published_at: string;
      posts: { workspace_id: string };
    };

    const platformPosts: PlatformPostRow[] = platformPostsData.map((row: any) => ({
      post_id: row.post_id,
      platform: row.platform,
      platform_post_id: row.platform_post_id,
      published_at: row.published_at,
      posts: Array.isArray(row.posts) ? row.posts[0] : row.posts,
    }));

    console.log(`[Cron: Sync Metrics] Found ${platformPosts.length} platform-posts to sync`);

    const results = [];

    // Process each platform-post
    for (const pp of platformPosts) {
      const postStartTime = Date.now();

      try {
        console.log(`[Cron: Sync Metrics] Processing post ${pp.post_id} (${pp.platform})`);

        try {
          const metrics = await fetchPlatformMetrics(
            pp.platform,
            pp.platform_post_id,
            pp.posts.workspace_id,
            supabase
          );

          if (metrics) {
            // Calculate engagement rate
            const engagementRate = metrics.reach > 0
              ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.reach) * 100
              : 0;

            // Check if analytics record exists
            const { data: existingAnalytics } = await supabase
              .from('post_analytics')
              .select('id')
              .eq('post_id', pp.post_id)
              .eq('platform', pp.platform)
              .single();

            if (existingAnalytics) {
              // Update existing record
              await supabase
                .from('post_analytics')
                .update({
                  ...metrics,
                  engagement_rate: parseFloat(engagementRate.toFixed(2)),
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingAnalytics.id);
            } else {
              // Create new record
              await supabase
                .from('post_analytics')
                .insert({
                  post_id: pp.post_id,
                  platform: pp.platform,
                  external_post_id: pp.platform_post_id,
                  ...metrics,
                  engagement_rate: parseFloat(engagementRate.toFixed(2)),
                  last_synced_at: new Date().toISOString(),
                });
            }

            console.log(`[Cron: Sync Metrics] Synced ${pp.platform} metrics for post ${pp.post_id}`);
          }
        } catch (error: any) {
          console.error(`[Cron: Sync Metrics] Error syncing ${pp.platform} for post ${pp.post_id}:`, error);
          // Continue to next record
        }

        results.push({
          postId: pp.post_id,
          success: true,
          duration: Date.now() - postStartTime,
        });
      } catch (error: any) {
        console.error(`[Cron: Sync Metrics] Error processing post ${pp.post_id}:`, error);
        results.push({
          postId: pp.post_id,
          success: false,
          error: error.message,
          duration: Date.now() - postStartTime,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalDuration = Date.now() - startTime;

    console.log(`[Cron: Sync Metrics] Completed: ${successCount} succeeded, ${failureCount} failed in ${totalDuration}ms`);

    // Optimization: Refresh the analytics materialized view
    try {
      const { error: refreshError } = await supabase.rpc('refresh_daily_metrics');
      if (refreshError) {
        console.error('[Cron: Sync Metrics] Failed to refresh materialized view:', refreshError);
      } else {
        console.log('[Cron: Sync Metrics] Successfully refreshed daily_metrics_summary');
      }
    } catch (e) {
      console.error('[Cron: Sync Metrics] Exception refreshing view:', e);
    }

    return cronSuccessResponse({
      message: 'Metrics sync job completed',
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      duration: totalDuration,
      results,
    });
  } catch (error: any) {
    console.error('[Cron: Sync Metrics] Fatal error:', error);
    return cronErrorResponse('Fatal error during metrics sync', {
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * Fetch metrics from a specific platform
 */
async function fetchPlatformMetrics(
  platform: string,
  externalPostId: string,
  workspaceId: string,
  supabase: any
): Promise<any | null> {
  try {
    // Get access token for the platform
    const { data: account } = await supabase
      .from('social_accounts')
      .select('access_token, platform_user_id')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (!account) {
      console.warn(`[Metrics] No active account for ${platform} in workspace ${workspaceId}`);
      return null;
    }

    switch (platform) {
      case 'facebook':
        return await fetchFacebookMetrics(externalPostId, account.access_token);

      case 'instagram':
        return await fetchInstagramMetrics(externalPostId, account.access_token);

      case 'twitter':
        return await fetchTwitterMetrics(externalPostId, account.access_token);

      case 'linkedin':
        return await fetchLinkedInMetrics(externalPostId, account.access_token);

      case 'youtube':
        return await fetchYouTubeMetrics(externalPostId, account.access_token);

      case 'tiktok':
        return await fetchTikTokMetrics(externalPostId, account.access_token);

      default:
        console.warn(`[Metrics] Unsupported platform: ${platform}`);
        return null;
    }
  } catch (error) {
    console.error(`[Metrics] Error fetching ${platform} metrics:`, error);
    return null;
  }
}

/**
 * Platform-specific metric fetchers
 * These are placeholder implementations - actual implementations would use platform clients
 */

async function fetchFacebookMetrics(postId: string, accessToken: string) {
  try {
    // Create a temporary FacebookClient instance
    const { FacebookClient } = await import('@/lib/platforms/facebook');
    const client = new FacebookClient({ accessToken, pageId: 'temp' });

    // Get basic metrics (likes, comments, shares, reactions)
    const basicMetrics = await client.getPostMetrics(postId);

    // Get insights (views, impressions, engagement, clicks)
    const insights = await client.getPostInsights(postId);

    return {
      impressions: insights.impressions || 0,
      views: insights.views || 0,  // NEW: v24.0 metric
      reach: insights.views || 0,  // Use unique impressions as reach
      engagement: insights.engagement || 0,
      likes: basicMetrics.likes || 0,
      comments: basicMetrics.comments || 0,
      shares: basicMetrics.shares || 0,
      saves: 0,
      clicks: insights.clicks || 0,
      video_views: 0,
    };
  } catch (error) {
    console.error('[Metrics] Facebook fetch error:', error);
    return null;
  }
}

async function fetchInstagramMetrics(postId: string, accessToken: string) {
  try {
    const client = await createInstagramClient(accessToken);
    const insights = await (client as any).getPostInsights?.(postId) || {};

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      engagement: insights.engagement || 0,
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      shares: 0,
      saves: insights.saves || 0,
      clicks: 0,
      video_views: insights.video_views || 0,
    };
  } catch (error) {
    console.error('[Metrics] Instagram fetch error:', error);
    return null;
  }
}

async function fetchTwitterMetrics(postId: string, accessToken: string) {
  try {
    const { TwitterClient } = await import('@/lib/platforms/twitter');
    const client = new TwitterClient(accessToken);

    const tweet = await client.getTweet(postId);
    const metrics = tweet.public_metrics || {};
    const nonPublic = tweet.non_public_metrics || {};

    return {
      impressions: (metrics.impression_count || 0) + (nonPublic.impression_count || 0),
      reach: (metrics.impression_count || 0) + (nonPublic.impression_count || 0), // Approx
      engagement: (metrics.like_count + metrics.reply_count + metrics.retweet_count + metrics.quote_count) || 0,
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: metrics.retweet_count || 0,
      saves: metrics.bookmark_count || 0,
      clicks: nonPublic.url_link_clicks || 0,
      video_views: 0, // Not easily available in standard v2 tweet lookup
    };
  } catch (error) {
    console.error('[Metrics] Twitter fetch error:', error);
    return null;
  }
}

async function fetchLinkedInMetrics(postId: string, accessToken: string) {
  try {
    const client = await createLinkedInClient(accessToken);
    const stats = await (client as any).getPostStatistics?.(postId) || {};

    return {
      impressions: stats.impressions || 0,
      reach: stats.reach || 0,
      engagement: stats.engagement || 0,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
      shares: stats.shares || 0,
      saves: 0,
      clicks: stats.clicks || 0,
      video_views: 0,
    };
  } catch (error) {
    console.error('[Metrics] LinkedIn fetch error:', error);
    return null;
  }
}

async function fetchYouTubeMetrics(videoId: string, accessToken: string) {
  try {
    // Fetch video statistics from YouTube Data API
    const params = new URLSearchParams({
      part: 'statistics,snippet',
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
      throw new Error('Failed to fetch YouTube video statistics');
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    const stats = video.statistics;

    const views = parseInt(stats.viewCount || '0');
    const likes = parseInt(stats.likeCount || '0');
    const comments = parseInt(stats.commentCount || '0');

    // Try to fetch detailed analytics if possible
    let detailedMetrics = {
      impressions: views,
      reach: views,
    };

    try {
      // Get channel ID
      const channelId = video.snippet.channelId;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const analyticsParams = new URLSearchParams({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: 'views,likes,comments,shares,estimatedMinutesWatched,impressions',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

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
          const row = analyticsData.rows[0];
          detailedMetrics = {
            impressions: row[5] || views, // impressions
            reach: row[0] || views, // views
          };
        }
      }
    } catch (analyticsError) {
      console.warn('[Metrics] Could not fetch detailed YouTube analytics:', analyticsError);
    }

    return {
      impressions: detailedMetrics.impressions,
      reach: detailedMetrics.reach,
      engagement: likes + comments,
      likes,
      comments,
      shares: 0, // YouTube API doesn't provide shares count directly
      saves: 0,
      clicks: 0,
      video_views: views,
    };
  } catch (error) {
    console.error('[Metrics] YouTube fetch error:', error);
    return null;
  }
}

async function fetchTikTokMetrics(postId: string, accessToken: string) {
  try {
    const client = await createTikTokClient(accessToken);
    const stats = await (client as any).getVideoStats?.(postId) || {};

    return {
      impressions: 0,
      reach: 0,
      engagement: stats.likes + stats.comments + stats.shares,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
      shares: stats.shares || 0,
      saves: 0,
      clicks: 0,
      video_views: stats.views || 0,
    };
  } catch (error) {
    console.error('[Metrics] TikTok fetch error:', error);
    return null;
  }
}

// Prevent caching of cron responses
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
