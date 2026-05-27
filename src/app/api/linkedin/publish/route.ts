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
      text,
      visibility = 'PUBLIC',
      mediaUrl,
      mediaUrls,
      mediaType,
      link,
    }: {
      accountId?: string;
      text?: string;
      visibility?: 'PUBLIC' | 'CONNECTIONS';
      mediaUrl?: string;
      mediaUrls?: string[];
      mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM';
      link?: string;
    } = body;

    if (!accountId) {
      throw new APIError(400, 'accountId is required');
    }

    const trimmedText = text?.trim() || '';
    if (!trimmedText) {
      throw new APIError(400, 'Post text is required');
    }

    if (trimmedText.length > 3000) {
      throw new APIError(400, 'LinkedIn posts cannot exceed 3000 characters');
    }

    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('id, workspace_id, platform, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'linkedin')
      .maybeSingle();

    if (accountError) {
      throw new APIError(500, accountError.message, 'DATABASE_ERROR');
    }

    if (!account || !account.is_active) {
      throw new APIError(404, 'LinkedIn account not found in this workspace');
    }

    const mediaSources: string[] = mediaUrls?.length
      ? mediaUrls
      : mediaUrl
      ? [mediaUrl]
      : [];

    if (mediaSources.length > 9) {
      throw new APIError(400, 'LinkedIn supports up to 9 images per post');
    }

    const content: PlatformContent = {
      text: trimmedText,
      mediaUrls: mediaSources.length ? mediaSources : undefined,
      mediaType,
      link: link?.trim() || undefined,
    };

    const results = await platformPublisher.publishToAll({
      platforms: ['linkedin'],
      accountIds: { linkedin: accountId },
      content,
      platformStates: {
        linkedin: { visibility },
      },
    });

    const result = results[0];
    if (!result?.success) {
      throw new APIError(502, result?.error || 'Failed to publish LinkedIn post', 'PUBLISH_FAILED');
    }

    return NextResponse.json({
      success: true,
      postId: result.platformPostId,
      permalink: result.permalink,
      message: 'LinkedIn post published successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
