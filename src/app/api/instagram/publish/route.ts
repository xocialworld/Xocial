import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import {
  createInstagramMediaContainer,
  publishInstagramMedia,
} from '@/lib/oauth/instagram';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const body = await request.json();
    const {
      accountId,
      caption,
      mediaUrl,
      mediaUrls,
      mediaType,
      publishAt,
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

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from('social_accounts')
      .select('workspace_id, account_id, account_name, access_token, metadata, is_active')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    // Verify workspace access (owners are not stored in workspace_members, so check both)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', account.workspace_id)
      .single();

    if (!workspace) {
      throw new APIError(404, 'Workspace not found');
    }

    if (workspace.owner_id !== user.id) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', account.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        throw new APIError(403, 'You do not have access to this workspace');
      }
    }

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const primaryMedia = mediaSources[0];
    const isVideo =
      mediaType === 'VIDEO' ||
      primaryMedia.toLowerCase().includes('.mp4') ||
      primaryMedia.toLowerCase().includes('video');

    const containerResponse = await createInstagramMediaContainer(account.account_id, account.access_token, {
      caption: caption || '',
      ...(isVideo ? { video_url: primaryMedia } : { image_url: primaryMedia }),
    });

    const publishResult = await publishInstagramMedia(
      account.account_id,
      account.access_token,
      containerResponse.id,
      publishAt ? new Date(publishAt) : undefined
    );

    return NextResponse.json({
      success: true,
      postId: publishResult.id,
      message: publishAt
        ? 'Instagram post scheduled successfully'
        : 'Instagram post published successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}


