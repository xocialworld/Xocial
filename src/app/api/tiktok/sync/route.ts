import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import {
    performFullTikTokSync,
    syncTikTokVideos,
    syncTikTokAnalytics,
    syncTikTokProfile,
} from '@/lib/tiktok-sync';
import { logger } from '@/lib/logger';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user } = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type') || 'full';

    if (!accountId) {
        throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
    }

    try {
        let result: any;

        switch (type) {
            case 'full':
                result = await performFullTikTokSync(accountId);
                break;
            case 'videos':
                result = await syncTikTokVideos(accountId);
                break;
            case 'analytics':
                result = await syncTikTokAnalytics(accountId);
                break;
            case 'profile':
                result = await syncTikTokProfile(accountId);
                break;
            default:
                throw new APIError(400, 'Invalid sync type', 'INVALID_SYNC_TYPE');
        }

        logger.info(`[TikTok Sync API] Completed ${type} sync for account ${accountId}`);

        return NextResponse.json({
            success: true,
            data: { syncType: type, result },
        });
    } catch (error: any) {
        logger.error(`[TikTok Sync API] Error:`, error);
        throw new APIError(500, `Sync failed: ${error.message}`, 'SYNC_FAILED');
    }
});

export const runtime = 'nodejs';
export const maxDuration = 300;
