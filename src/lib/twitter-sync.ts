import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getTwitterUserTweets,
    getTwitterTweetMetrics,
    getTwitterUserProfile,
} from '@/lib/platforms/twitter';
import { logger } from '@/lib/logger';

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

export async function syncTwitterTweets(
    accountId: string,
    options = { maxTweets: 50 }
): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0, details: [] };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'twitter')
            .single();

        if (!account) throw new Error('Twitter account not found');

        const accessToken = decryptToken(account.access_token);
        const userId = account.account_id;

        const tweets = await getTwitterUserTweets(accessToken, userId, options.maxTweets);

        for (const tweet of tweets) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['twitter'],
                    external_post_id: tweet.id,
                    content: {
                        text: tweet.text || '',
                        entities: tweet.entities,
                        attachments: tweet.attachments,
                    },
                    status: 'published' as const,
                    published_at: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
                };

                await supabase.from('posts').upsert(postData, {
                    onConflict: 'workspace_id,external_post_id',
                });

                // Store metrics
                try {
                    const { data: dbPost } = await supabase
                        .from('posts')
                        .select('id')
                        .eq('external_post_id', tweet.id)
                        .single();

                    if (dbPost && tweet.public_metrics) {
                        const analyticsData = {
                            post_id: dbPost.id,
                            platform: 'twitter',
                            impressions: tweet.public_metrics.impression_count || 0,
                            likes: tweet.public_metrics.like_count || 0,
                            retweets: tweet.public_metrics.retweet_count || 0,
                            replies: tweet.public_metrics.reply_count || 0,
                            quote_count: tweet.public_metrics.quote_count || 0,
                            fetched_at: new Date().toISOString(),
                        };

                        await supabase.from('post_analytics').upsert(analyticsData, {
                            onConflict: 'post_id,platform',
                        });
                    }
                } catch (metricsError: any) {
                    logger.warn(`Failed to store metrics for tweet ${tweet.id}`, { error: metricsError });
                }

                result.synced++;
            } catch (error: any) {
                result.errors++;
                result.details?.push(`Failed to sync tweet ${tweet.id}: ${error.message}`);
                logger.error(`Failed to sync Twitter tweet ${tweet.id}`, error, {} as any);
            }
        }

        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return result;
    } catch (error: any) {
        logger.error('[Twitter Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncTwitterAnalytics(accountId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'twitter')
            .single();

        if (!account) throw new Error('Twitter account not found');

        const accessToken = decryptToken(account.access_token);

        const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('social_account_id', accountId)
            .eq('status', 'published')
            .not('external_post_id', 'is', null);

        for (const post of posts || []) {
            try {
                const metrics = await getTwitterTweetMetrics(accessToken, post.external_post_id);

                if (metrics && metrics.public_metrics) {
                    const analyticsData = {
                        post_id: post.id,
                        platform: 'twitter',
                        impressions: metrics.public_metrics.impression_count || 0,
                        likes: metrics.public_metrics.like_count || 0,
                        retweets: metrics.public_metrics.retweet_count || 0,
                        replies: metrics.public_metrics.reply_count || 0,
                        quote_count: metrics.public_metrics.quote_count || 0,
                        fetched_at: new Date().toISOString(),
                    };

                    await supabase.from('post_analytics').upsert(analyticsData, {
                        onConflict: 'post_id,platform',
                    });

                    result.synced++;
                }
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync analytics for tweet ${post.id}`, error, {} as any);
            }
        }

        return result;
    } catch (error: any) {
        logger.error('[Twitter Analytics Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncTwitterProfile(accountId: string): Promise<any> {
    const supabase = await createClient();

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'twitter')
            .single();

        if (!account) throw new Error('Twitter account not found');

        const accessToken = decryptToken(account.access_token);
        const userId = account.account_id;

        const profile = await getTwitterUserProfile(accessToken, userId);

        const updates: any = {
            last_synced_at: new Date().toISOString(),
        };

        if (profile.public_metrics) {
            updates.follower_count = profile.public_metrics.followers_count || account.follower_count;
            updates.metadata = {
                followers_count: profile.public_metrics.followers_count,
                following_count: profile.public_metrics.following_count,
                tweet_count: profile.public_metrics.tweet_count,
                listed_count: profile.public_metrics.listed_count,
            };
        }

        await supabase
            .from('social_accounts')
            .update(updates)
            .eq('id', accountId);

        return { profile: updates.metadata };
    } catch (error: any) {
        logger.error('[Twitter Profile Sync] Fatal error:', error);
        throw error;
    }
}

export async function performFullTwitterSync(accountId: string): Promise<any> {
    logger.info(`[Twitter Full Sync] Starting for account ${accountId}`);

    try {
        const [profileStats, tweetsResult] = await Promise.all([
            syncTwitterProfile(accountId),
            syncTwitterTweets(accountId),
        ]);

        const analyticsResult = await syncTwitterAnalytics(accountId);

        logger.info(`[Twitter Full Sync] Completed for account ${accountId}`);

        return {
            profileStats,
            tweets: tweetsResult,
            analytics: analyticsResult,
        };
    } catch (error: any) {
        logger.error('[Twitter Full Sync] Fatal error:', error);
        throw error;
    }
}
