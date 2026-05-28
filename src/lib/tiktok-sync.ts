import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
    getTikTokUserVideos,
    getTikTokUserInfo,
} from '@/lib/oauth/tiktok';
import { logger } from '@/lib/logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';
import { persistPlatformMetrics } from '@/lib/intelligence/analytics-sync';

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

export async function syncTikTokVideos(
    accountId: string,
    options = { maxVideos: 50 }
): Promise<SyncResult> {
    const supabase = await createClient();
    const result: SyncResult = { synced: 0, errors: 0, details: [] };

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'tiktok')
            .single();

        if (!account) throw new Error('TikTok account not found');

        const accessToken = decryptToken(account.access_token);

        const videoData = await getTikTokUserVideos(accessToken, options.maxVideos);
        const videos = videoData.videos || [];

        for (const video of videos) {
            try {
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: accountId,
                    platforms: ['tiktok'],
                    external_post_id: video.id,
                    content: {
                        title: video.title || '',
                        description: video.video_description || '',
                        video_url: video.share_url || video.embed_link,
                        cover_image_url: video.cover_image_url,
                        duration: video.duration,
                    },
                    status: 'published' as const,
                    published_at: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
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
                    if (postId) {
                        const analyticsData = {
                            post_id: postId,
                            platform: 'tiktok',
                            views: video.view_count || 0,
                            likes: video.like_count || 0,
                            comments: video.comment_count || 0,
                            shares: video.share_count || 0,
                            fetched_at: new Date().toISOString(),
                        };

                        await persistPlatformMetrics(supabase as any, {
                            workspaceId: account.workspace_id,
                            postId,
                            platformPostId: video.id,
                            socialAccountId: accountId,
                            platform: 'tiktok',
                            publishedAt: postData.published_at,
                            metrics: {
                                ...analyticsData,
                                video_views: video.view_count || 0,
                                engagement:
                                    (video.like_count || 0) +
                                    (video.comment_count || 0) +
                                    (video.share_count || 0),
                            },
                            raw: video,
                            syncSource: 'tiktok_videos_sync',
                        });
                    }
                } catch (statsError) {
                    logger.warn(`Failed to store stats for video ${video.id}`, statsError as any);
                }

                result.synced++;
            } catch (error: any) {
                result.errors++;
                result.details?.push(`Failed to sync video ${video.id}: ${error.message}`);
                logger.error(`Failed to sync TikTok video ${video.id}`, error as any);
            }
        }

        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return result;
    } catch (error: any) {
        logger.error('[TikTok Sync] Fatal error:', error as any);
        throw error;
    }
}

export async function syncTikTokAnalytics(accountId: string): Promise<SyncResult> {
    // For TikTok, analytics sync is effectively the same as video sync 
    // because we get stats from the video list endpoint.
    // We'll just run a video sync with a higher limit to update stats for recent videos.
    return syncTikTokVideos(accountId, { maxVideos: 50 });
}

export async function syncTikTokProfile(accountId: string): Promise<any> {
    const supabase = await createClient();

    try {
        const { data: account } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'tiktok')
            .single();

        if (!account) throw new Error('TikTok account not found');

        const accessToken = decryptToken(account.access_token);

        const userInfo = await getTikTokUserInfo(accessToken);

        const updates: any = {
            last_synced_at: new Date().toISOString(),
        };

        if (userInfo) {
            updates.follower_count = userInfo.follower_count || account.follower_count;
            updates.metadata = {
                following_count: userInfo.following_count || 0,
                video_count: userInfo.video_count || 0,
                likes_count: userInfo.likes_count || 0,
            };
        }

        await supabase
            .from('social_accounts')
            .update(updates)
            .eq('id', accountId);

        return { profile: updates.metadata };
    } catch (error: any) {
        logger.error('[TikTok Profile Sync] Fatal error:', error as any);
        throw error;
    }
}

export async function performFullTikTokSync(accountId: string): Promise<any> {
    logger.info(`[TikTok Full Sync] Starting for account ${accountId}`);

    try {
        const [profileStats, videosResult] = await Promise.all([
            syncTikTokProfile(accountId),
            syncTikTokVideos(accountId),
        ]);

        const analyticsResult = await syncTikTokAnalytics(accountId);

        logger.info(`[TikTok Full Sync] Completed for account ${accountId}`);

        return {
            profileStats,
            videos: videosResult,
            analytics: analyticsResult,
        };
    } catch (error: any) {
        logger.error('[TikTok Full Sync] Fatal error:', error as any);
        throw error;
    }
}
