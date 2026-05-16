import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APIError,
  createServiceRoleClient,
  requireAuth,
} from '@/lib/api-middleware';

export const WORKSPACE_ROLES = [
  'owner',
  'admin',
  'manager',
  'creator',
  'analyst',
  'client',
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const ROLE_ALIASES: Record<string, WorkspaceRole> = {
  editor: 'creator',
  viewer: 'analyst',
  member: 'creator',
  guest: 'client',
};

const ROLE_LEVEL: Record<WorkspaceRole, number> = {
  client: 0,
  analyst: 1,
  creator: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

const DEFAULT_FREE_LIMITS = {
  plan: 'free',
  max_users: 1,
  max_workspaces: 1,
  max_social_profiles: 3,
  max_scheduled_posts: 10,
  ai_enabled: false,
  advanced_analytics: false,
  approval_workflows: false,
  engagement_inbox: false,
  custom_branding: false,
};

export type WorkspaceContext = {
  user: Awaited<ReturnType<typeof requireAuth>>['user'];
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  workspace: any;
  workspaceId: string;
  role: WorkspaceRole;
  account: any | null;
  subscription: any | null;
  limits: typeof DEFAULT_FREE_LIMITS & Record<string, any>;
  usage: {
    users_count: number;
    workspaces_count: number;
    social_profiles_count: number;
    scheduled_posts_count: number;
  };
};

export type WorkspaceContextOptions = {
  roles?: WorkspaceRole[];
  allowOnboardingFallback?: boolean;
  workspaceId?: string | null;
};

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  if (!role) return 'client';
  if ((WORKSPACE_ROLES as readonly string[]).includes(role)) {
    return role as WorkspaceRole;
  }
  return ROLE_ALIASES[role] ?? 'client';
}

export function roleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}

export function assertWorkspaceRole(role: WorkspaceRole, allowed: WorkspaceRole[]) {
  if (!allowed.includes(role)) {
    throw new APIError(403, 'You do not have permission in this workspace', 'FORBIDDEN', {
      role,
      allowed,
    });
  }
}

export function getWorkspaceIdFromRequest(request: NextRequest) {
  return (
    request.nextUrl.searchParams.get('workspaceId') ||
    request.nextUrl.searchParams.get('workspace_id') ||
    request.headers.get('x-workspace-id') ||
    null
  );
}

function accountSlugFor(userId: string, name: string) {
  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'account';
  return `${slugBase}-${userId.replace(/-/g, '').slice(0, 8)}`;
}

function isMissingAccountSchemaError(error: any) {
  const code = error?.code;
  const message = String(error?.message || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST205' ||
    message.includes("Could not find the table 'public.accounts'") ||
    message.includes("Could not find the 'account_id' column")
  );
}

export async function ensureAccountForUser(
  serviceClient: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: any },
  preferredName?: string
) {
  const { data: existing, error: existingError } = await serviceClient
    .from('accounts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError && !isMissingAccountSchemaError(existingError)) {
    throw new APIError(500, existingError.message, 'DATABASE_ERROR');
  }

  if (isMissingAccountSchemaError(existingError)) {
    return null;
  }

  if (existing) {
    await serviceClient
      .from('account_members')
      .upsert(
        { account_id: existing.id, user_id: user.id, role: 'owner' },
        { onConflict: 'account_id,user_id' }
      );
    return existing;
  }

  const name =
    preferredName ||
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    (user.email ? `${user.email.split('@')[0]}'s Account` : 'Xocial Account');

  const { data: account, error } = await serviceClient
    .from('accounts')
    .insert({
      owner_id: user.id,
      name,
      slug: accountSlugFor(user.id, name),
    })
    .select()
    .single();

  if (error || !account) {
    if ((error as any)?.code === '42P01') {
      return null;
    }
    throw new APIError(500, error?.message || 'Unable to create account', 'DATABASE_ERROR');
  }

  await serviceClient
    .from('account_members')
    .upsert(
      { account_id: account.id, user_id: user.id, role: 'owner' },
      { onConflict: 'account_id,user_id' }
    );

  return account;
}

async function ensureDefaultWorkspace(userId: string, userClient: SupabaseClient) {
  const { getUserWorkspace } = await import('@/lib/api-middleware');
  return getUserWorkspace(userId, userClient);
}

async function getPlanForWorkspace(serviceClient: SupabaseClient, workspace: any) {
  const accountId = workspace.account_id as string | undefined;

  let subscriptionQuery = serviceClient
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (accountId) {
    subscriptionQuery = subscriptionQuery.eq('account_id', accountId);
  } else {
    subscriptionQuery = subscriptionQuery.eq('workspace_id', workspace.id);
  }

  const { data } = await subscriptionQuery.maybeSingle();
  const { data: planLimits } = await serviceClient
    .from('plan_limits')
    .select('*')
    .eq('plan', data?.plan ?? 'free')
    .maybeSingle();
  const limits = planLimits ?? DEFAULT_FREE_LIMITS;

  return {
    subscription: data ?? null,
    limits: {
      ...DEFAULT_FREE_LIMITS,
      ...limits,
      plan: limits.plan ?? data?.plan ?? 'free',
    },
  };
}

async function getWorkspaceUsage(serviceClient: SupabaseClient, workspace: any) {
  const accountId = workspace.account_id as string | undefined;

  const [usersResult, profilesResult, scheduledContentResult, scheduledPostResult, workspacesResult] = await Promise.all([
    serviceClient
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
    serviceClient
      .from('social_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('is_active', true),
    serviceClient
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('status', 'scheduled'),
    serviceClient
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('status', 'scheduled'),
    accountId
      ? serviceClient
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
      : serviceClient
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', workspace.owner_id),
  ]);

  return {
    users_count: usersResult.count ?? 0,
    workspaces_count: workspacesResult.count ?? 1,
    social_profiles_count: profilesResult.count ?? 0,
    scheduled_posts_count: (scheduledContentResult.count ?? 0) + (scheduledPostResult.count ?? 0),
  };
}

export async function requireWorkspaceContext(
  request: NextRequest,
  options: WorkspaceContextOptions = {}
): Promise<WorkspaceContext> {
  const { user, supabase } = await requireAuth(request);
  const serviceClient = createServiceRoleClient();
  const requestedWorkspaceId = options.workspaceId || getWorkspaceIdFromRequest(request);

  let workspaceId = requestedWorkspaceId;
  if (!workspaceId && options.allowOnboardingFallback) {
    const workspace = await ensureDefaultWorkspace(user.id, supabase);
    workspaceId = workspace.id;
  }

  if (!workspaceId) {
    throw new APIError(
      400,
      'Select a workspace before using this endpoint',
      'WORKSPACE_REQUIRED'
    );
  }

  const { data: workspace, error: workspaceError } = await serviceClient
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace) {
    throw new APIError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
  }

  const { data: membership } = await serviceClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = workspace.owner_id === user.id ? 'owner' : normalizeWorkspaceRole(membership?.role);
  if (!membership && workspace.owner_id !== user.id) {
    throw new APIError(403, 'Access denied to workspace', 'ACCESS_DENIED');
  }

  if (options.roles?.length) {
    assertWorkspaceRole(role, options.roles);
  }

  let account: any | null = null;
  if (workspace.account_id) {
    const { data } = await serviceClient
      .from('accounts')
      .select('*')
      .eq('id', workspace.account_id)
      .maybeSingle();
    account = data ?? null;
  }

  const [{ subscription, limits }, usage] = await Promise.all([
    getPlanForWorkspace(serviceClient, workspace),
    getWorkspaceUsage(serviceClient, workspace),
  ]);

  return {
    user,
    userClient: supabase,
    serviceClient,
    workspace,
    workspaceId: workspace.id,
    role,
    account,
    subscription,
    limits,
    usage,
  };
}

export function enforceLimit(
  current: number,
  limit: number | null | undefined,
  message: string
) {
  if (limit === null || limit === undefined) {
    return;
  }

  if (current >= limit) {
    throw new APIError(402, message, 'PLAN_LIMIT_EXCEEDED', {
      current,
      limit,
    });
  }
}

export async function assertSocialAccountsInWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  accountIds: Array<string | null | undefined>
) {
  const ids = Array.from(new Set(accountIds.filter(Boolean))) as string[];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, platform, workspace_id, is_active')
    .eq('workspace_id', workspaceId)
    .in('id', ids);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!data || data.length !== ids.length) {
    throw new APIError(
      400,
      'One or more social accounts do not belong to the selected workspace',
      'INVALID_WORKSPACE_RESOURCE'
    );
  }

  return data;
}

export async function assertMediaInWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  mediaIds: Array<string | null | undefined>
) {
  const ids = Array.from(new Set(mediaIds.filter(Boolean))) as string[];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('media_assets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', ids);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!data || data.length !== ids.length) {
    throw new APIError(
      400,
      'One or more media assets do not belong to the selected workspace',
      'INVALID_WORKSPACE_RESOURCE'
    );
  }

  return data;
}

export function assertContentMutable(status: string, role: WorkspaceRole) {
  if (['approved', 'scheduled', 'published'].includes(status) && !['owner', 'admin'].includes(role)) {
    throw new APIError(
      423,
      'Approved, scheduled, or published content is locked for non-admin roles',
      'CONTENT_LOCKED'
    );
  }
}
