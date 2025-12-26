// ... (imports remain)
import { NextRequest } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    successResponse,
    APIError,
} from '@/lib/api-middleware';
import { getYouTubeChannelVideos, getYouTubeVideoStats, refreshYouTubeToken } from '@/lib/oauth/youtube';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { syncTwitterTweets } from '@/lib/twitter-sync';

/**
 * POST /api/accounts/[id]/sync-posts - Trigger sync to fetch historical posts from platform
 * 
 * This endpoint will fetch posts from the platform's API and store them in platform_posts table.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user, supabase } = await requireAuth(request);

    // Extract account ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accountId = pathParts[pathParts.indexOf('accounts') + 1];

    if (!accountId) {
        throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
    }

    // Verify account belongs to user's workspace
    const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('*') // Select all fields for platform-specific logic
        .eq('id', accountId)
        .single();

    if (accountError || !account) {
        throw new APIError(404, 'Social account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Note: The social_accounts RLS policies now guarantee that we can only select 
    // accounts linked to workspaces where the user is a member. 
    // Therefore, if 'account' is found, the user implicitly has access.
    // We do not need a separate workspace_members query.

    const platform = account.platform.toLowerCase();
    let syncedCount = 0;
    let syncedErrors = 0;
    let details: string[] = [];

    try {
        if (platform === 'youtube') {
            // REAL SYNC for YouTube
            const result = await syncYouTubePosts(account, supabase);
            syncedCount = result.synced;
            syncedErrors = result.errors;
            details = result.details || [];
        } else if (platform === 'twitter') {
            // REAL SYNC for Twitter
            const result = await syncTwitterTweets(account.id, { maxTweets: 50 });
            syncedCount = result.synced;
            syncedErrors = result.errors;
            details = result.details || [];
        } else if (platform === 'facebook') {
            const { syncFacebookPosts } = await import('@/lib/facebook-sync');
            const result = await syncFacebookPosts(account.id, { maxPosts: 50 });
            syncedCount = result.synced;
            syncedErrors = result.errors;
            details = result.details || [];
        } else if (platform === 'linkedin') {
            const { syncLinkedInPosts } = await import('@/lib/linkedin-sync');
            const result = await syncLinkedInPosts(account.id, { maxPosts: 50 });
            syncedCount = result.synced;
            syncedErrors = result.errors;
            details = result.details || [];
        } else if (platform === 'tiktok') {
            const { syncTikTokVideos } = await import('@/lib/tiktok-sync');
            const result = await syncTikTokVideos(account.id, { maxVideos: 50 });
            syncedCount = result.synced;
            syncedErrors = result.errors;
            details = result.details || [];
        } else if (platform === 'instagram') {
            const { syncInstagramPosts } = await import('@/lib/instagram-sync');
            const result = await syncInstagramPosts(account.id);
            syncedCount = result.synced || 0;
            syncedErrors = result.errors;
            details = result.details || [];
        } else {
            // Unsupported or not yet implemented platform
            // Do nothing (count = 0) rather than inventing fake data
            console.warn(`Sync not implemented for platform: ${platform}`);
        }

        // Update last_synced_at
        await supabase
            .from('social_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', accountId);

        return successResponse({
            message:
                syncedErrors > 0
                    ? `Synced ${syncedCount} posts with ${syncedErrors} errors`
                    : `Successfully synced ${syncedCount} posts`,
            count: syncedCount,
            errors: syncedErrors,
            details,
        });

    } catch (error) {
        console.error('Sync error:', error);
        const message = error instanceof Error ? error.message : String(error);
        // If Twitter token is expired/invalid, surface as 401 so UI can prompt reconnect.
        if (platform === 'twitter' && (message.includes('401') || message.toLowerCase().includes('unauthorized'))) {
            throw new APIError(401, 'Twitter authentication expired. Please reconnect Twitter in Accounts (X) and try again.', 'TWITTER_TOKEN_EXPIRED');
        }
        // If Twitter is rate-limiting us, surface as 429 so UI can prompt to retry later.
        if (platform === 'twitter' && (message.includes('429') || message.toLowerCase().includes('rate'))) {
            // Try to parse our encoded format: "Failed to fetch user tweets: 429;retryAfter=NN"
            const match = message.match(/429;retryAfter=(\d+)/);
            const retryAfterSeconds = match ? Number(match[1]) : null;
            throw new APIError(
                429,
                retryAfterSeconds
                    ? `Twitter rate limit hit. Please wait ~${retryAfterSeconds}s and try Sync again.`
                    : 'Twitter rate limit hit. Please wait 1–2 minutes and try Sync again.',
                'TWITTER_RATE_LIMIT',
                retryAfterSeconds ? { retryAfterSeconds } : undefined
            );
        }
        throw new APIError(500, 'Failed to sync posts: ' + message);
    }
});

/**
 * Sync YouTube posts using real API
 */
async function syncYouTubePosts(account: any, supabase: any): Promise<{ synced: number; errors: number; details: string[] }> {
    if (!account.access_token) {
        throw new Error('No access token available');
    }

    // 1. Fetch recent videos from channel
    // Note: account.account_id should be the Channel ID
    let accessToken = decryptToken(account.access_token);

    // Refresh access token if expired
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
    if (expiresAt > 0 && Date.now() >= expiresAt - 60_000 && account.refresh_token) {
        try {
            const { access_token, expires_in } = await refreshYouTubeToken({
                clientId: process.env.YOUTUBE_CLIENT_ID!,
                clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
                redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
            }, decryptToken(account.refresh_token));

            accessToken = access_token;

            // Persist refreshed token
            await supabase
                .from('social_accounts')
                .update({
                    access_token: encryptToken(access_token),
                    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                })
                .eq('id', account.id);
        } catch (err) {
            console.warn('[YouTube Sync] Token refresh failed, proceeding with existing token');
        }
    }
    const details: string[] = [];
    let errors = 0;
    const videos = await getYouTubeChannelVideos(accessToken, account.account_id, 50);
    details.push(`[YouTube] Fetched ${videos.length} videos from API for channelId=${account.account_id}`);

    if (!videos || videos.length === 0) {
        details.push('[YouTube] API returned 0 videos. This can happen if the channel has no public uploads or if the token scopes are missing youtube.readonly.');
    }

    const postsToInsert = [];

    for (const item of videos) {
        const videoId = (item.id as any).videoId; // Search API returns id as object
        if (!videoId) continue;

        try {
            // 2. Fetch video details (stats + duration)
            const videoDetails = await getYouTubeVideoStats(accessToken, videoId);

            // 3. Detect Shorts (duration <= 60s)
            const durationStr = videoDetails.contentDetails?.duration || '';
            const durationSec = parseYouTubeDuration(durationStr);
            const isShort = durationSec > 0 && durationSec <= 60;
            const postType = isShort ? 'short' : 'video';

            // 4. Prepare post data
            const publishedAt = videoDetails.snippet.publishedAt;
            const media = [{
                type: 'video',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnail: videoDetails.snippet.thumbnails.high?.url || videoDetails.snippet.thumbnails.medium?.url || videoDetails.snippet.thumbnails.default?.url,
                duration: durationSec,
                metadata: {
                    duration: durationSec,
                    viewCount: videoDetails.statistics?.viewCount,
                    likeCount: videoDetails.statistics?.likeCount,
                    commentCount: videoDetails.statistics?.commentCount
                }
            }];

            postsToInsert.push({
                caption: videoDetails.snippet.title + '\n\n' + videoDetails.snippet.description.substring(0, 500),
                published_at: publishedAt,
                post_type: postType,
                media: media,
                platform_post_id: videoId,
                external_post_id: videoId,
                permalink: `https://www.youtube.com/watch?v=${videoId}`,
                metrics: {
                    likes: parseInt(videoDetails.statistics?.likeCount || '0'),
                    comments: parseInt(videoDetails.statistics?.commentCount || '0'),
                    views: parseInt(videoDetails.statistics?.viewCount || '0'),
                    shares: 0,
                    saves: 0
                }
            });
            details.push(`Fetched YouTube video ${videoId}`);
        } catch (err) {
            errors++;
            console.error(`Failed to fetch details for video ${videoId}:`, err);
            // Continue to next video
        }
    }

    // 5. Insert into DB
    const synced = await insertPosts(postsToInsert, account, supabase);
    return { synced, errors, details };
}

/**
 * Helper to parse YouTube ISO 8601 duration (PT1M30S)
 */
function parseYouTubeDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt((match[1] || '').replace('H', '')) || 0;
    const minutes = parseInt((match[2] || '').replace('M', '')) || 0;
    const seconds = parseInt((match[3] || '').replace('S', '')) || 0;

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Insert posts into database (shared logic)
 * 
 * Now writes to:
 * 1. external_posts (primary for calendar display of imported content)
 * 2. posts (legacy, for backwards compatibility)
 * 3. platform_posts (for detailed platform tracking)
 * 4. engagement_history (for metrics)
 */
async function insertPosts(posts: any[], account: any, supabase: any) {
    let count = 0;
    const platform = (account.platform || '').toLowerCase();

    for (const post of posts) {
        // ─────────────────────────────────────────────────────────────────────────
        // 1. PRIMARY: Write to external_posts table (new canonical source for imported content)
        // ─────────────────────────────────────────────────────────────────────────
        try {
            const { data: existingExternal } = await supabase
                .from('external_posts')
                .select('id')
                .eq('social_account_id', account.id)
                .eq('platform', platform)
                .eq('external_post_id', post.external_post_id)
                .maybeSingle();

            if (existingExternal?.id) {
                // Update existing external post
                await supabase
                    .from('external_posts')
                    .update({
                        permalink: post.permalink,
                        content: { text: post.caption, caption: post.caption },
                        media: post.media || [],
                        post_type: post.post_type,
                        published_at: post.published_at,
                        metrics: post.metrics || {},
                        fetched_at: new Date().toISOString(),
                    })
                    .eq('id', existingExternal.id);
            } else {
                // Insert new external post
                await supabase
                    .from('external_posts')
                    .insert({
                        workspace_id: account.workspace_id,
                        social_account_id: account.id,
                        platform: platform,
                        external_post_id: post.external_post_id,
                        permalink: post.permalink,
                        content: { text: post.caption, caption: post.caption },
                        media: post.media || [],
                        post_type: post.post_type,
                        published_at: post.published_at,
                        metrics: post.metrics || {},
                    });
            }
        } catch (externalErr: any) {
            // external_posts table might not exist in older deployments
            if (!externalErr?.message?.includes('does not exist')) {
                console.error('Error writing to external_posts:', externalErr);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // 2. LEGACY: Write to posts table (for backwards compatibility)
        // ─────────────────────────────────────────────────────────────────────────
        const { data: existingPost } = await supabase
            .from('posts')
            .select('id')
            .eq('social_account_id', account.id)
            .eq('external_post_id', post.external_post_id)
            .maybeSingle();

        let newPost: any = null;
        let postError: any = null;
        if (existingPost) {
            // Update minimal fields if needed
            const { data: updated, error: updateErr } = await supabase
                .from('posts')
                .update({
                    platforms: [platform],
                    status: 'published',
                    published_at: post.published_at,
                    metadata: { post_type: post.post_type },
                    media: post.media,
                    content: { text: post.caption },
                })
                .eq('id', existingPost.id)
                .select()
                .single();
            newPost = updated || { id: existingPost.id };
            postError = updateErr;
        } else {
            const insertRes = await supabase
                .from('posts')
                .insert({
                    workspace_id: account.workspace_id,
                    social_account_id: account.id,
                    content: { text: post.caption },
                    media: post.media,
                    platforms: [platform],
                    status: 'published',
                    published_at: post.published_at,
                    metadata: { post_type: post.post_type },
                    external_post_id: post.external_post_id,
                })
                .select()
                .single();
            newPost = insertRes.data;
            postError = insertRes.error;
        }

        if (postError) {
            console.error('Error creating post:', postError);
            continue;
        }

        // We successfully created/updated; count it for calendar display.
        count++;

        // ─────────────────────────────────────────────────────────────────────────
        // 3. Create entry in platform_posts table (dedup by platform + platform_post_id)
        // ─────────────────────────────────────────────────────────────────────────
        let existingPlatformPost: any = null;
        try {
            const res = await supabase
                .from('platform_posts')
                .select('id')
                .eq('platform', platform)
                .eq('platform_post_id', post.platform_post_id)
                .maybeSingle();
            existingPlatformPost = res.data;
        } catch (e) {
            // platform_posts might not exist in some deployments; calendar only needs `posts`.
            continue;
        }

        let platformPost: any = null;
        let platformPostError: any = null;
        if (existingPlatformPost) {
            const { data: updatedPlatform, error: updErr } = await supabase
                .from('platform_posts')
                .update({
                    post_id: newPost.id,
                    permalink: post.permalink || `https://${account.platform}.com/p/${post.platform_post_id}`,
                    published_at: post.published_at,
                    status: 'published',
                    metadata: { post_type: post.post_type },
                })
                .eq('id', existingPlatformPost.id)
                .select()
                .single();
            platformPost = updatedPlatform || { id: existingPlatformPost.id };
            platformPostError = updErr;
        } else {
            const insRes = await supabase
                .from('platform_posts')
                .insert({
                    post_id: newPost.id,
                    platform: platform,
                    platform_post_id: post.platform_post_id,
                    permalink: post.permalink,
                    published_at: post.published_at,
                    status: 'published',
                    metadata: { post_type: post.post_type },
                })
                .select()
                .single();
            platformPost = insRes.data;
            platformPostError = insRes.error;
        }

        if (platformPostError) {
            console.error('Error creating platform post:', platformPostError);
            continue;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // 4. Create engagement history
        // ─────────────────────────────────────────────────────────────────────────
        // Only insert if metrics are provided (or default to 0)
        // Never fabricate random numbers
        try {
            await supabase
                .from('engagement_history')
                .insert({
                    platform_post_id: platformPost.id,
                    likes: post.metrics?.likes || 0,
                    comments: post.metrics?.comments || 0,
                    shares: post.metrics?.shares || 0,
                    views: post.metrics?.views || 0,
                    saves: post.metrics?.saves || 0,
                    recorded_at: new Date().toISOString()
                });
        } catch {
            // ignore if engagement_history doesn't exist or RLS blocks it
        }
    }

    return count;
}
