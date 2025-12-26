import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
  createServiceRoleClient,
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

import { createWorkspaceSchema } from '@/lib/validations';

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
    .select('workspace_id, role')
    .eq('user_id', user.id);

  if (membershipError) {
    console.error('Membership Error:', membershipError);
    throw new APIError(500, membershipError.message, 'DATABASE_ERROR');
  }

  const { data: ownedWorkspaces, error: ownedError } = await supabase
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
  // Fetch workspace details for memberships
  const membershipWorkspaceIds = (memberships ?? []).map((m: any) => m.workspace_id).filter(Boolean);
  let membershipWorkspaces: WorkspaceRow[] = [];

  if (membershipWorkspaceIds.length > 0) {
    const { data } = await supabase
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
  // Check for duplicate workspace name for this user
  const { data: existingWorkspace } = await serviceClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
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
      logo_url: payload.logoUrl,
      owner_id: user.id,
      settings: payload.settings || {},
      timezone: payload.timezone || 'UTC',
      color_theme: payload.color_theme || 'teal',
    })
    .select()
    .single();

  if (error || !workspace) {
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

  return successResponse({ workspace });
});

