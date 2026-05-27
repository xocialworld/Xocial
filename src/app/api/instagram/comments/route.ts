import { NextRequest, NextResponse } from 'next/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import {
  getInstagramGraphBaseUrl,
  getInstagramComments,
  replyToInstagramComment,
} from '@/lib/oauth/instagram';
import { decryptToken } from '@/lib/encryption';
import { recordLearningEvent } from '@/lib/intelligence/learning';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const { user, userClient: supabase, serviceClient, workspace } =
      await requireWorkspaceContext(request);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const mediaId = searchParams.get('mediaId');

    if (!accountId || !mediaId) {
      throw new APIError(400, 'accountId and mediaId are required');
    }

    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('workspace_id, account_id, access_token, metadata, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));
    const comments = await getInstagramComments(
      mediaId,
      decryptToken(account.access_token),
      baseUrl
    );
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, userClient: supabase, serviceClient, workspace } =
      await requireWorkspaceContext(request);

    const body = await request.json();
    const { accountId, commentId, message } = body;

    if (!accountId || !commentId || !message) {
      throw new APIError(400, 'accountId, commentId, and message are required');
    }

    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('workspace_id, account_id, access_token, metadata, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));
    const response = await replyToInstagramComment(
      commentId,
      decryptToken(account.access_token),
      message,
      baseUrl
    );
    await recordLearningEvent(serviceClient, {
      workspaceId: workspace.id,
      actorUserId: user.id,
      source: 'user',
      eventType: 'comment_replied',
      entityType: 'comment',
      entityId: commentId,
      platform: 'instagram',
      signalStrength: 0.45,
      metadata: {
        accountId,
        commentId,
        replyLength: message.length,
      },
    });
    return NextResponse.json({ success: true, response });
  } catch (error) {
    return handleAPIError(error);
  }
}
