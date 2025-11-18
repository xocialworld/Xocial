import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  APIError,
  getWorkspaceFromRequest,
  checkWorkspaceAccess,
} from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/members
 * List members of the current user's workspace
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  // Resolve the user's primary workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  // Ensure user has at least viewer access (should always be true if getUserWorkspace succeeded)
  await checkWorkspaceAccess(user.id, workspace.id).catch(() => null);

  // Join workspace_members with profiles for display fields
  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      `
      id,
      user_id,
      role,
      joined_at,
      profile:profiles!workspace_members_user_id_fkey(
        id,
        full_name,
        email,
        avatar_url
      )
    `
    )
    .eq('workspace_id', workspace.id)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  // Normalize profile fields (support for name vs full_name in schema)
  const members =
    (data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: {
        id: m.profile?.id,
        name: m.profile?.full_name || m.profile?.name || 'Member',
        email: m.profile?.email || '',
        avatar_url: m.profile?.avatar_url || null,
      },
    })) ?? [];

  return successResponse({ members });
});


