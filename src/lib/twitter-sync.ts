import { createClient } from '@/lib/supabase/server';
import { decryptToken, encryptToken } from '@/lib/encryption';
import {
    getTwitterUserTweets,
    getTwitterTweetMetrics,
    getTwitterUserProfile,
} from '@/lib/platforms/twitter';
import { refreshTwitterToken, type TwitterOAuthConfig } from '@/lib/platforms/twitter';
import { logger } from '@/lib/logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';

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

        let accessToken = decryptToken(account.access_token);
        const userId = account.account_id;

        // Refresh token if expired/expiring (common source of 401s during sync)
        const expiresAtMs = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
        const hasRefresh = !!account.refresh_token;
        if (hasRefresh && expiresAtMs > 0 && Date.now() >= (expiresAtMs - 5 * 60 * 1000)) {
            try {
                const refreshToken = decryptToken(account.refresh_token);
                const config: TwitterOAuthConfig = {
                    clientId: process.env.TWITTER_CLIENT_ID!,
                    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
                    redirectUri: '', // not needed for refresh
                };
                const tokenResponse = await refreshTwitterToken(config, refreshToken);

                accessToken = tokenResponse.access_token;
                await supabase
                    .from('social_accounts')
                    .update({
                        access_token: encryptToken(tokenResponse.access_token),
                        refresh_token: tokenResponse.refresh_token
                            ? encryptToken(tokenResponse.refresh_token)
                            : account.refresh_token, // keep old if not rotated
                        token_expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', accountId);

                result.details?.push('[Twitter] Access token refreshed');
            } catch (e: any) {
                result.details?.push(`[Twitter] Token refresh failed, will try existing token: ${e?.message || String(e)}`);
            }
        }

        let tweets: any[] = [];
        try {
            tweets = await getTwitterUserTweets(accessToken, userId, options.maxTweets);
        } catch (e: any) {
            // If we got a 401 and have a refresh token, try refreshing once and retry.
            const message = e?.message || String(e);
            const looksUnauthorized = message.includes('401') || message.toLowerCase().includes('unauthorized');
            if (looksUnauthorized && hasRefresh) {
                try {
                    const refreshToken = decryptToken(account.refresh_token);
                    const config: TwitterOAuthConfig = {
                        clientId: process.env.TWITTER_CLIENT_ID!,
                        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
                        redirectUri: '',
                    };
                    const tokenResponse = await refreshTwitterToken(config, refreshToken);
                    accessToken = tokenResponse.access_token;
                    await supabase
                        .from('social_accounts')
                        .update({
                            access_token: encryptToken(tokenResponse.access_token),
                            refresh_token: tokenResponse.refresh_token
                                ? encryptToken(tokenResponse.refresh_token)
                                : account.refresh_token,
                            token_expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', accountId);

                    result.details?.push('[Twitter] Refreshed token after 401, retrying tweets fetch');
                    tweets = await getTwitterUserTweets(accessToken, userId, options.maxTweets);
                } catch (retryErr: any) {
                    throw retryErr;
                }
            } else {
                throw e;
            }
        }
        result.details?.push(`[Twitter] Fetched ${tweets.length} tweets from API`);

        if (tweets.length === 0) {
            result.details?.push(
                '[Twitter] API returned 0 tweets. This can happen if the account has no original tweets, is protected, or the token lacks tweet.read permissions.'
            );
        }

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

                const { id: postId } = await upsertPostByExternalId(supabase as any, {
                    workspace_id: postData.workspace_id,
                    social_account_id: postData.social_account_id,
                    external_post_id: postData.external_post_id,
                    platforms: postData.platforms,
                    content: postData.content,
                    status: postData.status,
                    published_at: postData.published_at,
                });

                // Store metrics
                try {
                    if (postId && tweet.public_metrics) {
                        const analyticsData = {
                            post_id: postId,
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
