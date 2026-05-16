import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  getPagination,
  APIError,
} from '@/lib/api-middleware';
import { decryptToken, encryptToken } from '@/lib/encryption';
import {
  enforceLimit,
  requireWorkspaceContext,
} from '@/lib/workspace-context';

const SAFE_ACCOUNT_SELECT = [
  'id',
  'workspace_id',
  'platform',
  'account_id',
  'account_name',
  'account_handle',
  'account_avatar',
  'token_expires_at',
  'connected_at',
  'is_active',
  'assigned_user_id',
  'follower_count',
  'last_synced_at',
  'metadata',
  'created_at',
  'updated_at',
].join(',');

const SENSITIVE_KEY_PATTERN = /(access_token|refresh_token|token|secret|authorization|api_key)/i;

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

function sanitizeAccountMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAccountMetadata);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, metadataValue]) => [key, sanitizeAccountMetadata(metadataValue)])
  );
}

function sanitizeAccountResponse<T extends Record<string, any>>(account: T) {
  const {
    access_token: _accessToken,
    refresh_token: _refreshToken,
    ...safeAccount
  } = account;

  return {
    ...safeAccount,
    metadata: sanitizeAccountMetadata(safeAccount.metadata),
  };
}

function encryptTokenIfNeeded(token: unknown): string | null | undefined {
  if (token === null || token === undefined) {
    return token;
  }

  if (typeof token !== 'string' || token.length === 0) {
    throw new APIError(400, 'Invalid token value', 'VALIDATION_ERROR');
  }

  try {
    decryptToken(token);
    return token;
  } catch {
    return encryptToken(token);
  }
}

function sanitizeWritableFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => key === 'token_expires_at' || !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, value]) => [
        key,
        key === 'metadata' ? sanitizeAccountMetadata(value) : value,
      ])
  );
}

/**
 * GET /api/accounts - List user's social accounts
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { page, limit, offset } = getPagination(request);
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
  });

  // Get social accounts
  const searchParams = request.nextUrl.searchParams;
  const platformFilter = searchParams.get('platform') || undefined;
  const statusFilter = searchParams.get('status') || undefined; // 'active' | 'inactive'
  const ownerFilter = searchParams.get('owner') || undefined; // 'me' | 'all'

  let accountsQuery = supabase
    .from('social_accounts')
    .select(SAFE_ACCOUNT_SELECT, { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .order('connected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platformFilter) {
    const platforms = platformFilter.split(',').map((platform) => platform.trim()).filter(Boolean);
    if (platforms.length > 1) {
      accountsQuery = accountsQuery.in('platform', platforms);
    } else if (platforms.length === 1) {
      accountsQuery = accountsQuery.eq('platform', platforms[0]);
    }
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

  const accountRows = (accounts || []) as unknown as Array<Record<string, any> & { id: string }>;
  const enrichedAccounts = accountRows.map((account) => ({
    ...sanitizeAccountResponse(account),
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
  const body = await request.json();
  const { platform, account_id, account_name, access_token, refresh_token, ...otherFields } = body;

  // Validate required fields
  if (!platform || !account_id || !account_name || !access_token) {
    throw new APIError(400, 'Missing required fields', 'VALIDATION_ERROR');
  }

  const { user, userClient: supabase, workspace, limits, usage } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });

  const encryptedAccessToken = encryptTokenIfNeeded(access_token);
  const encryptedRefreshToken = encryptTokenIfNeeded(refresh_token);
  const safeOtherFields = sanitizeWritableFields(otherFields);

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
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        is_active: true,
        updated_at: new Date().toISOString(),
        ...safeOtherFields
      })
      .eq('id', existing.id)
      .select(SAFE_ACCOUNT_SELECT)
      .single();

    if (updateError) {
      throw new APIError(500, updateError.message, 'DATABASE_ERROR');
    }

    return successResponse({
      account: sanitizeAccountResponse(updatedAccount),
      message: 'Account re-connected successfully',
    });
  }

  enforceLimit(
    usage.social_profiles_count,
    limits.max_social_profiles,
    `Social account limit reached for your ${limits.plan} plan`
  );

  // Create social account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .insert({
      workspace_id: workspace.id,
      platform,
      account_id,
      account_name,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      is_active: true,
      assigned_user_id: user.id,
      ...safeOtherFields
    })
    .select(SAFE_ACCOUNT_SELECT)
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ account: sanitizeAccountResponse(account) }, { page: 1, limit: 1, total: 1 });
});

/**
 * DELETE /api/accounts/:id - Disconnect a social account
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });

  const url = new URL(request.url);
  const accountId = url.searchParams.get('id') || url.pathname.split('/').pop();

  if (!accountId || accountId === 'accounts') {
    throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
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
