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
 * DELETE /api/team/members/:id
 * Remove a member from the current workspace (admin or owner only)
 */
export const DELETE = withErrorHandler(async (request: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { user, supabase } = await requireAuth(request);
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  // Require at least admin
  const role = await checkWorkspaceAccess(user.id, workspace.id);
  if (!['owner', 'admin', 'manager'].includes(role)) {
    throw new APIError(403, 'Only admins and managers can remove members', 'FORBIDDEN');
  }

  const memberId = params.id;
  if (!memberId) {
    throw new APIError(400, 'Member ID is required', 'VALIDATION_ERROR');
  }

  // Do not allow removing the owner record
  const { data: targetMember, error: fetchErr } = await supabase
    .from('workspace_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspace.id)
    .single();

  if (fetchErr || !targetMember) {
    throw new APIError(404, 'Member not found', 'NOT_FOUND');
  }

  if (targetMember.role === 'owner') {
    throw new APIError(400, 'Cannot remove the workspace owner', 'INVALID_OPERATION');
  }

  const { error: deleteErr } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', workspace.id);

  if (deleteErr) {
    throw new APIError(500, deleteErr.message, 'DATABASE_ERROR');
  }

  return successResponse({ message: 'Member removed' });
});


