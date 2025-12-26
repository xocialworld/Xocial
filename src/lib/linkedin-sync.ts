import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getLinkedInUserPosts,
    getLinkedInPostStats,
    getLinkedInProfile,
} from '@/lib/oauth/linkedin';
import { logger } from '@/lib/logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

export async function syncLinkedInPosts(
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
            .eq('platform', 'linkedin')
            .single();

        if (!account) throw new Error('LinkedIn account not found');

        const accessToken = decryptToken(account.access_token);
        const personId = account.account_id;

        const posts = await getLinkedInUserPosts(accessToken, personId, options.maxPosts);

        for (const post of posts) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['linkedin'],
                    external_post_id: post.id,
                    content: {
                        text: post.commentary || post.text || '',
                        article: post.article,
                    },
                    status: 'published' as const,
                    published_at: post.created?.time ? new Date(post.created.time).toISOString() : new Date().toISOString(),
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

                // Store stats
                try {
                    const stats = await getLinkedInPostStats(accessToken, post.id);
                    if (postId && stats) {
                        const analyticsData = {
                            post_id: postId,
                            platform: 'linkedin',
                            impressions: stats.impressionCount || 0,
                            likes: stats.likeCount || 0,
                            comments: stats.commentCount || 0,
                            shares: stats.shareCount || 0,
                            engagement: stats.engagementCount || 0,
                            fetched_at: new Date().toISOString(),
                        };

                        await supabase.from('post_analytics').upsert(analyticsData, {
                            onConflict: 'post_id,platform',
                        });
                    }
                } catch (statsError: any) {
                    logger.warn(`Failed to fetch stats for post ${post.id}`, { error: statsError });
                }

                result.synced++;
            } catch (error: any) {
                result.errors++;
                result.details?.push(`Failed to sync post ${post.id}: ${error.message}`);
                logger.error(`Failed to sync LinkedIn post ${post.id}`, error, {} as any);
            }
        }

        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return result;
    } catch (error: any) {
        logger.error('[LinkedIn Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncLinkedInAnalytics(accountId: string): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0 };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'linkedin')
            .single();

        if (!account) throw new Error('LinkedIn account not found');

        const accessToken = decryptToken(account.access_token);

        const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('social_account_id', accountId)
            .eq('status', 'published')
            .not('external_post_id', 'is', null);

        for (const post of posts || []) {
            try {
                const stats = await getLinkedInPostStats(accessToken, post.external_post_id);

                if (stats) {
                    const analyticsData = {
                        post_id: post.id,
                        platform: 'linkedin',
                        impressions: stats.impressionCount || 0,
                        likes: stats.likeCount || 0,
                        comments: stats.commentCount || 0,
                        shares: stats.shareCount || 0,
                        engagement: stats.engagementCount || 0,
                        fetched_at: new Date().toISOString(),
                    };

                    await supabase.from('post_analytics').upsert(analyticsData, {
                        onConflict: 'post_id,platform',
                    });

                    result.synced++;
                }
            } catch (error: any) {
                result.errors++;
                logger.error(`Failed to sync analytics for post ${post.id}`, error, {} as any);
            }
        }

        return result;
    } catch (error: any) {
        logger.error('[LinkedIn Analytics Sync] Fatal error:', error);
        throw error;
    }
}

export async function syncLinkedInProfile(accountId: string): Promise<any> {
    const supabase = await createClient();

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'linkedin')
            .single();

        if (!account) throw new Error('LinkedIn account not found');

        const accessToken = decryptToken(account.access_token);

        const profile = await getLinkedInProfile(accessToken);

        const updates: any = {
            last_synced_at: new Date().toISOString(),
        };

        if (profile) {
            updates.follower_count = profile.followersCount || account.follower_count;
            updates.metadata = {
                connections_count: profile.connectionsCount || 0,
            };
        }

        await supabase
            .from('social_accounts')
            .update(updates)
            .eq('id', accountId);

        return { profile: updates.metadata };
    } catch (error: any) {
        logger.error('[LinkedIn Profile Sync] Fatal error:', error);
        throw error;
    }
}

export async function performFullLinkedInSync(accountId: string): Promise<any> {
    logger.info(`[LinkedIn Full Sync] Starting for account ${accountId}`);

    try {
        const [profileStats, postsResult] = await Promise.all([
            syncLinkedInProfile(accountId),
            syncLinkedInPosts(accountId),
        ]);

        const analyticsResult = await syncLinkedInAnalytics(accountId);

        logger.info(`[LinkedIn Full Sync] Completed for account ${accountId}`);

        return {
            profileStats,
            posts: postsResult,
            analytics: analyticsResult,
        };
    } catch (error: any) {
        logger.error('[LinkedIn Full Sync] Fatal error:', error);
        throw error;
    }
}
