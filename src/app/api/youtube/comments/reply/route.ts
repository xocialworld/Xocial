import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { decryptToken } from '@/lib/encryption';
import { replyToYouTubeComment } from '@/lib/oauth/youtube';
import { logger } from '@/lib/logger';
import { recordLearningEvent } from '@/lib/intelligence/learning';

/**
 * POST /api/youtube/comments/reply
 * Reply to a YouTube comment
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const { user, userClient: supabase, serviceClient, workspace } =
        await requireWorkspaceContext(request);

    const body = await request.json();
    const { accountId, commentId, replyText } = body;

    if (!accountId || !commentId || !replyText) {
        throw new APIError(400, 'Missing required fields', 'MISSING_FIELDS');
    }

    try {
        // Get account
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('workspace_id', workspace.id)
            .eq('platform', 'youtube')
            .single();

        if (accountError || !account) {
            throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
        }

        // Decrypt access token
        const accessToken = decryptToken(account.access_token);

        // Reply to comment via YouTube API
        const result = await replyToYouTubeComment(accessToken, commentId, replyText);

        await recordLearningEvent(serviceClient, {
            workspaceId: workspace.id,
            actorUserId: user.id,
            source: 'user',
            eventType: 'comment_replied',
            entityType: 'comment',
            entityId: commentId,
            platform: 'youtube',
            signalStrength: 0.45,
            metadata: {
                accountId,
                commentId,
                replyLength: replyText.length,
            },
        });

        logger.info('[YouTube Comment Reply] Reply sent successfully', {
            userId: user.id,
            accountId,
            commentId,
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        if (error instanceof APIError) {
            throw error;
        }

        logger.error('[YouTube Comment Reply] Error:', error, {
            userId: user.id,
            accountId,
            commentId,
        });

        throw new APIError(500, `Failed to send reply: ${error.message}`, 'REPLY_FAILED');
    }
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
