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
      message,
      link,
      type = 'status',
      publishAt,
    }: {
      accountId?: string;
      message?: string;
      link?: string;
      type?: 'status' | 'link' | 'photo' | 'video';
      publishAt?: string;
    } = body;

    if (!accountId) {
      throw new APIError(400, 'accountId is required');
    }

    if (!message?.trim()) {
      throw new APIError(400, 'Message is required');
    }

    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('id, platform, workspace_id, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'facebook')
      .maybeSingle();

    if (accountError) {
      throw new APIError(500, accountError.message, 'DATABASE_ERROR');
    }

    if (!account || !account.is_active) {
      throw new APIError(404, 'Facebook Page account not found in this workspace');
    }

    const content: PlatformContent = {
      text: message.trim(),
    };

    if (type === 'link') {
      if (!link?.trim()) {
        throw new APIError(400, 'Link URL is required for link posts');
      }
      content.link = link.trim();
    }

    if (type === 'photo' || type === 'video') {
      if (!link?.trim()) {
        throw new APIError(400, `${type === 'photo' ? 'Photo' : 'Video'} URL is required`);
      }
      content.mediaUrls = [link.trim()];
      content.mediaType = type === 'video' ? 'VIDEO' : 'IMAGE';
    }

    const results = await platformPublisher.publishToAll({
      platforms: ['facebook'],
      accountIds: { facebook: accountId },
      content,
      scheduledFor: publishAt ? new Date(publishAt) : undefined,
    });

    const result = results[0];
    if (!result?.success) {
      throw new APIError(502, result?.error || 'Failed to publish Facebook post', 'PUBLISH_FAILED');
    }

    return NextResponse.json({
      success: true,
      postId: result.platformPostId,
      permalink: result.permalink,
      message: publishAt
        ? 'Facebook Page post scheduled successfully'
        : 'Facebook Page post published successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
