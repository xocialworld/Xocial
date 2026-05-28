import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getFacebookPagePosts,
    getFacebookPostInsights,
    getFacebookPageInsights,
    getFacebookPostComments,
} from '@/lib/oauth/facebook';
import { logger } from '@/lib/logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';
import { upsertSocialComment } from '@/lib/sync/social-comments';
import { persistPlatformMetrics } from '@/lib/intelligence/analytics-sync';

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

export async function syncFacebookPosts(
    accountId: string,
    options = { maxPosts: 50 }
): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0, details: [] };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'facebook')
            .single();

        if (!account) throw new Error('Facebook account not found');

        const accessToken = decryptToken(account.access_token);
        const pageId = account.account_id;

        const posts = await getFacebookPagePosts(accessToken, pageId, options.maxPosts);

        for (const post of posts) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['facebook'],
                    external_post_id: post.id,
                    content: {
                        message: post.message || '',
                        story: post.story,
                        type: post.type,
                        link: post.link,
                        permalink_url: post.permalink_url,
                    },
                    status: 'published' as const,
                    published_at: post.created_time ? new Date(post.created_time).toISOString() : new Date().toISOString(),
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

                // Fetch insights
                try {
                    const insights = await getFacebookPostInsights(post.id, accessToken);
                    if (postId) {
                        const analyticsData = {
                            post_id: postId,
                            platform: 'facebook',
                            impressions: insights.find((i: any) => i.name === 'post_impressions')?.values?.[0]?.value || 0,
                            reach: insights.find((i: any) => i.name === 'post_reach')?.values?.[0]?.value || 0,
                            engagement: insights.find((i: any) => i.name === 'post_engaged_users')?.values?.[0]?.value || 0,
                            likes: post.likes?.summary?.total_count || 0,
                            comments: post.comments?.summary?.total_count || 0,
                            shares: post.shares?.count || 0,
                            fetched_at: new Date().toISOString(),
                        };

                        await persistPlatformMetrics(supabase as any, {
                            workspaceId: account.workspace_id,
                            postId,
                            platformPostId: post.id,
                            socialAccountId: accountId,
                            platform: 'facebook',
                            publishedAt: postData.published_at,
                            metrics: analyticsData,
                            raw: { insights, post },
                            syncSource: 'facebook_posts_sync',
                        });
                    }
                } catch (insightsError: any) {
                    logger.warn(`Failed to fetch insights for post ${post.id}`, { error: insightsError });
                }

                result.synced++;
            } catch (error: any) {
                result.errors++;
                result.details?.push(`Failed to sync post ${post.id}: ${error.message}`);
                logger.error(`Failed to sync Facebook post ${post.id}`, error, {} as any);
            }
        }

        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return result;
    } catch (error: any) {
        logger.error('[Facebook Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncFacebookAnalytics(accountId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'facebook')
            .single();

        if (!account) throw new Error('Facebook account not found');

        const accessToken = decryptToken(account.access_token);

        const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('social_account_id', accountId)
            .eq('status', 'published')
            .not('external_post_id', 'is', null);

        for (const post of posts || []) {
            try {
                const insights = await getFacebookPostInsights(post.external_post_id, accessToken);

                const analyticsData = {
                    post_id: post.id,
                    platform: 'facebook',
                    impressions: insights.find((i: any) => i.name === 'post_impressions')?.values?.[0]?.value || 0,
                    reach: insights.find((i: any) => i.name === 'post_reach')?.values?.[0]?.value || 0,
                    engagement: insights.find((i: any) => i.name === 'post_engaged_users')?.values?.[0]?.value || 0,
                    fetched_at: new Date().toISOString(),
                };

                await persistPlatformMetrics(supabase as any, {
                    workspaceId: account.workspace_id,
                    postId: post.id,
                    platformPostId: post.external_post_id,
                    socialAccountId: accountId,
                    platform: 'facebook',
                    publishedAt: post.published_at,
                    metrics: analyticsData,
                    raw: { insights },
                    syncSource: 'facebook_analytics_sync',
                });

                result.synced++;
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync analytics for post ${post.id}`, error, {} as any);
            }
        }

        return result;
    } catch (error: any) {
        logger.error('[Facebook Analytics Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncFacebookComments(postId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: post } = await supabase
            .from('posts')
            .select('*, social_accounts!inner(*)')
            .eq('id', postId)
            .single();

        if (!post) throw new Error('Post not found');

        const account = (post as any).social_accounts;
        const accessToken = decryptToken(account.access_token);

        const comments = await getFacebookPostComments(accessToken, post.external_post_id);

        for (const comment of comments) {
            try {
                const commentData = {
                    workspace_id: post.workspace_id,
                    post_id: postId,
                    social_account_id: account.id,
                    platform: 'facebook' as const,
                    external_post_id: post.external_post_id,
                    external_comment_id: comment.id,
                    author_name: comment.from?.name || 'Unknown',
                    author_handle: comment.from?.id || null,
                    author_avatar: null,
                    content: comment.message,
                    like_count: comment.like_count || 0,
                    reply_count: comment.comment_count || 0,
                    raw: comment,
                    created_time: comment.created_time ? new Date(comment.created_time).toISOString() : null,
                    fetched_at: new Date().toISOString(),
                };

                await upsertSocialComment(supabase as any, commentData);

                result.synced++;
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync comment ${comment.id}`, error, {} as any);
            }
        }

        return result;
    } catch (error: any) {
        logger.error('[Facebook Comments Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncFacebookPage(accountId: string): Promise<any> {
    const supabase = await createClient();

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'facebook')
            .single();

        if (!account) throw new Error('Facebook account not found');

        const accessToken = decryptToken(account.access_token);
        const pageId = account.account_id;

        const insights = await getFacebookPageInsights(accessToken, pageId);

        const fanCount = insights.find((i: any) => i.name === 'page_fans')?.values?.[0]?.value || account.follower_count;

        await supabase
            .from('social_accounts')
            .update({
                follower_count: fanCount,
                last_synced_at: new Date().toISOString(),
            })
            .eq('id', accountId);

        return { fanCount };
    } catch (error: any) {
        logger.error('[Facebook Page Sync] Fatal error:', error);
        throw error;
    }
}

export async function performFullFacebookSync(accountId: string): Promise<any> {
    logger.info(`[Facebook Full Sync] Starting for account ${accountId}`);

    try {
        const [pageStats, postsResult] = await Promise.all([
            syncFacebookPage(accountId),
            syncFacebookPosts(accountId),
        ]);

        const analyticsResult = await syncFacebookAnalytics(accountId);

        logger.info(`[Facebook Full Sync] Completed for account ${accountId}`);

        return {
            pageStats,
            posts: postsResult,
            analytics: analyticsResult,
        };
    } catch (error: any) {
        logger.error('[Facebook Full Sync] Fatal error:', error);
        throw error;
    }
}
