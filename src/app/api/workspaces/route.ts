import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

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

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(100).optional(),
  logoUrl: z.string().url().optional(),
  settings: z.record(z.any()).optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 * Returns workspaces the authenticated user can access
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const includeMembers = request.nextUrl.searchParams.get('include_members') === 'true';

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select(
      includeMembers
        ? 'workspace:workspace_id (*, workspace_members(role, user_id, profiles(id, name, email))) , role'
        : 'workspace:workspace_id (*), role'
    )
    .eq('user_id', user.id);

  if (membershipError) {
    throw new APIError(500, membershipError.message, 'DATABASE_ERROR');
  }

  const { data: ownedWorkspaces, error: ownedError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id);

  if (ownedError) {
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

  const membershipList = (memberships ?? []).map((membership: any) => ({
    workspace: membership.workspace as WorkspaceRow | null,
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
  const { user, supabase } = await requireAuth(request);

  const payload = await validateRequest(request, createWorkspaceSchema);
  const baseSlug = payload.slug || slugify(payload.name) || 'workspace';
  const uniqueSuffix = Math.random().toString(36).slice(-4);
  const slug = `${baseSlug}-${uniqueSuffix}`.replace(/--+/g, '-').slice(0, 100);

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: payload.name,
      slug,
      logo_url: payload.logoUrl,
      owner_id: user.id,
      settings: payload.settings || {},
    })
    .select()
    .single();

  if (error || !workspace) {
    throw new APIError(500, error?.message || 'Unable to create workspace', 'DATABASE_ERROR');
  }

  const { error: membershipError } = await supabase
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
    throw new APIError(500, membershipError.message, 'DATABASE_ERROR');
  }

  return successResponse({ workspace });
});

