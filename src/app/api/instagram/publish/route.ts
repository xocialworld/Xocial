import { NextRequest, NextResponse } from 'next/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { platformPublisher, type PlatformContent } from '@/lib/platforms/publisher';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { serviceClient, workspace } = await requireWorkspaceContext(request, {
      roles: ['owner', 'admin', 'manager', 'creator'],
    });

    const body = await request.json();
    const {
      accountId,
      caption,
      mediaUrl,
      mediaUrls,
      mediaType,
    } = body;

    if (!accountId) {
      throw new APIError(400, 'accountId is required');
    }

    const mediaSources: string[] = mediaUrls?.length
      ? mediaUrls
      : mediaUrl
      ? [mediaUrl]
      : [];

    if (mediaSources.length === 0) {
      throw new APIError(400, 'At least one mediaUrl is required for Instagram publishing');
    }

    if (mediaSources.length > 10) {
      throw new APIError(400, 'Instagram carousels support up to 10 media URLs');
    }

    if (mediaType === 'CAROUSEL_ALBUM' && mediaSources.length < 2) {
      throw new APIError(400, 'Instagram carousel publishing requires at least two media URLs');
    }

    const {
      data: account,
      error: accountError,
    } = await serviceClient
      .from('social_accounts')
      .select('id, workspace_id, platform, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found in this workspace');
    }

    const content: PlatformContent = {
      text: caption || '',
      mediaUrls: mediaSources,
      mediaType: mediaSources.length > 1 ? 'CAROUSEL_ALBUM' : mediaType,
    };

    const results = await platformPublisher.publishToAll({
      platforms: ['instagram'],
      accountIds: { instagram: accountId },
      content,
    });

    const result = results[0];
    if (!result?.success) {
      throw new APIError(502, result?.error || 'Failed to publish Instagram post', 'PUBLISH_FAILED');
    }

    return NextResponse.json({
      success: true,
      postId: result.platformPostId,
      message: 'Instagram post published successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
