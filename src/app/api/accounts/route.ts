import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getWorkspaceFromRequest,
  getPagination,
  APIError,
  checkWorkspaceAccess,
} from '@/lib/api-middleware';

type AccountMetricsRow = {
  social_account_id: string | null;
  platform: string | null;
  posts_published: number | null;
  total_likes: number | null;
  total_comments: number | null;
  total_shares: number | null;
  total_engagement: number | null;
  avg_engagement_rate: number | null;
  last_published_at: string | null;
  last_synced_at: string | null;
  total_video_views: number | null;
};

const DEFAULT_ACCOUNT_METRICS = {
  postsPublished: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalEngagement: 0,
  avgEngagementRate: 0,
  lastPublishedAt: null as string | null,
  lastSyncedAt: null as string | null,
  totalVideoViews: 0,
};

/**
 * GET /api/accounts - List user's social accounts
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const { page, limit, offset } = getPagination(request);

  // Get user's workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
    throw new APIError(403, 'You do not have permission to view accounts', 'FORBIDDEN');
  }

  // Get social accounts
  const searchParams = request.nextUrl.searchParams;
  const platformFilter = searchParams.get('platform') || undefined;
  const statusFilter = searchParams.get('status') || undefined; // 'active' | 'inactive'
  const ownerFilter = searchParams.get('owner') || undefined; // 'me' | 'all'

  let accountsQuery = supabase
    .from('social_accounts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .order('connected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platformFilter) {
    accountsQuery = accountsQuery.eq('platform', platformFilter);
  }

  if (statusFilter === 'active') {
    accountsQuery = accountsQuery.eq('is_active', true);
  } else if (statusFilter === 'inactive') {
    accountsQuery = accountsQuery.eq('is_active', false);
  }

  if (ownerFilter === 'me') {
    accountsQuery = accountsQuery.eq('assigned_user_id', user.id);
  }

  const { data: accounts, error, count } = await accountsQuery;

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  // Fetch aggregated metrics for accounts in this workspace

  const metricsArgs: Record<string, string> = {
    workspace_uuid: workspace.id,
  };

  const metricsFrom = searchParams.get('metricsFrom');
  const metricsTo = searchParams.get('metricsTo');

  if (metricsFrom) {
    metricsArgs.start_date = new Date(metricsFrom).toISOString();
  }
  if (metricsTo) {
    metricsArgs.end_date = new Date(metricsTo).toISOString();
  }

  // We need to handle the case where the RPC might not exist or fail gracefully
  let metricsMap = new Map<string, typeof DEFAULT_ACCOUNT_METRICS>();

  try {
    const { data: metricsData, error: metricsError } = await supabase.rpc(
      'get_workspace_account_metrics',
      metricsArgs
    );

    if (!metricsError && metricsData) {
      const metricsRows = (metricsData ?? []) as AccountMetricsRow[];
      metricsRows.forEach((row) => {
        if (!row.social_account_id) return;
        metricsMap.set(row.social_account_id, {
          postsPublished: row.posts_published ?? 0,
          totalLikes: row.total_likes ?? 0,
          totalComments: row.total_comments ?? 0,
          totalShares: row.total_shares ?? 0,
          totalEngagement: row.total_engagement ?? 0,
          avgEngagementRate: row.avg_engagement_rate ?? 0,
          lastPublishedAt: row.last_published_at,
          lastSyncedAt: row.last_synced_at,
          totalVideoViews: row.total_video_views ?? 0,
        });
      });
    }
  } catch (e) {
    console.warn('Failed to fetch metrics, continuing without them', e);
  }

  const enrichedAccounts = (accounts || []).map((account) => ({
    ...account,
    metrics: metricsMap.get(account.id) ?? { ...DEFAULT_ACCOUNT_METRICS },
  }));

  return successResponse(
    {
      accounts: enrichedAccounts,
    },
    {
      page,
      limit,
      total: count || 0,
    }
  );
});

/**
 * POST /api/accounts - Create/connect a new social account
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const { platform, account_id, account_name, access_token, refresh_token, ...otherFields } = body;

  // Validate required fields
  if (!platform || !account_id || !account_name || !access_token) {
    throw new APIError(400, 'Missing required fields', 'VALIDATION_ERROR');
  }

  // Get user's workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin'].includes(role)) {
    throw new APIError(403, 'You do not have permission to connect accounts', 'FORBIDDEN');
  }

  // Check if THIS specific account already exists in THIS workspace
  // We allow multiple accounts of the same platform, but not the EXACT SAME account twice.
  const { data: existing } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('platform', platform)
    .eq('account_id', account_id)
    .single();

  if (existing) {
    // If it exists, we update it instead of throwing error, to allow re-connecting/refreshing tokens
    const { data: updatedAccount, error: updateError } = await supabase
      .from('social_accounts')
      .update({
        account_name,
        access_token,
        refresh_token,
        is_active: true,
        updated_at: new Date().toISOString(),
        ...otherFields
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      throw new APIError(500, updateError.message, 'DATABASE_ERROR');
    }

    return successResponse({ account: updatedAccount, message: 'Account re-connected successfully' });
  }

  // Create social account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .insert({
      workspace_id: workspace.id,
      platform,
      account_id,
      account_name,
      access_token,
      refresh_token,
      is_active: true,
      assigned_user_id: user.id,
      ...otherFields
    })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ account }, { page: 1, limit: 1, total: 1 });
});

/**
 * DELETE /api/accounts/:id - Disconnect a social account
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const url = new URL(request.url);
  const accountId = url.pathname.split('/').pop();

  if (!accountId) {
    throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
  }

  // Get user's workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  // Verify permission
  const role = await checkWorkspaceAccess(user.id, workspace.id);
  if (!['owner', 'admin'].includes(role)) {
    throw new APIError(403, 'You do not have permission to disconnect accounts', 'FORBIDDEN');
  }

  // Deactivate the account (soft delete) or hard delete?
  // SRS says "status IN ('active', ... 'disconnected')"
  // But codebase uses 'is_active' boolean. I will stick to 'is_active' for now as per previous code,
  // but maybe I should update status text too if it exists.
  // Let's check if 'status' column exists in the previous code's GET...
  // The previous code used 'is_active'.
  // I will update 'is_active' to false.

  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('workspace_id', workspace.id);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ message: 'Account disconnected successfully' });
});
