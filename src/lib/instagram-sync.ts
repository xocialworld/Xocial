import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getInstagramMedia,
    getInstagramMediaInsights,
    getInstagramAccountInsights,
    getInstagramComments,
} from '@/lib/oauth/instagram';
import { logger } from '@/lib/logger';

/**
 * Instagram Data Synchronization Library
 * Handles syncing posts, analytics, and comments from Instagram
 */

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

/**
 * Sync Instagram media (posts) to the database
 */
export async function syncInstagramPosts(
    accountId: string,
    options = { maxPosts: 50 }
): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0, details: [] };

    try {
        // Get account details
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'instagram')
            .single();

        if (accountError || !account) {
            throw new Error('Instagram account not found');
        }

        const accessToken = decryptToken(account.access_token);
        const instagramAccountId = account.account_id;

        // Fetch media from Instagram
        const media = await getInstagramMedia(accessToken, instagramAccountId, options.maxPosts);

        logger.info(`[Instagram Sync] Fetched ${media.length} posts for account ${accountId}`);

        // Sync each post
        for (const item of media) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['instagram'],
                    external_post_id: item.id,
                    content: {
                        caption: item.caption || '',
                        media_type: item.media_type,
                        media_url: item.media_url,
                        permalink: item.permalink,
                        thumbnail_url: item.thumbnail_url,
                    },
                    status: 'published' as const,
                    published_at: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
                };

                const { error: upsertError } = await supabase
                    .from('posts')
                    .upsert(postData, {
                        onConflict: 'workspace_id,external_post_id',
                    });

                if (upsertError) {
                    throw upsertError;
                }

                // Fetch and store insights
                if (item.media_type !== 'CAROUSEL_ALBUM') {
                    try {
                        const insights = await getInstagramMediaInsights(item.id, accessToken);

                        const { data: post } = await supabase
                            .from('posts')
                            .select('id')
                            .eq('external_post_id', item.id)
                            .single();

                        if (post) {
                            const analyticsData = {
                                post_id: post.id,
                                platform: 'instagram',
                                impressions: insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
                                reach: insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
                                engagement: insights.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0,
                                likes: item.like_count || 0,
                                comments: item.comments_count || 0,
                                saves: insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value || 0,
                                shares: insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value || 0,
                                fetched_at: new Date().toISOString(),
                            };

                            await supabase
                                .from('post_analytics')
                                .upsert(analyticsData, {
                                    onConflict: 'post_id,platform',
                                });
                        }
                    } catch (insightsError: any) {
                        logger.warn(`Failed to fetch insights for post ${item.id}`, { error: insightsError });
                    }
                }

                result.synced++;
            } catch (error: any) {
                result.errors++;
                result.details?.push(`Failed to sync post ${item.id}: ${error.message}`);
                logger.error(`Failed to sync Instagram post ${item.id}`, error, {} as any);
            }
        }

        // Update last_synced_at
        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        logger.info(`[Instagram Sync] Completed: ${result.synced} synced, ${result.errors} errors`);
        return result;
    } catch (error: any) {
        logger.error('[Instagram Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Sync Instagram analytics for existing posts
 */
export async function syncInstagramAnalytics(accountId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'instagram')
            .single();

        if (accountError || !account) {
            throw new Error('Instagram account not found');
        }

        const accessToken = decryptToken(account.access_token);

        // Get all Instagram posts
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('social_account_id', accountId)
            .eq('status', 'published')
            .not('external_post_id', 'is', null);

        if (postsError || !posts) {
            throw new Error('Failed to fetch posts');
        }

        for (const post of posts) {
            try {
                const insights = await getInstagramMediaInsights(post.external_post_id, accessToken);

                const analyticsData = {
                    post_id: post.id,
                    platform: 'instagram',
                    impressions: insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
                    reach: insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
                    engagement: insights.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0,
                    saves: insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value || 0,
                    shares: insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value || 0,
                    fetched_at: new Date().toISOString(),
                };

                await supabase
                    .from('post_analytics')
                    .upsert(analyticsData, {
                        onConflict: 'post_id,platform',
                    });

                result.synced++;
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync analytics for post ${post.id}`, error);
            }
        }

        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return result;
    } catch (error: any) {
        logger.error('[Instagram Analytics Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Sync Instagram comments for a specific post
 */
export async function syncInstagramComments(postId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*, social_accounts!inner(*)')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            throw new Error('Post not found');
        }

        const account = (post as any).social_accounts;
        const accessToken = decryptToken(account.access_token);

        const comments = await getInstagramComments(post.external_post_id, accessToken);

        for (const comment of comments) {
            try {
                const commentData = {
                    post_id: postId,
                    external_comment_id: comment.id,
                    author_name: comment.username || comment.from?.username || 'Unknown',
                    author_avatar: null,
                    content: comment.text,
                    likes: comment.like_count || 0,
                    reply_count: comment.replies?.data?.length || 0,
                    created_at: comment.timestamp ? new Date(comment.timestamp).toISOString() : new Date().toISOString(),
                };

                await supabase
                    .from('comments')
                    .upsert(commentData, {
                        onConflict: 'post_id,external_comment_id',
                    });

                result.synced++;
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync comment ${comment.id}`, error);
            }
        }

        return result;
    } catch (error: any) {
        logger.error('[Instagram Comments Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Update Instagram account stats
 */
export async function syncInstagramAccount(accountId: string): Promise<any> {
    const supabase = await createClient();

    try {
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'instagram')
            .single();

        if (accountError || !account) {
            throw new Error('Instagram account not found');
        }

        const accessToken = decryptToken(account.access_token);
        const instagramAccountId = account.account_id;

        const insights = await getInstagramAccountInsights(instagramAccountId, accessToken, 'day');

        const followerCount = insights.find((i: any) => i.name === 'follower_count')?.values?.[0]?.value || account.follower_count;

        await supabase
            .from('social_accounts')
            .update({
                follower_count: followerCount,
                last_synced_at: new Date().toISOString(),
            })
            .eq('id', accountId);

        return { followerCount };
    } catch (error: any) {
        logger.error('[Instagram Account Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Perform full Instagram sync (account + posts + analytics)
 */
export async function performFullInstagramSync(accountId: string): Promise<any> {
    logger.info(`[Instagram Full Sync] Starting for account ${accountId}`);

    try {
        const [accountStats, postsResult] = await Promise.all([
            syncInstagramAccount(accountId),
            syncInstagramPosts(accountId),
        ]);

        const analyticsResult = await syncInstagramAnalytics(accountId);

        logger.info(`[Instagram Full Sync] Completed for account ${accountId}`);

        return {
            accountStats,
            posts: postsResult,
            analytics: analyticsResult,
        };
    } catch (error: any) {
        logger.error('[Instagram Full Sync] Fatal error:', error);
        throw error;
    }
}
