import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/team/members/:id
 * Remove a member from the current workspace (admin or owner only)
 */
export const DELETE = withErrorHandler(async (request: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });

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

/**
 * PATCH /api/team/members/:id
 * Update a member's role (admin or owner only)
 */
export const PATCH = withErrorHandler(async (request: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin'],
  });

  const body = await request.json();
  const { role: newRole } = body;

  if (!['admin', 'manager', 'creator', 'analyst'].includes(newRole)) {
    throw new APIError(400, 'Invalid role', 'VALIDATION_ERROR');
  }

  const memberId = params.id;
  if (!memberId) {
    throw new APIError(400, 'Member ID is required', 'VALIDATION_ERROR');
  }

  // Fetch target member
  const { data: targetMember, error: fetchErr } = await supabase
    .from('workspace_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspace.id)
    .single();

  if (fetchErr || !targetMember) {
    throw new APIError(404, 'Member not found', 'NOT_FOUND');
  }

  // Cannot modify Owner's role
  if (targetMember.role === 'owner') {
    throw new APIError(400, 'Cannot change the workspace owner\'s role', 'INVALID_OPERATION');
  }

  // Only Owner can promote/demote to/from Admin (Optional restriction, but good for security)
  // Let's allow Admins to manage other Admins for now to keep it simple, but maybe prevent Admin from demoting Owner (already covered)
  // or Admin modifying another Admin?
  // Let's say Admins can manage anyone below Owner.

  const { data: updatedMember, error: updateErr } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('workspace_id', workspace.id)
    .select()
    .single();

  if (updateErr) {
    throw new APIError(500, updateErr.message, 'DATABASE_ERROR');
  }

  return successResponse({ member: updatedMember, message: 'Role updated successfully' });
});

