import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { getTwitterTweetMetrics } from '@/lib/platforms/twitter';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/sync-twitter-analytics
 * Cron job to sync Twitter tweet analytics
 * Should run every 4 hours
 */
export const GET = withCronVerification(async (request: NextRequest) => {
    const startTime = Date.now();

    try {
        logger.info('[Cron: Sync Twitter Analytics] Starting analytics sync job');

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

        // Get all active Twitter accounts
        const { data: accounts, error: fetchError } = await supabase
            .from('social_accounts')
            .select('id, account_id, account_name, access_token, is_active')
            .eq('platform', 'twitter')
            .eq('is_active', true);

        if (fetchError) {
            logger.error('[Cron: Sync Twitter Analytics] Error fetching accounts', fetchError);
            return cronErrorResponse('Failed to fetch Twitter accounts', fetchError);
        }

        if (!accounts || accounts.length === 0) {
            logger.info('[Cron: Sync Twitter Analytics] No active Twitter accounts found');
            return cronSuccessResponse({
                message: 'No Twitter accounts to sync',
                synced: 0,
                duration: Date.now() - startTime,
            });
        }

        logger.info(`[Cron: Sync Twitter Analytics] Found ${accounts.length} Twitter accounts`);

        let totalTweetsSynced = 0;
        let totalErrors = 0;

        for (const account of accounts) {
            try {
                logger.info(`[Cron: Sync Twitter Analytics] Syncing account: ${account.account_name}`);

                const accessToken = decryptToken(account.access_token);

                // Get recent posts
                const { data: posts, error: postsError } = await supabase
                    .from('posts')
                    .select('id, external_post_id, content, published_at')
                    .eq('social_account_id', account.id)
                    .eq('status', 'published')
                    .not('external_post_id', 'is', null)
                    .order('published_at', { ascending: false })
                    .limit(50);

                if (postsError || !posts || posts.length === 0) {
                    logger.warn(`[Cron: Sync Twitter Analytics] No posts found for account: ${account.account_name}`);
                    continue;
                }

                logger.info(`[Cron: Sync Twitter Analytics] Found ${posts.length} tweets to sync for ${account.account_name}`);

                for (const post of posts) {
                    try {
                        const tweetMetrics = await getTwitterTweetMetrics(accessToken, post.external_post_id);

                        if (!tweetMetrics || !tweetMetrics.data) continue;

                        const metrics = tweetMetrics.data.public_metrics;

                        // Upsert analytics data
                        const { error: upsertError } = await supabase
                            .from('post_analytics')
                            .upsert({
                                post_id: post.id,
                                platform: 'twitter',
                                likes: metrics.like_count || 0,
                                comments: metrics.reply_count || 0,
                                shares: metrics.retweet_count || 0, // Retweets as shares
                                views: metrics.impression_count || 0,
                                engagement_rate: metrics.impression_count > 0
                                    ? ((metrics.like_count + metrics.reply_count + metrics.retweet_count) / metrics.impression_count) * 100
                                    : 0,
                                reach: metrics.impression_count || 0,
                                impressions: metrics.impression_count || 0,
                                saves: metrics.quote_count || 0, // Using quotes as saves/others for now, or just 0
                                followers_gain: 0,
                                clicks: 0,
                                synced_at: new Date().toISOString(),
                                metadata: {
                                    like_count: metrics.like_count,
                                    reply_count: metrics.reply_count,
                                    retweet_count: metrics.retweet_count,
                                    quote_count: metrics.quote_count,
                                    impression_count: metrics.impression_count,
                                },
                            }, {
                                onConflict: 'post_id,platform',
                            });

                        if (upsertError) {
                            logger.error(`[Cron: Sync Twitter Analytics] Failed to upsert analytics for tweet ${post.external_post_id}`, upsertError);
                            totalErrors++;
                        } else {
                            totalTweetsSynced++;
                        }

                        // Rate limit protection
                        await new Promise((resolve) => setTimeout(resolve, 100));
                    } catch (error: any) {
                        logger.error(`[Cron: Sync Twitter Analytics] Error syncing tweet ${post.external_post_id}`, error);
                        totalErrors++;
                    }
                }
            } catch (error: any) {
                logger.error(`[Cron: Sync Twitter Analytics] Error syncing account ${account.account_name}`, error);
                totalErrors++;
            }
        }

        const totalDuration = Date.now() - startTime;

        return cronSuccessResponse({
            message: 'Twitter analytics sync completed',
            accountsSynced: accounts.length,
            tweetsSynced: totalTweetsSynced,
            errors: totalErrors,
            duration: totalDuration,
        });
    } catch (error: any) {
        logger.error('[Cron: Sync Twitter Analytics] Fatal error', error);
        return cronErrorResponse('Fatal error during Twitter analytics sync', {
            error: error.message,
            stack: error.stack,
        });
    }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
