import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { getYouTubeVideoStats } from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { persistPlatformMetrics } from '@/lib/intelligence/analytics-sync';

/**
 * GET /api/cron/sync-youtube-analytics
 * Cron job to sync YouTube video analytics
 * Should run every 4 hours
 */
export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    logger.info('[Cron: Sync YouTube Analytics] Starting analytics sync job');

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

    // Get all active YouTube accounts
    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('id, workspace_id, account_id, account_name, access_token, is_active')
      .eq('platform', 'youtube')
      .eq('is_active', true);

    if (fetchError) {
      logger.error('[Cron: Sync YouTube Analytics] Error fetching accounts', fetchError);
      return cronErrorResponse('Failed to fetch YouTube accounts', fetchError);
    }

    if (!accounts || accounts.length === 0) {
      logger.info('[Cron: Sync YouTube Analytics] No active YouTube accounts found');
      return cronSuccessResponse({
        message: 'No YouTube accounts to sync',
        synced: 0,
        duration: Date.now() - startTime,
      });
    }

    logger.info(`[Cron: Sync YouTube Analytics] Found ${accounts.length} YouTube accounts`);

    let totalVideosSynced = 0;
    let totalErrors = 0;

    // Sync analytics for each account
    for (const account of accounts) {
      try {
        logger.info(`[Cron: Sync YouTube Analytics] Syncing account: ${account.account_name}`);

        // Decrypt access token
        const accessToken = decryptToken(account.access_token);

        // Get recent posts for this account
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('id, external_post_id, content, published_at')
          .eq('social_account_id', account.id)
          .eq('status', 'published')
          .not('external_post_id', 'is', null)
          .order('published_at', { ascending: false })
          .limit(50); // Sync last 50 videos

        if (postsError || !posts || posts.length === 0) {
          logger.warn(`[Cron: Sync YouTube Analytics] No posts found for account: ${account.account_name}`);
          continue;
        }

        logger.info(`[Cron: Sync YouTube Analytics] Found ${posts.length} videos to sync for ${account.account_name}`);

        // Fetch analytics for each video
        for (const post of posts) {
          try {
            const videoStats = await getYouTubeVideoStats(accessToken, post.external_post_id);

            if (!videoStats) continue;

            const stats = videoStats.statistics as Record<string, string | undefined> | undefined;
            const favoriteCount = stats?.favoriteCount ?? '0';

            const syncResult = await persistPlatformMetrics(supabase, {
              workspaceId: account.workspace_id,
              postId: post.id,
              platformPostId: post.external_post_id,
              socialAccountId: account.id,
              platform: 'youtube',
              publishedAt: post.published_at,
              metrics: {
                ...videoStats.statistics,
                views: parseInt(videoStats.statistics?.viewCount || '0'),
                likes: parseInt(videoStats.statistics?.likeCount || '0'),
                comments: parseInt(videoStats.statistics?.commentCount || '0'),
                saves: parseInt(favoriteCount || '0'),
              },
              raw: videoStats.statistics || {},
              syncSource: 'youtube_cron_analytics',
            });

            if (syncResult.status === 'synced') totalVideosSynced++;
            else totalErrors++;

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error: any) {
            logger.error(`[Cron: Sync YouTube Analytics] Error syncing video ${post.external_post_id}`, error);
            totalErrors++;
          }
        }
      } catch (error: any) {
        logger.error(`[Cron: Sync YouTube Analytics] Error syncing account ${account.account_name}`, error);
        totalErrors++;
      }
    }

    const totalDuration = Date.now() - startTime;

    logger.info(`[Cron: Sync YouTube Analytics] Completed: ${totalVideosSynced} videos synced, ${totalErrors} errors in ${totalDuration}ms`);

    return cronSuccessResponse({
      message: 'YouTube analytics sync completed',
      accountsSynced: accounts.length,
      videosSynced: totalVideosSynced,
      errors: totalErrors,
      duration: totalDuration,
    });
  } catch (error: any) {
    logger.error('[Cron: Sync YouTube Analytics] Fatal error', error);
    return cronErrorResponse('Fatal error during YouTube analytics sync', {
      error: error.message,
      stack: error.stack,
    });
  }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large sync operations
