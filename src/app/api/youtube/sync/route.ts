import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import {
    performFullYouTubeSync,
    syncYouTubeVideos,
    syncYouTubeAnalytics,
    syncYouTubeComments,
    syncYouTubeChannel,
} from '@/lib/youtube-sync';
import { logger } from '@/lib/logger';

/**
 * POST /api/youtube/sync
 * Trigger YouTube data synchronization
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 * - type: 'full' | 'videos' | 'analytics' | 'comments' | 'channel'
 * - postId?: string (required for type='comments')
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user } = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type') || 'full';
    const postId = searchParams.get('postId');

    if (!accountId) {
        throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
    }

    const validTypes = ['full', 'videos', 'analytics', 'comments', 'channel'];
    if (!validTypes.includes(type)) {
        throw new APIError(400, `Invalid sync type. Must be one of: ${validTypes.join(', ')}`, 'INVALID_SYNC_TYPE');
    }

    if (type === 'comments' && !postId) {
        throw new APIError(400, 'postId parameter is required for comments sync', 'MISSING_POST_ID');
    }

    try {
        logger.info(`[YouTube Sync API] Starting ${type} sync for account ${accountId}`, {
            userId: user.id,
            accountId,
            type,
        });

        let result: any;

        switch (type) {
            case 'full':
                result = await performFullYouTubeSync(accountId);
                break;

            case 'videos':
                result = await syncYouTubeVideos(accountId);
                break;

            case 'analytics':
                result = await syncYouTubeAnalytics(accountId);
                break;

            case 'comments':
                if (!postId) {
                    throw new APIError(400, 'postId is required for comments sync', 'MISSING_POST_ID');
                }
                result = await syncYouTubeComments(postId);
                break;

            case 'channel':
                result = await syncYouTubeChannel(accountId);
                break;

            default:
                throw new APIError(400, 'Invalid sync type', 'INVALID_SYNC_TYPE');
        }

        logger.info(`[YouTube Sync API] Completed ${type} sync for account ${accountId}`, {
            userId: user.id,
            accountId,
            type,
            result,
        });

        return NextResponse.json({
            success: true,
            data: {
                syncType: type,
                result,
            },
        });
    } catch (error: any) {
        logger.error(`[YouTube Sync API] Error during ${type} sync:`, error, {
            userId: user.id,
            accountId,
            type,
        });

        // Check for specific YouTube API errors
        if (error.message?.includes('quota')) {
            throw new APIError(429, 'YouTube API quota exceeded. Please try again later.', 'QUOTA_EXCEEDED');
        }

        if (error.message?.includes('401') || error.message?.includes('invalid credentials')) {
            throw new APIError(401, 'YouTube authentication failed. Please reconnect your account.', 'AUTH_FAILED');
        }

        throw new APIError(500, `Sync failed: ${error.message}`, 'SYNC_FAILED');
    }
});

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large syncs
