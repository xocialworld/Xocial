import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { decryptToken } from '@/lib/encryption';
import { getInstagramGraphBaseUrl, replyToInstagramComment } from '@/lib/oauth/instagram';
import { logger } from '@/lib/logger';

function getConnectedVia(metadata: any): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata)?.connected_via;
    } catch {
      return undefined;
    }
  }
  return metadata.connected_via;
}

/**
 * POST /api/instagram/comments/reply
 * Reply to an Instagram comment
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

  const body = await request.json();
  const { accountId, commentId, replyText } = body;

  if (!accountId || !commentId || !replyText) {
    throw new APIError(400, 'Missing required fields', 'MISSING_FIELDS');
  }

  try {
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account) {
      throw new APIError(404, 'Instagram account not found', 'ACCOUNT_NOT_FOUND');
    }

    const accessToken = decryptToken(account.access_token);
    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));

    const result = await replyToInstagramComment(commentId, accessToken, replyText, baseUrl);

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
    if (error instanceof APIError) {
      throw error;
    }

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
