import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import {
    performFullFacebookSync,
    syncFacebookPosts,
    syncFacebookAnalytics,
    syncFacebookComments,
    syncFacebookPage,
} from '@/lib/facebook-sync';
import { logger } from '@/lib/logger';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user } = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type') || 'full';
    const postId = searchParams.get('postId');

    if (!accountId) {
        throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
    }

    try {
        let result: any;

        switch (type) {
            case 'full':
                result = await performFullFacebookSync(accountId);
                break;
            case 'posts':
                result = await syncFacebookPosts(accountId);
                break;
            case 'analytics':
                result = await syncFacebookAnalytics(accountId);
                break;
            case 'comments':
                if (!postId) throw new APIError(400, 'postId is required for comments sync', 'MISSING_POST_ID');
                result = await syncFacebookComments(postId);
                break;
            case 'page':
                result = await syncFacebookPage(accountId);
                break;
            default:
                throw new APIError(400, 'Invalid sync type', 'INVALID_SYNC_TYPE');
        }

        logger.info(`[Facebook Sync API] Completed ${type} sync for account ${accountId}`);

        return NextResponse.json({
            success: true,
            data: { syncType: type, result },
        });
    } catch (error: any) {
        logger.error(`[Facebook Sync API] Error:`, error);
        throw new APIError(500, `Sync failed: ${error.message}`, 'SYNC_FAILED');
    }
});

export const runtime = 'nodejs';
export const maxDuration = 300;
