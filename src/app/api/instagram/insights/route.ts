import { NextRequest, NextResponse } from 'next/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import {
  getInstagramAccountInsights,
  getInstagramMediaInsights,
} from '@/lib/oauth/instagram';
import { decryptToken } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

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
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found');
    }

    if (!account.access_token) {
      throw new APIError(400, 'Instagram account is missing an access token');
    }

    const accessToken = decryptToken(account.access_token);

    if (mediaId) {
      const insights = await getInstagramMediaInsights(mediaId, accessToken);
      return NextResponse.json({ success: true, scope: 'media', mediaId, insights });
    }

    const insights = await getInstagramAccountInsights(
      account.account_id,
      accessToken,
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

