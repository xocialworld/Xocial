import { decryptToken } from './encryption';
import { createClient } from './supabase/server';
import {
    getYouTubeChannelVideos,
    getYouTubeVideoStats,
    getYouTubeVideoComments,
    getYouTubeChannelStats,
} from './oauth/youtube';
import { logger } from './logger';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';
import { persistPlatformMetrics } from '@/lib/intelligence/analytics-sync';

export interface YouTubeChannelStats {
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    thumbnailUrl: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
}

export interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        description: string;
        customUrl?: string;
        publishedAt: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
    };
    statistics: {
        subscriberCount: string;
        videoCount: string;
        viewCount: string;
    };
}

interface SyncResult {
    synced: number;
    errors: number;
    details?: string[];
}

/**
 * Fetch channel statistics from YouTube Data API
 */
export async function getChannelStats(
    accessToken: string,
    channelId: string
): Promise<YouTubeChannelStats> {
    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const channel = data.items?.[0] as YouTubeChannel;

    if (!channel) {
        throw new Error('Channel not found');
    }

    return {
        subscriberCount: parseInt(channel.statistics.subscriberCount, 10),
        videoCount: parseInt(channel.statistics.videoCount, 10),
        viewCount: parseInt(channel.statistics.viewCount, 10),
        thumbnailUrl: channel.snippet.thumbnails.high.url,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
    };
}

/**
 * Sync YouTube channel data for a social account
 */
export async function syncYouTubeChannel(accountId: string): Promise<YouTubeChannelStats> {
    const supabase = await createClient();

    // Fetch account with encrypted tokens
    const { data: account, error: fetchError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'youtube')
        .single();

    if (fetchError || !account) {
        throw new Error('YouTube account not found');
    }

    // Decrypt access token
    const accessToken = decryptToken(account.access_token);
    const channelId = account.account_id;

    // Fetch latest stats from YouTube
    const stats = await getChannelStats(accessToken, channelId);

    // Update database with fresh stats
    const { error: updateError } = await supabase
        .from('social_accounts')
        .update({
            follower_count: stats.subscriberCount,
            account_avatar: stats.thumbnailUrl,
            last_synced_at: new Date().toISOString(),
            metadata: {
                ...account.metadata,
                channel_title: account.account_name,
                subscriber_count: stats.subscriberCount,
                video_count: stats.videoCount,
                view_count: stats.viewCount,
                thumbnail_url: stats.thumbnailUrl,
                description: stats.description,
                custom_url: stats.customUrl,
                published_at: stats.publishedAt,
            },
        })
        .eq('id', accountId);

    if (updateError) {
        throw new Error(`Failed to update account: ${updateError.message}`);
    }

    return stats;
}

/**
 * Fetch recent videos from a YouTube channel
 */
export async function getRecentVideos(
    accessToken: string,
    channelId: string,
    maxResults: number = 10
) {
    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.items || [];
}

function parseYouTubeDurationSeconds(duration: string | undefined): number {
    if (!duration) return 0;

    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt((match[1] || '').replace('H', ''), 10) || 0;
    const minutes = parseInt((match[2] || '').replace('M', ''), 10) || 0;
    const seconds = parseInt((match[3] || '').replace('S', ''), 10) || 0;

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get all YouTube accounts for a workspace
 */
export async function getYouTubeAccounts(workspaceId: string) {
    const supabase = await createClient();

    const { data: accounts, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'youtube')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch YouTube accounts: ${error.message}`);
    }

    return accounts || [];
}

/**
 * Sync recent videos from YouTube channel to posts table
 */
export async function syncYouTubeVideos(
    accountId: string,
    options: { days?: number; maxVideos?: number } = {}
): Promise<SyncResult> {
    const { days = 30, maxVideos = 50 } = options;
    const supabase = await createClient();

    try {
        // Get account details
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'youtube')
            .single();

        if (accountError || !account) {
            throw new Error('YouTube account not found');
        }

        // Decrypt access token
        const accessToken = decryptToken(account.access_token);

        // Fetch recent videos
        logger.info(`[YouTube Sync] Fetching videos for channel ${account.account_id}`);
        const videos = await getYouTubeChannelVideos(accessToken, account.account_id, maxVideos);

        if (!videos || videos.length === 0) {
            logger.info(`[YouTube Sync] No videos found for channel ${account.account_id}`);
            return { synced: 0, errors: 0 };
        }

        // Filter videos by publish date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recentVideos = videos.filter((video: any) => {
            const videoId = video.id?.videoId || video.id;
            const publishedAt = new Date(video.snippet?.publishedAt || video.publishedAt);
            return publishedAt >= cutoffDate && videoId;
        });

        logger.info(`[YouTube Sync] Found ${recentVideos.length} recent videos (last ${days} days)`);

        let synced = 0;
        let errors = 0;
        const details: string[] = [];

        // Sync each video
        for (const video of recentVideos) {
            try {
                const videoId = typeof video.id === 'string'
                    ? video.id
                    : ((video.id as any)?.videoId || null);
                if (!videoId) continue;

                // Fetch detailed stats for the video
                const videoStats = await getYouTubeVideoStats(accessToken, videoId);
                const durationSeconds = parseYouTubeDurationSeconds(videoStats.contentDetails?.duration);
                const thumbnailUrl =
                    video.snippet?.thumbnails?.high?.url ||
                    videoStats.snippet?.thumbnails?.high?.url ||
                    video.snippet?.thumbnails?.medium?.url ||
                    videoStats.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url ||
                    videoStats.snippet?.thumbnails?.default?.url;
                const postType = durationSeconds > 0 && durationSeconds <= 60 ? 'short' : 'video';

                // Prepare post data
                const postData = {
                    workspace_id: account.workspace_id,
                    social_account_id: account.id,
                    external_post_id: videoId,
                    content: {
                        title: video.snippet?.title || videoStats.snippet?.title,
                        description: video.snippet?.description || videoStats.snippet?.description,
                        text: video.snippet?.title || videoStats.snippet?.title,
                        videoId: videoId,
                        thumbnails: video.snippet?.thumbnails || videoStats.snippet?.thumbnails,
                    },
                    platforms: ['youtube'],
                    post_type: postType,
                    status: 'published',
                    published_at: video.snippet?.publishedAt || videoStats.snippet?.publishedAt,
                    media: thumbnailUrl ? [{
                        id: videoId,
                        type: 'video',
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        thumbnail: thumbnailUrl,
                        filename: `youtube-${videoId}`,
                        size: 0,
                        duration: durationSeconds,
                        videoId,
                    }] : null,
                    metadata: {
                        post_type: postType,
                        youtube: {
                            videoId: videoId,
                            channelId: account.account_id,
                            categoryId: videoStats.snippet?.categoryId,
                            tags: videoStats.snippet?.tags || [],
                            duration: videoStats.contentDetails?.duration,
                        },
                    },
                };

                const { id: postId } = await upsertPostByExternalId(supabase as any, {
                    workspace_id: postData.workspace_id,
                    social_account_id: postData.social_account_id,
                    external_post_id: postData.external_post_id,
                    platforms: postData.platforms,
                    content: postData.content,
                    status: postData.status,
                    published_at: postData.published_at,
                    scheduled_at: null,
                    media: postData.media,
                    metadata: postData.metadata,
                });

                // Store analytics if available
                if (videoStats.statistics) {
                    const analyticsData = {
                        post_id: postId,
                        platform: 'youtube',
                        impressions: parseInt(videoStats.statistics.viewCount || '0'),
                        reach: parseInt(videoStats.statistics.viewCount || '0'),
                        engagement: parseInt(videoStats.statistics.likeCount || '0') +
                            parseInt(videoStats.statistics.commentCount || '0'),
                        likes: parseInt(videoStats.statistics.likeCount || '0'),
                        comments: parseInt(videoStats.statistics.commentCount || '0'),
                        shares: 0,
                        video_views: parseInt(videoStats.statistics.viewCount || '0'),
                        fetched_at: new Date().toISOString(),
                    };

                    await persistPlatformMetrics(supabase as any, {
                        workspaceId: account.workspace_id,
                        postId,
                        platformPostId: videoId,
                        socialAccountId: accountId,
                        platform: 'youtube',
                        publishedAt: postData.published_at,
                        metrics: analyticsData,
                        raw: videoStats.statistics || {},
                        syncSource: 'youtube_videos_sync',
                    });
                }

                synced++;
                details.push(`Synced video: ${video.snippet?.title || videoStats.snippet?.title}`);
                logger.info(`[YouTube Sync] Synced video ${videoId}`);
            } catch (error: any) {
                errors++;
                details.push(`Error syncing video: ${error.message}`);
                logger.error(`[YouTube Sync] Error syncing video:`, error);
            }
        }

        logger.info(`[YouTube Sync] Completed: ${synced} synced, ${errors} errors`);
        return { synced, errors, details };
    } catch (error: any) {
        logger.error('[YouTube Sync] Fatal error syncing videos:', error);
        throw error;
    }
}

/**
 * Sync analytics for existing YouTube posts
 */
export async function syncYouTubeAnalytics(accountId: string): Promise<SyncResult> {
    const supabase = await createClient();

    try {
        // Get account details
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'youtube')
            .single();

        if (accountError || !account) {
            throw new Error('YouTube account not found');
        }

        // Decrypt access token
        const accessToken = decryptToken(account.access_token);

        // Get all YouTube posts for this account
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('id, external_post_id, content, published_at')
            .eq('social_account_id', account.id)
            .eq('status', 'published')
            .not('external_post_id', 'is', null);

        if (postsError || !posts || posts.length === 0) {
            return { synced: 0, errors: 0 };
        }

        logger.info(`[YouTube Analytics Sync] Syncing ${posts.length} videos`);

        let synced = 0;
        let errors = 0;

        for (const post of posts) {
            try {
                const videoId = post.external_post_id;
                if (!videoId) continue;

                // Fetch latest stats
                const videoStats = await getYouTubeVideoStats(accessToken, videoId);

                if (videoStats.statistics) {
                    const viewCount = parseInt(videoStats.statistics.viewCount || '0');
                    const likeCount = parseInt(videoStats.statistics.likeCount || '0');
                    const commentCount = parseInt(videoStats.statistics.commentCount || '0');

                    const analyticsData = {
                        post_id: post.id,
                        platform: 'youtube',
                        impressions: viewCount,
                        reach: viewCount,
                        engagement: likeCount + commentCount,
                        likes: likeCount,
                        comments: commentCount,
                        shares: 0,
                        video_views: viewCount,
                        engagement_rate: viewCount > 0
                            ? ((likeCount + commentCount) / viewCount) * 100
                            : 0,
                        fetched_at: new Date().toISOString(),
                    };

                    await persistPlatformMetrics(supabase as any, {
                        workspaceId: account.workspace_id,
                        postId: post.id,
                        platformPostId: videoId,
                        socialAccountId: accountId,
                        platform: 'youtube',
                        publishedAt: post.published_at,
                        metrics: analyticsData,
                        raw: videoStats.statistics || {},
                        syncSource: 'youtube_analytics_sync',
                    });

                    synced++;
                }
            } catch (error: any) {
                errors++;
                logger.error(`[YouTube Analytics Sync] Error syncing video ${post.external_post_id}:`, error);
            }
        }

        // Update account's last_synced_at
        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        logger.info(`[YouTube Analytics Sync] Completed: ${synced} synced, ${errors} errors`);
        return { synced, errors };
    } catch (error: any) {
        logger.error('[YouTube Analytics Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Sync comments for a specific YouTube video
 */
export async function syncYouTubeComments(postId: string): Promise<SyncResult> {
    const supabase = await createClient();

    try {
        // Get post and account details
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select(`
                id,
                external_post_id,
                social_account_id,
                social_accounts (
                    id,
                    access_token,
                    platform
                )
            `)
            .eq('id', postId)
            .single();

        if (postError || !post || !post.external_post_id) {
            throw new Error('Post not found');
        }

        const account = Array.isArray(post.social_accounts)
            ? post.social_accounts[0]
            : post.social_accounts;

        if (!account || account.platform !== 'youtube') {
            throw new Error('Not a YouTube post');
        }

        // Decrypt access token
        const accessToken = decryptToken(account.access_token);

        // Fetch comments
        const comments = await getYouTubeVideoComments(accessToken, post.external_post_id, 100);

        if (!comments || comments.length === 0) {
            return { synced: 0, errors: 0 };
        }

        let synced = 0;
        let errors = 0;

        for (const comment of comments) {
            try {
                const snippet = comment.snippet.topLevelComment?.snippet || comment.snippet;

                const commentData = {
                    post_id: post.id,
                    external_comment_id: comment.id,
                    platform: 'youtube',
                    author_name: snippet.authorDisplayName,
                    author_avatar: snippet.authorProfileImageUrl,
                    author_id: snippet.authorChannelId?.value,
                    content: snippet.textDisplay,
                    likes: snippet.likeCount || 0,
                    reply_count: comment.snippet.totalReplyCount || 0,
                    is_reply: false,
                    created_at: snippet.publishedAt,
                };

                await supabase
                    .from('comments')
                    .upsert(commentData, {
                        onConflict: 'post_id,external_comment_id',
                    });

                synced++;
            } catch (error: any) {
                errors++;
                logger.error('[YouTube Comments Sync] Error syncing comment:', error);
            }
        }

        logger.info(`[YouTube Comments Sync] Synced ${synced} comments for video ${post.external_post_id}`);
        return { synced, errors };
    } catch (error: any) {
        logger.error('[YouTube Comments Sync] Fatal error:', error);
        throw error;
    }
}

/**
 * Perform full sync - run after initial connection
 */
export async function performFullYouTubeSync(accountId: string): Promise<{
    videos: SyncResult;
    analytics: SyncResult;
    channelStats: YouTubeChannelStats;
}> {
    logger.info(`[YouTube Full Sync] Starting full sync for account ${accountId}`);

    try {
        // 1. Sync channel stats
        const channelStats = await syncYouTubeChannel(accountId);

        // 2. Sync recent videos (last 30 days)
        const videos = await syncYouTubeVideos(accountId, { days: 30, maxVideos: 50 });

        // 3. Sync analytics for all videos
        const analytics = await syncYouTubeAnalytics(accountId);

        logger.info(`[YouTube Full Sync] Completed for account ${accountId}`);

        return {
            videos,
            analytics,
            channelStats,
        };
    } catch (error: any) {
        logger.error('[YouTube Full Sync] Error:', error);
        throw error;
    }
}
