import { NextRequest } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    successResponse,
    APIError,
} from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/accounts/[id]/posts - Fetch all posts for a specific social account
 * 
 * Query Parameters:
 * - post_type (optional): Filter by post type (feed, story, reel, video, carousel, tweet, article)
 * - limit (optional): Number of posts per page (default: 20, max: 100)
 * - cursor (optional): Pagination cursor (published_at timestamp)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user, supabase } = await requireAuth(request);

    // Extract account ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accountId = pathParts[pathParts.indexOf('accounts') + 1];

    if (!accountId) {
        throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
    }

    // Get query parameters
    const searchParams = url.searchParams;
    const postType = searchParams.get('post_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const cursor = searchParams.get('cursor'); // ISO timestamp for pagination

    // Verify account belongs to user's workspace
    const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('id, platform, workspace_id, account_id')
        .eq('id', accountId)
        .single();

    if (accountError || !account) {
        throw new APIError(404, 'Social account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Verify user has access to this workspace
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', account.workspace_id)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        throw new APIError(403, 'You do not have access to this account', 'FORBIDDEN');
    }

    // Build query to fetch platform posts
    const platform = account.platform.toLowerCase();

    // We need to fetch posts that were published to this specific account
    // The relationship is: platform_posts -> posts -> workspace_id (matches account's workspace)
    // And we filter by platform to match the account's platform
    let query = supabase
        .from('platform_posts')
        .select(`
      id,
      platform,
      platform_post_id,
      permalink,
      published_at,
      status,
      metadata,
      posts!inner (
        id,
        content,
        media,
        platforms,
        workspace_id,
        metadata
      )
    `)
        .eq('platform', platform)
        .eq('posts.workspace_id', account.workspace_id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit * 2); // Fetch more to account for filtering

    // Apply cursor-based pagination
    if (cursor) {
        query = query.lt('published_at', cursor);
    }

    const { data: platformPosts, error: postsError, count } = await query;

    if (postsError) {
        throw new APIError(500, postsError.message, 'DATABASE_ERROR');
    }

    // Fetch latest engagement metrics for each post and transform data
    let postsWithMetrics = await Promise.all(
        (platformPosts || []).map(async (platformPost: any) => {
            const { data: latestEngagement } = await supabase
                .from('engagement_history')
                .select('likes, comments, shares, views, saves')
                .eq('platform_post_id', platformPost.id)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();

            const post = Array.isArray(platformPost.posts)
                ? platformPost.posts[0]
                : platformPost.posts;

            // Extract post type from metadata or infer from platform
            const extractedPostType = post?.metadata?.post_type ||
                platformPost.metadata?.post_type ||
                inferPostTypeFromPlatform(platform, post?.media);

            return {
                id: platformPost.id,
                platform: platformPost.platform,
                platform_post_id: platformPost.platform_post_id,
                post_type: extractedPostType,
                content: post?.content || {},
                media: post?.media || [],
                metrics: latestEngagement || {
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    views: 0,
                    saves: 0,
                },
                published_at: platformPost.published_at,
                permalink: platformPost.permalink,
                metadata: platformPost.metadata,
            };
        })
    );

    // Apply post type filter in memory
    if (postType && postType !== 'all') {
        postsWithMetrics = postsWithMetrics.filter(
            (post) => post.post_type === postType
        );
    }

    // Apply pagination after filtering
    const hasMore = postsWithMetrics.length > limit;
    const paginatedPosts = hasMore ? postsWithMetrics.slice(0, limit) : postsWithMetrics;

    // Get next cursor (last post's published_at)
    const nextCursor = hasMore && paginatedPosts.length > 0
        ? paginatedPosts[paginatedPosts.length - 1].published_at
        : null;

    return successResponse({
        posts: paginatedPosts,
        has_more: hasMore,
        next_cursor: nextCursor,
    });
});

/**
 * Infer post type from platform and media
 */
function inferPostTypeFromPlatform(platform: string, media?: any[]): string {
    // Default post types by platform
    const platformDefaults: Record<string, string> = {
        instagram: 'feed',
        facebook: 'feed',
        twitter: 'tweet',
        linkedin: 'article',
        youtube: 'video',
        tiktok: 'video',
    };

    // Check if it's a video post
    if (media && media.length > 0) {
        const hasVideo = media.some((m: any) =>
            m.type === 'video' || m.url?.includes('.mp4') || m.url?.includes('.mov')
        );

        if (hasVideo) {
            const videoMedia = media.find((m: any) => m.type === 'video');

            // Detect YouTube Shorts (vertical videos, typically < 60 seconds)
            if (platform === 'youtube' && videoMedia) {
                const duration = videoMedia.duration || videoMedia.metadata?.duration;
                const aspectRatio = videoMedia.aspectRatio || videoMedia.metadata?.aspectRatio;
                const isVertical = aspectRatio && (aspectRatio < 1 || aspectRatio === '9:16');
                const isShort = duration && duration <= 60;

                // If vertical or short duration, classify as YouTube Short
                if (isVertical || isShort) {
                    return 'short';
                }
                return 'video';
            }

            if (platform === 'instagram') return 'reel';
            if (platform === 'facebook') return 'video';
            if (platform === 'youtube') return 'video';
            if (platform === 'tiktok') return 'video';
        }

        // Check for carousel (multiple images)
        if (platform === 'instagram' && media.length > 1) {
            return 'carousel';
        }
    }

    return platformDefaults[platform] || 'feed';
}
