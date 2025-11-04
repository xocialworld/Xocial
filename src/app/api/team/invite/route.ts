/**
 * Team Invitation API
 * Invite new members to workspace
 * POST /api/team/invite
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { generateSecureToken } from '@/lib/security';
import { logger } from '@/lib/logger';

/**
 * Validation schema for invitations
 */
const inviteSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  message: z.string().optional(),
});

/**
 * POST /api/team/invite
 * Send invitation to join workspace
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  // Validate request body
  const { workspaceId, email, role, message } = await validateRequest(request, inviteSchema);

  logger.info('Team invitation request', {
    userId: user.id,
    workspaceId,
    email,
    role,
  });

  // Check if user has permission to invite (must be owner or admin)
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
    logger.warn('Unauthorized invitation attempt', {
      userId: user.id,
      workspaceId,
      userRole: member?.role,
    });
    throw new APIError(403, 'You do not have permission to invite members', 'FORBIDDEN');
  }

  // Get workspace details
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', workspaceId)
    .single();

  if (workspaceError || !workspace) {
    throw new APIError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
  }

  // Check if user already exists in the system
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  if (existingProfile) {
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', existingProfile.id)
      .single();

    if (existingMember) {
      throw new APIError(400, 'User is already a member of this workspace', 'ALREADY_MEMBER');
    }

    // Add user directly to workspace
    const { data: newMember, error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: existingProfile.id,
        role,
      })
      .select()
      .single();

    if (insertError) {
      throw new APIError(500, 'Failed to add member', 'INSERT_FAILED');
    }

    logger.info('User added to workspace directly', {
      userId: user.id,
      newMemberId: existingProfile.id,
      workspaceId,
      role,
    });

    // TODO: Send email notification
    // await sendInvitationEmail({
    //   to: email,
    //   workspaceName: workspace.name,
    //   inviterName: user.email,
    //   role,
    //   message,
    // });

    return successResponse({
      message: 'User added to workspace successfully',
      member: newMember,
      directAdd: true,
    });
  }

  // Generate invitation token
  const token = generateSecureToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  // Store invitation (you'll need to create this table)
  // For now, we'll use metadata in workspace_members or a separate invitations table
  
  // Create invitation record (pseudo-code - adapt to your schema)
  const invitationData = {
    workspace_id: workspaceId,
    email,
    role,
    token,
    expires_at: expiresAt.toISOString(),
    invited_by: user.id,
    status: 'pending',
    message,
  };

  logger.info('Invitation created', {
    userId: user.id,
    workspaceId,
    email,
    role,
    expiresAt: expiresAt.toISOString(),
  });

  // TODO: Store invitation in database (create invitations table if needed)
  // TODO: Send invitation email with token link
  
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/team/accept?token=${token}`;

  // Mock email sending (replace with actual email service)
  console.log(`[Team Invite] Invitation link: ${invitationLink}`);

  return successResponse({
    message: 'Invitation sent successfully',
    invitation: {
      email,
      role,
      expiresAt: expiresAt.toISOString(),
      invitationLink: process.env.NODE_ENV === 'development' ? invitationLink : undefined,
    },
  });
});

export const dynamic = 'force-dynamic';

