import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import {
    performFullLinkedInSync,
    syncLinkedInPosts,
    syncLinkedInAnalytics,
    syncLinkedInProfile,
} from '@/lib/linkedin-sync';
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
                result = await performFullLinkedInSync(accountId);
                break;
            case 'posts':
                result = await syncLinkedInPosts(accountId);
                break;
            case 'analytics':
                result = await syncLinkedInAnalytics(accountId);
                break;
            case 'profile':
                result = await syncLinkedInProfile(accountId);
                break;
            default:
                throw new APIError(400, 'Invalid sync type', 'INVALID_SYNC_TYPE');
        }

        logger.info(`[LinkedIn Sync API] Completed ${type} sync for account ${accountId}`);

        return NextResponse.json({
            success: true,
            data: { syncType: type, result },
        });
    } catch (error: any) {
        logger.error(`[LinkedIn Sync API] Error:`, error);
        throw new APIError(500, `Sync failed: ${error.message}`, 'SYNC_FAILED');
    }
});

export const runtime = 'nodejs';
export const maxDuration = 300;
