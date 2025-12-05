import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { replyToInstagramComment } from '@/lib/oauth/instagram';
import { logger } from '@/lib/logger';

/**
 * POST /api/instagram/comments/reply
 * Reply to an Instagram comment
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user } = await requireAuth(request);

    const body = await request.json();
    const { accountId, commentId, replyText } = body;

    if (!accountId || !commentId || !replyText) {
        throw new APIError(400, 'Missing required fields', 'MISSING_FIELDS');
    }

    try {
        const supabase = await createClient();

        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'instagram')
            .single();

        if (accountError || !account) {
            throw new APIError(404, 'Instagram account not found', 'ACCOUNT_NOT_FOUND');
        }

        const accessToken = decryptToken(account.access_token);

        const result = await replyToInstagramComment(commentId, accessToken, replyText);

        logger.info('[Instagram Comment Reply] Reply sent successfully', {
            userId: user.id,
            accountId,
            commentId,
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        logger.error('[Instagram Comment Reply] Error:', error, {
            userId: user.id,
            accountId,
            commentId,
        });

        throw new APIError(500, `Failed to send reply: ${error.message}`, 'REPLY_FAILED');
    }
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
