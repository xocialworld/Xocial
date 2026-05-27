import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import {
    performFullTwitterSync,
    syncTwitterTweets,
    syncTwitterAnalytics,
    syncTwitterProfile,
} from '@/lib/twitter-sync';
import { logger } from '@/lib/logger';
import {
    isTwitterApiCreditsRequiredError,
    TWITTER_CREDITS_REQUIRED_CODE,
} from '@/lib/twitter-api-mode';

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
                result = await performFullTwitterSync(accountId);
                break;
            case 'tweets':
                result = await syncTwitterTweets(accountId);
                break;
            case 'analytics':
                result = await syncTwitterAnalytics(accountId);
                break;
            case 'profile':
                result = await syncTwitterProfile(accountId);
                break;
            default:
                throw new APIError(400, 'Invalid sync type', 'INVALID_SYNC_TYPE');
        }

        logger.info(`[Twitter Sync API] Completed ${type} sync for account ${accountId}`);

        return NextResponse.json({
            success: true,
            data: { syncType: type, result },
        });
    } catch (error: any) {
        logger.error(`[Twitter Sync API] Error:`, error);
        if (isTwitterApiCreditsRequiredError(error)) {
            throw new APIError(402, error.message, TWITTER_CREDITS_REQUIRED_CODE);
        }
        throw new APIError(500, `Sync failed: ${error.message}`, 'SYNC_FAILED');
    }
});

export const runtime = 'nodejs';
export const maxDuration = 300;
