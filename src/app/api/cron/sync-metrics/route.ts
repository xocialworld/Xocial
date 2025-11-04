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

    // Get published posts from last 7 days that need metric updates
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        workspace:workspaces!inner(id),
        social_account:social_accounts(*)
      `)
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo.toISOString())
      .not('external_post_id', 'is', null)
      .limit(100); // Process max 100 posts per run

    if (fetchError) {
      console.error('[Cron: Sync Metrics] Error fetching posts:', fetchError);
      return cronErrorResponse('Failed to fetch posts', fetchError);
    }

    if (!posts || posts.length === 0) {
      console.log('[Cron: Sync Metrics] No posts to sync');
      return cronSuccessResponse({
        message: 'No posts to sync',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Sync Metrics] Found ${posts.length} posts to sync`);

    const results = [];

    // Process each post
    for (const post of posts) {
      const postStartTime = Date.now();
      
      try {
        console.log(`[Cron: Sync Metrics] Processing post ${post.id}`);

        // Parse external post IDs
        let externalIds: Record<string, string> = {};
        try {
          externalIds = typeof post.external_post_id === 'string' 
            ? JSON.parse(post.external_post_id)
            : post.external_post_id || {};
        } catch (e) {
          console.warn(`[Cron: Sync Metrics] Could not parse external_post_id for post ${post.id}`);
          continue;
        }

        // Fetch metrics for each platform
        for (const platform of post.platforms) {
          const externalPostId = externalIds[platform];
          
          if (!externalPostId) {
            console.log(`[Cron: Sync Metrics] No external ID for ${platform} on post ${post.id}`);
            continue;
          }

          try {
            const metrics = await fetchPlatformMetrics(
              platform,
              externalPostId,
              post.workspace.id,
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
                .eq('post_id', post.id)
                .eq('platform', platform)
                .single();

              if (existingAnalytics) {
                // Update existing record
                await supabase
                  .from('post_analytics')
                  .update({
                    ...metrics,
                    engagement_rate: parseFloat(engagementRate.toFixed(2)),
                    fetched_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingAnalytics.id);
              } else {
                // Create new record
                await supabase
                  .from('post_analytics')
                  .insert({
                    post_id: post.id,
                    platform,
                    external_post_id: externalPostId,
                    ...metrics,
                    engagement_rate: parseFloat(engagementRate.toFixed(2)),
                  });
              }

              console.log(`[Cron: Sync Metrics] Synced ${platform} metrics for post ${post.id}`);
            }
          } catch (error: any) {
            console.error(`[Cron: Sync Metrics] Error syncing ${platform} for post ${post.id}:`, error);
            // Continue with other platforms
          }
        }

        results.push({
          postId: post.id,
          success: true,
          platforms: post.platforms,
          duration: Date.now() - postStartTime,
        });
      } catch (error: any) {
        console.error(`[Cron: Sync Metrics] Error processing post ${post.id}:`, error);
        results.push({
          postId: post.id,
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
    const client = await createTwitterClient(accessToken);
    const metrics = await (client as any).getTweetMetrics?.(postId) || {};
    
    return {
      impressions: metrics.impressions || 0,
      reach: metrics.impressions || 0,
      engagement: metrics.engagement || 0,
      likes: metrics.likes || 0,
      comments: metrics.replies || 0,
      shares: metrics.retweets || 0,
      saves: metrics.bookmarks || 0,
      clicks: metrics.url_clicks || 0,
      video_views: metrics.video_views || 0,
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

async function fetchYouTubeMetrics(postId: string, accessToken: string) {
  try {
    const client = await createYouTubeClient(accessToken);
    const stats = await (client as any).getVideoStatistics?.(postId) || {};
    
    return {
      impressions: 0,
      reach: 0,
      engagement: stats.likes + stats.comments,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      video_views: stats.views || 0,
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

