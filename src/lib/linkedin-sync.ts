import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getLinkedInAuthorPosts,
    getLinkedInPostStats,
    getLinkedInProfile,
    hasLinkedInScope,
} from '@/lib/oauth/linkedin';
import { logger } from '@/lib/logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

function getLinkedInAccountType(account: any): 'personal' | 'organization' {
    return account.metadata?.type === 'organization' ? 'organization' : 'personal';
}

function hasLinkedInPostReadScope(account: any): boolean {
    const scopes = account.metadata?.scopes;
    return getLinkedInAccountType(account) === 'organization'
        ? hasLinkedInScope(scopes, 'r_organization_social')
        : hasLinkedInScope(scopes, 'r_member_social');
}

function hasLinkedInAnalyticsScope(account: any): boolean {
    const scopes = account.metadata?.scopes;
    return getLinkedInAccountType(account) === 'organization'
        ? hasLinkedInScope(scopes, 'r_organization_social')
        : hasLinkedInScope(scopes, 'r_member_social') ||
            hasLinkedInScope(scopes, 'r_member_postAnalytics');
}

function missingScopeMessage(account: any, feature: string): string {
    const type = getLinkedInAccountType(account);
    if (type === 'organization') {
        return `LinkedIn ${feature} requires approved organization read access (r_organization_social).`;
    }

    return `LinkedIn ${feature} requires approved member read/analytics access (r_member_social or r_member_postAnalytics).`;
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

        if (!hasLinkedInPostReadScope(account)) {
            const detail = missingScopeMessage(account, 'post sync');
            logger.info('[LinkedIn Sync] Skipping post sync because read scope is unavailable', {
                accountId,
                accountType: getLinkedInAccountType(account),
            });
            result.details?.push(detail);
            return result;
        }

        const accessToken = decryptToken(account.access_token);
        const authorUrn =
            account.metadata?.organizationUrn ||
            account.metadata?.personUrn ||
            (account.metadata?.type === 'organization'
                ? `urn:li:organization:${account.account_id}`
                : `urn:li:person:${account.account_id}`);

        const posts = await getLinkedInAuthorPosts(accessToken, authorUrn, options.maxPosts);

        for (const post of posts) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['linkedin'],
                    external_post_id: post.id,
                    content: {
                        text: post.commentary || post.text || '',
                        article: post.content?.article || post.article,
                        content: post.content,
                    },
                    status: 'published' as const,
                    published_at: post.createdAt
                        ? new Date(post.createdAt).toISOString()
                        : post.created?.time
                            ? new Date(post.created.time).toISOString()
                            : new Date().toISOString(),
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
                            likes: stats.likeCount || stats.likes || 0,
                            comments: stats.commentCount || stats.comments || 0,
                            shares: stats.shareCount || stats.shares || 0,
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

        if (!hasLinkedInAnalyticsScope(account)) {
            const detail = missingScopeMessage(account, 'analytics sync');
            logger.info('[LinkedIn Analytics Sync] Skipping analytics sync because read scope is unavailable', {
                accountId,
                accountType: getLinkedInAccountType(account),
            });
            return { ...result, details: [detail] };
        }

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
                        likes: stats.likeCount || stats.likes || 0,
                        comments: stats.commentCount || stats.comments || 0,
                        shares: stats.shareCount || stats.shares || 0,
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
                ...(account.metadata || {}),
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
