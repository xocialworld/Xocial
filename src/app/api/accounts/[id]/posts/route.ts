import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    successResponse,
    APIError,
} from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getYouTubeChannelVideos, getYouTubeVideoStats } from '@/lib/oauth/youtube';

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
        .select('id, platform, workspace_id, account_id, access_token')
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

    // Fetch posts published for this specific social account
    let query = supabase
        .from('posts')
        .select(`
      id,
      content,
      media,
      platforms,
      workspace_id,
      metadata,
      status,
      published_at,
      scheduled_at,
      created_at,
      external_post_id
    `)
        .eq('social_account_id', account.id)
        .eq('status', 'published')
        .contains('platforms', [platform])
        .order('published_at', { ascending: false })
        .limit(limit + 1);

    if (postType && postType !== 'all') {
        query = query.contains('metadata', { post_type: postType });
    }

    // Apply cursor-based pagination
    if (cursor) {
        query = query.lt('published_at', cursor);
    }

    const { data: postsRows, error: postsError } = await query;

    if (postsError) {
        throw new APIError(500, postsError.message, 'DATABASE_ERROR');
    }

    // Fallback: If no stored posts yet and platform supports external fetch, hydrate from API for display
    let hydratedRows = postsRows || [];
    if ((!hydratedRows || hydratedRows.length === 0) && platform === 'youtube') {
        // Attempt lightweight hydration from YouTube for all-time view
        try {
            const accessToken = decryptToken(account.access_token);
            const videos = await getYouTubeChannelVideos(accessToken, account.account_id, limit);
            const enriched = [] as any[];
            for (const item of videos) {
                const vid = (item.id as any)?.videoId;
                if (!vid) continue;
                try {
                    const details = await getYouTubeVideoStats(accessToken, vid);
                    const durationStr = details.contentDetails?.duration || '';
                    const durationSec = (() => {
                        const m = durationStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
                        if (!m) return 0;
                        const h = parseInt((m[1] || '').replace('H', '')) || 0;
                        const mi = parseInt((m[2] || '').replace('M', '')) || 0;
                        const s = parseInt((m[3] || '').replace('S', '')) || 0;
                        return h * 3600 + mi * 60 + s;
                    })();
                    const isShort = durationSec > 0 && durationSec <= 60;
                    enriched.push({
                        id: vid,
                        content: { caption: details.snippet.title },
                        media: [{ type: 'video', url: details.snippet.thumbnails?.high?.url || details.snippet.thumbnails?.default?.url }],
                        platforms: ['youtube'],
                        workspace_id: account.workspace_id,
                        metadata: { post_type: isShort ? 'short' : 'video' },
                        status: 'published',
                        published_at: details.snippet.publishedAt,
                        scheduled_at: null,
                        created_at: details.snippet.publishedAt,
                        external_post_id: vid,
                    });
                } catch {}
            }
            hydratedRows = enriched;
        } catch {}
    }

    const postIds = (hydratedRows || []).map((p: any) => p.id).filter(Boolean);

    const { data: analyticsRows } = await supabase
        .from('post_analytics')
        .select('post_id, platform, likes, comments, shares, impressions, saves, video_views')
        .in('post_id', postIds)
        .eq('platform', platform);

    const analyticsMap = new Map<string, any>();
    (analyticsRows || []).forEach((row: any) => {
        analyticsMap.set(`${row.post_id}:${row.platform}`, row);
    });

    let postsWithMetrics = await Promise.all((hydratedRows || []).map(async (post: any) => {
        const extractedPostType = post?.metadata?.post_type ||
            inferPostTypeFromPlatform(platform, post?.media);

        const key = `${post?.id}:${platform}`;
        let analytics = analyticsMap.get(key);

        let metrics = analytics ? {
            likes: analytics.likes || 0,
            comments: analytics.comments || 0,
            shares: analytics.shares || 0,
            views: analytics.video_views ?? analytics.impressions ?? 0,
            saves: analytics.saves || 0,
        } : undefined;

        if (!metrics && platform === 'youtube') {
            const vid = post.external_post_id || (Array.isArray(post.media) ? (post.media[0]?.videoId || post.media[0]?.id) : undefined);
            if (vid && account.access_token) {
                try {
                    const accessToken = decryptToken(account.access_token);
                    const details = await getYouTubeVideoStats(accessToken, vid);
                    metrics = {
                        likes: parseInt(details.statistics?.likeCount || '0'),
                        comments: parseInt(details.statistics?.commentCount || '0'),
                        shares: 0,
                        saves: 0,
                        views: parseInt(details.statistics?.viewCount || '0'),
                    };
                    if (!post.media || post.media.length === 0) {
                        post.media = [{ type: 'video', url: details.snippet.thumbnails?.high?.url || details.snippet.thumbnails?.default?.url }];
                    }
                } catch {}
            }
        }

        metrics = metrics || {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            saves: 0,
        };

        return {
            id: post.id,
            platform,
            post_type: extractedPostType,
            content: post?.content || {},
            media: post?.media || [],
            metrics,
            published_at: post.published_at,
            scheduled_at: post.scheduled_at,
            created_at: post.created_at,
            metadata: post.metadata,
            external_post_id: post.external_post_id,
        };
    }));

    // Deduplicate by external_post_id when present, otherwise by id
    const uniqueMap = new Map<string, any>();
    for (const p of postsWithMetrics) {
        const key = p.external_post_id || p.id;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
        }
    }
    postsWithMetrics = Array.from(uniqueMap.values());

    if (postType && postType !== 'all') {
        postsWithMetrics = postsWithMetrics.filter((post) => post.post_type === postType);
    }

    // Apply pagination after filtering
    const hasMore = postsWithMetrics.length > limit;
    const paginatedPosts = hasMore ? postsWithMetrics.slice(0, limit) : postsWithMetrics;

    // Get next cursor (last post's published_at)
    const nextCursor = hasMore && paginatedPosts.length > 0
        ? paginatedPosts[paginatedPosts.length - 1].published_at
        : null;

    return NextResponse.json({
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
