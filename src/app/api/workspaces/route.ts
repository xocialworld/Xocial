import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
  createServiceRoleClient,
  getUserWorkspace,
} from '@/lib/api-middleware';
import { ensureAccountForUser, enforceLimit } from '@/lib/workspace-context';
import { slugify } from '@/lib/utils';
import { createWorkspaceSchema } from '@/lib/validations';

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  [key: string]: unknown;
};

type WorkspaceEntry = {
  workspace: WorkspaceRow;
  role: string;
};

type WorkspaceScope = {
  column: 'account_id' | 'owner_id';
  value: string;
  workspaces: WorkspaceRow[];
};

const PLAN_PRIORITY: Record<string, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  enterprise: 3,
};

export const dynamic = 'force-dynamic';

function isMissingSchemaError(error: any) {
  const code = error?.code;
  const message = String(error?.message || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes("Could not find the table") ||
    message.includes("Could not find the 'account_id' column") ||
    message.includes('column workspaces.account_id does not exist') ||
    message.includes('column subscriptions.account_id does not exist')
  );
}

function getConfiguredTestPlan(userId: string) {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.XOCIAL_TEST_SUBSCRIPTION_PLAN || 'enterprise';
  }

  const configuredUserIds = (process.env.XOCIAL_TEST_SUBSCRIPTION_USER_IDS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (configuredUserIds.includes(userId)) {
    return process.env.XOCIAL_TEST_SUBSCRIPTION_PLAN || 'enterprise';
  }

  return null;
}

function rankPlan(plan?: string | null) {
  return PLAN_PRIORITY[plan || 'free'] ?? 0;
}

function pickHighestPlan(plans: Array<string | null | undefined>): string {
  let best = 'free';
  plans.forEach((plan) => {
    if (rankPlan(plan) > rankPlan(best)) {
      best = plan || best;
    }
  });
  return best;
}

async function getWorkspaceScope(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  accountId?: string | null
): Promise<WorkspaceScope> {
  if (accountId) {
    const accountScope = await serviceClient
      .from('workspaces')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true });

    if (!accountScope.error) {
      return {
        column: 'account_id',
        value: accountId,
        workspaces: (accountScope.data as WorkspaceRow[] | null) ?? [],
      };
    }

    if (!isMissingSchemaError(accountScope.error)) {
      throw new APIError(500, accountScope.error.message, 'DATABASE_ERROR');
    }
  }

  const { data, error } = await serviceClient
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return {
    column: 'owner_id',
    value: userId,
    workspaces: (data as WorkspaceRow[] | null) ?? [],
  };
}

async function getPlanLimitsByName(serviceClient: ReturnType<typeof createServiceRoleClient>) {
  const { data, error } = await serviceClient
    .from('plan_limits')
    .select('*');

  if (error) {
    return new Map<string, any>();
  }

  return new Map((data ?? []).map((limit: any) => [limit.plan, limit]));
}

async function getEffectiveWorkspacePlan(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  scope: WorkspaceScope,
  userId: string,
  accountId?: string | null
) {
  const planLimitsByName = await getPlanLimitsByName(serviceClient);
  const workspaceIds = scope.workspaces.map((workspace) => workspace.id);
  const workspacePlanTiers = scope.workspaces.map((workspace) => workspace.plan_tier as string | undefined);
  const subscriptionPlans: string[] = [];

  if (accountId) {
    const { data, error } = await serviceClient
      .from('subscriptions')
      .select('plan, status')
      .eq('account_id', accountId)
      .eq('status', 'active');

    if (error) {
      if (isMissingSchemaError(error)) {
        // Account-scoped subscriptions are created by the newer workspace
        // migration. Older databases are still workspace-scoped.
      } else {
        throw new APIError(500, error.message, 'DATABASE_ERROR');
      }
    } else {
      subscriptionPlans.push(...((data ?? []).map((subscription: any) => subscription.plan)));
    }
  }

  if (workspaceIds.length > 0) {
    const { data, error } = await serviceClient
      .from('subscriptions')
      .select('plan, status')
      .in('workspace_id', workspaceIds)
      .eq('status', 'active');

    if (error) {
      if (isMissingSchemaError(error)) {
        // Keep local onboarding usable on databases without billing tables.
      } else {
        throw new APIError(500, error.message, 'DATABASE_ERROR');
      }
    } else {
      subscriptionPlans.push(...((data ?? []).map((subscription: any) => subscription.plan)));
    }
  }

  let plan: string = pickHighestPlan([...subscriptionPlans, ...workspacePlanTiers]);

  const configuredTestPlan = getConfiguredTestPlan(userId);
  if (plan === 'free' && configuredTestPlan) {
    plan = configuredTestPlan;
  }

  const limits = planLimitsByName.get(plan) ??
    planLimitsByName.get('free') ?? {
      plan,
      max_workspaces: plan === 'enterprise' ? 999 : 1,
      max_social_profiles: plan === 'enterprise' ? 999 : 3,
      max_users: plan === 'enterprise' ? 999 : 1,
    };

  return {
    plan,
    limits: {
      ...limits,
      plan,
    },
  };
}

async function createWorkspaceSubscription(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  workspaceId: string,
  plan: string
) {
  const { error } = await serviceClient
    .from('subscriptions')
    .upsert(
      {
        workspace_id: workspaceId,
        plan,
        status: 'active',
      },
      { onConflict: 'workspace_id' }
    );

  if (error && !isMissingSchemaError(error)) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }
}

/**
 * GET /api/workspaces
 * Returns workspaces the authenticated user can access
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const serviceClient = createServiceRoleClient();

  // Ensure every authenticated user has at least one workspace before listing.
  // The listing itself uses the service role because workspace RLS policy drift
  // can otherwise strand the app in a client-side "Retry" state.
  await getUserWorkspace(user.id, supabase);

  const { data: memberships, error: membershipError } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id);

  if (membershipError) {
    console.error('Membership Error:', membershipError);
    throw new APIError(500, membershipError.message, 'DATABASE_ERROR');
  }

  const { data: ownedWorkspaces, error: ownedError } = await serviceClient
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id);

  if (ownedError) {
    console.error('Owned Workspaces Error:', ownedError);
    throw new APIError(500, ownedError.message, 'DATABASE_ERROR');
  }

  const seen = new Set<string>();
  const workspaces: WorkspaceEntry[] = [];

  const ownedList = (ownedWorkspaces as WorkspaceRow[] | null) ?? [];
  ownedList.forEach((workspace) => {
    if (!seen.has(workspace.id)) {
      seen.add(workspace.id);
      workspaces.push({ workspace, role: 'owner' });
    }
  });

  // Fetch workspace details for memberships
  const membershipWorkspaceIds = (memberships ?? []).map((m: any) => m.workspace_id).filter(Boolean);
  let membershipWorkspaces: WorkspaceRow[] = [];

  if (membershipWorkspaceIds.length > 0) {
    const { data } = await serviceClient
      .from('workspaces')
      .select('*')
      .in('id', membershipWorkspaceIds);
    if (data) membershipWorkspaces = data as WorkspaceRow[];
  }

  const membershipMap = new Map<string, WorkspaceRow>();
  membershipWorkspaces.forEach((ws: WorkspaceRow) => {
    membershipMap.set(ws.id, ws);
  });
  const membershipList = (memberships ?? []).map((membership: any) => ({
    workspace: membershipMap.get(membership.workspace_id) || null,
    role: membership.role as string,
  }));

  membershipList.forEach((membership: { workspace: WorkspaceRow | null; role: string }) => {
    const workspace = membership.workspace as WorkspaceRow | null;
    if (!workspace || seen.has(workspace.id)) {
      return;
    }
    seen.add(workspace.id);
    workspaces.push({
      workspace,
      role: membership.role,
    });
  });

  return successResponse({ workspaces });
});

/**
 * POST /api/workspaces
 * Creates a workspace + owner membership
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  const serviceClient = createServiceRoleClient();

  const payload = await validateRequest(request, createWorkspaceSchema);
  const account = await ensureAccountForUser(serviceClient, user, `${payload.name} Account`);
  const scope = await getWorkspaceScope(serviceClient, user.id, account?.id);
  const { plan, limits } = await getEffectiveWorkspacePlan(
    serviceClient,
    scope,
    user.id,
    account?.id
  );

  enforceLimit(
    scope.workspaces.length,
    limits.max_workspaces,
    `Workspace limit reached for your ${plan} plan`
  );

  // Check for duplicate workspace name for this user
  const { data: existingWorkspace } = await serviceClient
    .from('workspaces')
    .select('id')
    .eq(scope.column, scope.value)
    .eq('name', payload.name)
    .maybeSingle();

  if (existingWorkspace) {
    throw new APIError(409, 'A workspace with this name already exists', 'DUPLICATE_WORKSPACE_NAME');
  }

  const baseSlug = payload.slug || slugify(payload.name) || 'workspace';
  // Only append suffix if slug is not manually provided, to ensure uniqueness without user input
  // But if user provided a slug, we try to use it directly first (or handle constraint violation)
  // Re-reading code: payload.slug is optional in schema. 
  // We will keep the suffix behavior for generated slugs to ensure global uniqueness if slugs are global,
  // but since we checked name uniqueness for the user, we can be a bit cleaner.
  // Actually, per SRS, workspace slugs might need to be globally unique or scoped to team (owner).
  // The DB likely has a globally unique constraint on 'slug' if 'team_id' column doesn't exist or isn't part of the constraint.
  // Let's keep the random suffix for now to be safe on slugs, but we have solved the name duplication issue.
  const uniqueSuffix = Math.random().toString(36).slice(-4);
  const slug = payload.slug
    ? payload.slug // User provided slug, try to use it (will fail if duplicate)
    : `${baseSlug}-${uniqueSuffix}`.replace(/--+/g, '-').slice(0, 100);

  const { data: workspace, error } = await serviceClient
    .from('workspaces')
    .insert({
      name: payload.name,
      slug,
      ...(account?.id ? { account_id: account.id } : {}),
      logo_url: payload.logoUrl,
      owner_id: user.id,
      settings: payload.settings || {},
      timezone: payload.timezone || 'UTC',
      plan_tier: plan,
      color_theme: payload.color_theme || 'teal',
    })
    .select()
    .single();

  if (error || !workspace) {
    if (account?.id && isMissingSchemaError(error)) {
      const { data: legacyWorkspace, error: legacyError } = await serviceClient
        .from('workspaces')
        .insert({
          name: payload.name,
          slug,
          logo_url: payload.logoUrl,
          owner_id: user.id,
          settings: payload.settings || {},
          timezone: payload.timezone || 'UTC',
          plan_tier: plan,
          color_theme: payload.color_theme || 'teal',
        })
        .select()
        .single();

      if (legacyError || !legacyWorkspace) {
        throw new APIError(500, legacyError?.message || 'Unable to create workspace', 'DATABASE_ERROR');
      }

      const { error: legacyMembershipError } = await serviceClient
        .from('workspace_members')
        .upsert(
          {
            workspace_id: legacyWorkspace.id,
            user_id: user.id,
            role: 'owner',
          },
          { onConflict: 'workspace_id,user_id' }
        );

      if (legacyMembershipError) {
        await serviceClient.from('workspaces').delete().eq('id', legacyWorkspace.id);
        throw new APIError(500, legacyMembershipError.message, 'DATABASE_ERROR');
      }

      await createWorkspaceSubscription(serviceClient, legacyWorkspace.id as string, plan);

      return successResponse({ workspace: legacyWorkspace });
    }

    throw new APIError(500, error?.message || 'Unable to create workspace', 'DATABASE_ERROR');
  }

  const { error: membershipError } = await serviceClient
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' }
    );

  if (membershipError) {
    // Attempt cleanup if membership fails, though unlikely with service role
    await serviceClient.from('workspaces').delete().eq('id', workspace.id);
    throw new APIError(500, membershipError.message, 'DATABASE_ERROR');
  }

  await createWorkspaceSubscription(serviceClient, workspace.id as string, plan);

  return successResponse({ workspace });
});
