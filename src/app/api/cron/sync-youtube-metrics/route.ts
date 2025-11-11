import { NextRequest } from 'next/server';
import { withCronVerification } from '@/lib/cron-verification';
import { createClient } from '@/lib/supabase/server';
import { getYouTubeVideoStats } from '@/lib/oauth/youtube';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';

/**
 * GET /api/cron/sync-youtube-metrics
 * Sync YouTube video metrics for all connected accounts
 * Triggered by Vercel Cron
 */
export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();
  console.log('[Cron: Sync YouTube Metrics] Starting...');

  try {
    const supabase = await createClient();

    // Get all active YouTube accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('platform', 'youtube')
      .eq('is_active', true);

    if (accountsError) {
      console.error('[Cron: Sync YouTube Metrics] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[Cron: Sync YouTube Metrics] No YouTube accounts found');
      return Response.json({
        success: true,
        message: 'No YouTube accounts to sync',
        synced: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Sync YouTube Metrics] Found ${accounts.length} YouTube accounts`);

    let totalSynced = 0;
    let totalErrors = 0;

    // Process each account
    for (const account of accounts) {
      const accountStartTime = Date.now();
      console.log(`[Cron: Sync YouTube Metrics] Processing account ${account.id}`);

      try {
        // Check if token needs refresh
        let accessToken = account.access_token;
        
        if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
          console.log(`[Cron: Sync YouTube Metrics] Token expired for account ${account.id}, refreshing...`);
          
          if (!account.refresh_token) {
            console.error(`[Cron: Sync YouTube Metrics] No refresh token for account ${account.id}`);
            totalErrors++;
            continue;
          }

          const config = {
            clientId: process.env.YOUTUBE_CLIENT_ID!,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
            redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
          };

          const tokenResponse = await refreshYouTubeToken(config, account.refresh_token);
          accessToken = tokenResponse.access_token;

          // Update token in database
          await supabase
            .from('social_accounts')
            .update({
              access_token: accessToken,
              token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
            })
            .eq('id', account.id);
        }

        // Get all published videos for this account
        const { data: platformPosts, error: postsError } = await supabase
          .from('platform_posts')
          .select(`
            *,
            posts!inner(workspace_id)
          `)
          .eq('platform', 'youtube')
          .eq('posts.workspace_id', account.workspace_id)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(50); // Sync last 50 videos

        if (postsError) {
          console.error(`[Cron: Sync YouTube Metrics] Error fetching posts for account ${account.id}:`, postsError);
          totalErrors++;
          continue;
        }

        if (!platformPosts || platformPosts.length === 0) {
          console.log(`[Cron: Sync YouTube Metrics] No videos to sync for account ${account.id}`);
          continue;
        }

        console.log(`[Cron: Sync YouTube Metrics] Syncing ${platformPosts.length} videos for account ${account.id}`);

        // Fetch stats for each video
        for (const platformPost of platformPosts) {
          try {
            const stats = await getYouTubeVideoStats(accessToken, platformPost.platform_post_id);

            if (!stats || !stats.statistics) {
              console.log(`[Cron: Sync YouTube Metrics] No stats for video ${platformPost.platform_post_id}`);
              continue;
            }

            const views = parseInt(stats.statistics.viewCount || '0');
            const likes = parseInt(stats.statistics.likeCount || '0');
            const comments = parseInt(stats.statistics.commentCount || '0');
            const engagement = likes + comments;
            const engagementRate = views > 0 ? (engagement / views) * 100 : 0;

            // Insert or update analytics
            const { error: analyticsError } = await supabase
              .from('post_analytics')
              .upsert({
                post_id: platformPost.post_id,
                platform: 'youtube',
                views: views,
                likes: likes,
                comments: comments,
                shares: 0, // YouTube API doesn't provide share count directly
                engagement: engagement,
                engagement_rate: engagementRate,
                reach: views, // Use views as reach approximation
                impressions: views,
                fetched_at: new Date().toISOString(),
              }, {
                onConflict: 'post_id,platform',
              });

            if (analyticsError) {
              console.error(`[Cron: Sync YouTube Metrics] Error upserting analytics for video ${platformPost.platform_post_id}:`, analyticsError);
            } else {
              totalSynced++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error: any) {
            console.error(`[Cron: Sync YouTube Metrics] Error fetching stats for video ${platformPost.platform_post_id}:`, error.message);
            totalErrors++;
          }
        }

        console.log(`[Cron: Sync YouTube Metrics] Completed account ${account.id} in ${Date.now() - accountStartTime}ms`);

      } catch (error: any) {
        console.error(`[Cron: Sync YouTube Metrics] Error processing account ${account.id}:`, error.message);
        totalErrors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron: Sync YouTube Metrics] Completed in ${duration}ms. Synced: ${totalSynced}, Errors: ${totalErrors}`);

    return Response.json({
      success: true,
      message: 'YouTube metrics sync completed',
      accounts: accounts.length,
      synced: totalSynced,
      errors: totalErrors,
      duration,
    });

  } catch (error: any) {
    console.error('[Cron: Sync YouTube Metrics] Fatal error:', error);
    return Response.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
});

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

