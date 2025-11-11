import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import {
  getInstagramComments,
  replyToInstagramComment,
} from '@/lib/oauth/instagram';

export const dynamic = 'force-dynamic';

async function ensureWorkspaceAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  userId: string
) {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if (!workspace) {
    throw new APIError(404, 'Workspace not found');
  }

  if (workspace.owner_id === userId) {
    return;
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!membership) {
    throw new APIError(403, 'You do not have access to this workspace');
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const mediaId = searchParams.get('mediaId');

    if (!accountId || !mediaId) {
      throw new APIError(400, 'accountId and mediaId are required');
    }

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from('social_accounts')
      .select('workspace_id, account_id, access_token, is_active')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    await ensureWorkspaceAccess(supabase, account.workspace_id, user.id);

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const comments = await getInstagramComments(mediaId, account.access_token);
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    return handleAPIError(error);
  }
}

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
    const { accountId, commentId, message } = body;

    if (!accountId || !commentId || !message) {
      throw new APIError(400, 'accountId, commentId, and message are required');
    }

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from('social_accounts')
      .select('workspace_id, account_id, access_token, is_active')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    await ensureWorkspaceAccess(supabase, account.workspace_id, user.id);

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const response = await replyToInstagramComment(commentId, account.access_token, message);
    return NextResponse.json({ success: true, response });
  } catch (error) {
    return handleAPIError(error);
  }
}



