import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { processDueAgentTasks } from '@/lib/intelligence/tasks';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const processAgentTasksSchema = z.object({
  limit: z.number().int().min(1).max(25).optional().default(8),
  staleAfterMinutes: z.number().int().min(5).max(180).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, processAgentTasksSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const result = await processDueAgentTasks(serviceClient, {
    limit: input.limit,
    workspaceId,
    staleAfterMinutes: input.staleAfterMinutes,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'agent_tasks_manual_process',
    entityType: 'workspace',
    entityId: workspaceId,
    signalStrength: 0.35,
    metadata: {
      limit: input.limit,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      retryScheduled: result.retryScheduled,
      recoveredStale: result.recoveredStale,
      failedStale: result.failedStale,
    },
  });

  return successResponse(result);
});
