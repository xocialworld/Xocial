import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { z } from 'zod';

/**
 * Validation schema for rescheduling
 */
const rescheduleSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  scheduledAt: z.string().datetime('Invalid date time format'),
});

/**
 * POST /api/scheduling/reschedule
 * Reschedule a post to a new date/time
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate request
  const validatedData = await validateRequest(request, rescheduleSchema);
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
  });

  // Update post scheduled_at
  const { data: post, error } = await supabase
    .from('posts')
    .update({
      scheduled_at: validatedData.scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validatedData.postId)
    .eq('workspace_id', workspace.id)
    .select()
    .single();

  if (error) throw error;

  return successResponse({
    post,
    message: 'Post rescheduled successfully',
  });
});
