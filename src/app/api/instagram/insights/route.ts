import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import {
  getInstagramAccountInsights,
  getInstagramMediaInsights,
} from '@/lib/oauth/instagram';

export const dynamic = 'force-dynamic';

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
    const period = (searchParams.get('period') as 'day' | 'week' | 'days_28') || 'day';

    if (!accountId) {
      throw new APIError(400, 'accountId is required');
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

    if (mediaId) {
      const insights = await getInstagramMediaInsights(mediaId, account.access_token);
      return NextResponse.json({ success: true, scope: 'media', mediaId, insights });
    }

    const insights = await getInstagramAccountInsights(
      account.account_id,
      account.access_token,
      period
    );
    return NextResponse.json({
      success: true,
      scope: 'account',
      period,
      insights,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}


