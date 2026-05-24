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

type AccountMetrics = typeof DEFAULT_ACCOUNT_METRICS;

function toMetricNumber(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

function createDefaultMetrics(lastSyncedAt?: string | null): AccountMetrics {
  return {
    ...DEFAULT_ACCOUNT_METRICS,
    lastSyncedAt: lastSyncedAt ?? null,
  };
}

function extractMetricValues(source: any) {
  const likes = toMetricNumber(source?.likes ?? source?.like_count);
  const comments = toMetricNumber(source?.comments ?? source?.comment_count);
  const shares = toMetricNumber(source?.shares ?? source?.share_count);
  const views = toMetricNumber(
    source?.views ??
    source?.video_views ??
    source?.view_count ??
    source?.impressions
  );
  const engagement = toMetricNumber(source?.engagement ?? source?.engagements) || likes + comments + shares;

  return {
    likes,
    comments,
    shares,
    views,
    engagement,
    engagementRate: toMetricNumber(source?.engagement_rate),
  };
}

async function getDirectAccountMetrics(
  supabase: any,
  workspaceId: string,
  accounts: Array<Record<string, any> & { id: string }>,
  startDate: string,
  endDate?: string
): Promise<Map<string, AccountMetrics>> {
  const metricsByAccount = new Map<string, AccountMetrics>();
  const accountIds = accounts.map((account) => account.id);

  accounts.forEach((account) => {
    metricsByAccount.set(account.id, createDefaultMetrics(account.last_synced_at));
  });

  if (accountIds.length === 0) {
    return metricsByAccount;
  }

  const entriesByKey = new Map<string, {
    accountId: string;
    publishedAt: string | null;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagement: number;
    engagementRate: number;
  }>();

  const upsertEntry = (
    key: string,
    entry: {
      accountId: string;
      publishedAt: string | null;
      likes?: number;
      comments?: number;
      shares?: number;
      views?: number;
      engagement?: number;
      engagementRate?: number;
    }
  ) => {
    const current = entriesByKey.get(key);
    if (!current) {
      entriesByKey.set(key, {
        accountId: entry.accountId,
        publishedAt: entry.publishedAt,
        likes: entry.likes ?? 0,
        comments: entry.comments ?? 0,
        shares: entry.shares ?? 0,
        views: entry.views ?? 0,
        engagement: entry.engagement ?? 0,
        engagementRate: entry.engagementRate ?? 0,
      });
      return;
    }

    entriesByKey.set(key, {
      ...current,
      publishedAt: current.publishedAt || entry.publishedAt,
      likes: Math.max(current.likes, entry.likes ?? 0),
      comments: Math.max(current.comments, entry.comments ?? 0),
      shares: Math.max(current.shares, entry.shares ?? 0),
      views: Math.max(current.views, entry.views ?? 0),
      engagement: Math.max(current.engagement, entry.engagement ?? 0),
      engagementRate: Math.max(current.engagementRate, entry.engagementRate ?? 0),
    });
  };

  try {
    let postsQuery = supabase
      .from('posts')
      .select('id, social_account_id, external_post_id, published_at')
      .eq('workspace_id', workspaceId)
      .in('social_account_id', accountIds)
      .in('status', ['published', 'partial'])
      .gte('published_at', startDate);

    if (endDate) {
      postsQuery = postsQuery.lte('published_at', endDate);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      console.warn('[Accounts] Failed to aggregate recent posts', postsError);
    }

    const postRows = posts || [];
    const postIds = postRows.map((post: any) => post.id).filter(Boolean);
    const analyticsByPostId = new Map<string, any>();

    if (postIds.length > 0) {
      const { data: analyticsRows, error: analyticsError } = await supabase
        .from('post_analytics')
        .select('post_id, likes, comments, shares, impressions, video_views, engagement, engagement_rate, fetched_at')
        .in('post_id', postIds)
        .order('fetched_at', { ascending: false });

      if (analyticsError) {
        console.warn('[Accounts] Failed to aggregate post analytics', analyticsError);
      }

      (analyticsRows || []).forEach((row: any) => {
        if (row.post_id && !analyticsByPostId.has(row.post_id)) {
          analyticsByPostId.set(row.post_id, row);
        }
      });
    }

    postRows.forEach((post: any) => {
      const accountId = post.social_account_id;
      if (!accountId) return;

      const analytics = analyticsByPostId.get(post.id);
      const values = extractMetricValues(analytics);
      const key = `${accountId}:${post.external_post_id || post.id}`;

      upsertEntry(key, {
        accountId,
        publishedAt: post.published_at,
        likes: values.likes,
        comments: values.comments,
        shares: values.shares,
        views: values.views,
        engagement: values.engagement,
        engagementRate: values.engagementRate,
      });
    });
  } catch (error) {
    console.warn('[Accounts] Direct post metrics aggregation failed', error);
  }

  try {
    let externalQuery = supabase
      .from('external_posts')
      .select('id, social_account_id, external_post_id, published_at, metrics')
      .eq('workspace_id', workspaceId)
      .in('social_account_id', accountIds)
      .gte('published_at', startDate);

    if (endDate) {
      externalQuery = externalQuery.lte('published_at', endDate);
    }

    const { data: externalPosts, error: externalError } = await externalQuery;

    if (externalError) {
      console.warn('[Accounts] Failed to aggregate external post metrics', externalError);
    }

    (externalPosts || []).forEach((post: any) => {
      const accountId = post.social_account_id;
      if (!accountId) return;

      const values = extractMetricValues(post.metrics);
      const key = `${accountId}:${post.external_post_id || post.id}`;

      upsertEntry(key, {
        accountId,
        publishedAt: post.published_at,
        likes: values.likes,
        comments: values.comments,
        shares: values.shares,
        views: values.views,
        engagement: values.engagement,
        engagementRate: values.engagementRate,
      });
    });
  } catch (error) {
    console.warn('[Accounts] External post metrics aggregation failed', error);
  }

  try {
    let platformPostsQuery = supabase
      .from('platform_posts')
      .select('id, post_id, social_account_id, platform_post_id, external_id, published_at')
      .in('social_account_id', accountIds)
      .eq('status', 'published')
      .gte('published_at', startDate);

    if (endDate) {
      platformPostsQuery = platformPostsQuery.lte('published_at', endDate);
    }

    const { data: platformPosts, error: platformPostsError } = await platformPostsQuery;

    if (platformPostsError) {
      console.warn('[Accounts] Failed to aggregate platform post metrics', platformPostsError);
    }

    (platformPosts || []).forEach((post: any) => {
      const accountId = post.social_account_id;
      if (!accountId) return;

      const key = `${accountId}:${post.platform_post_id || post.external_id || post.post_id || post.id}`;
      upsertEntry(key, {
        accountId,
        publishedAt: post.published_at,
      });
    });
  } catch (error) {
    console.warn('[Accounts] Platform post metrics aggregation failed', error);
  }

  entriesByKey.forEach((entry) => {
    const current = metricsByAccount.get(entry.accountId) ?? createDefaultMetrics();
    const lastPublishedAt =
      entry.publishedAt &&
        (!current.lastPublishedAt || new Date(entry.publishedAt) > new Date(current.lastPublishedAt))
        ? entry.publishedAt
        : current.lastPublishedAt;

    metricsByAccount.set(entry.accountId, {
      ...current,
      postsPublished: current.postsPublished + 1,
      totalLikes: current.totalLikes + entry.likes,
      totalComments: current.totalComments + entry.comments,
      totalShares: current.totalShares + entry.shares,
      totalEngagement: current.totalEngagement + entry.engagement,
      totalVideoViews: current.totalVideoViews + entry.views,
      avgEngagementRate: Math.max(current.avgEngagementRate, entry.engagementRate),
      lastPublishedAt,
    });
  });

  metricsByAccount.forEach((metrics, accountId) => {
    const entries = Array.from(entriesByKey.values()).filter((entry) => entry.accountId === accountId);
    const explicitRates = entries
      .map((entry) => entry.engagementRate)
      .filter((rate) => rate > 0);
    const calculatedRate = metrics.totalVideoViews > 0
      ? (metrics.totalEngagement / metrics.totalVideoViews) * 100
      : 0;

    metricsByAccount.set(accountId, {
      ...metrics,
      avgEngagementRate: explicitRates.length > 0
        ? explicitRates.reduce((sum, rate) => sum + rate, 0) / explicitRates.length
        : calculatedRate,
    });
  });

  return metricsByAccount;
}

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
  const defaultMetricsFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const directMetricsMap = await getDirectAccountMetrics(
    supabase,
    workspace.id,
    accountRows,
    metricsFrom ? new Date(metricsFrom).toISOString() : defaultMetricsFrom,
    metricsTo ? new Date(metricsTo).toISOString() : undefined
  );

  const enrichedAccounts = accountRows.map((account) => {
    const rpcMetrics = metricsMap.get(account.id) ?? createDefaultMetrics(account.last_synced_at);
    const directMetrics = directMetricsMap.get(account.id) ?? createDefaultMetrics(account.last_synced_at);

    return {
      ...sanitizeAccountResponse(account),
      metrics: {
        ...rpcMetrics,
        ...directMetrics,
        lastPublishedAt: directMetrics.lastPublishedAt ?? rpcMetrics.lastPublishedAt,
        lastSyncedAt:
          directMetrics.lastSyncedAt ??
          rpcMetrics.lastSyncedAt ??
          account.last_synced_at ??
          null,
      },
    };
  });

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
