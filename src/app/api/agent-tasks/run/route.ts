import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { enqueueAgentTask } from '@/lib/intelligence/tasks';

export const dynamic = 'force-dynamic';

const agentTaskSchema = z.object({
  agentType: z.enum([
    'signal_ingestion',
    'content_classifier',
    'brand_learner',
    'performance_analyst',
    'best_time',
    'strategy_planner',
    'content_adaptation',
    'safety',
    'reporting',
    'learning_backfill',
    'analytics_backfill',
    'knowledge_ingestion',
  ]),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  priority: z.number().int().min(1).max(10).optional().default(5),
  scheduledFor: z.string().optional(),
  inputPayload: z.record(z.unknown()).optional().default({}),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, agentTaskSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const task = await enqueueAgentTask(serviceClient, {
    workspaceId,
    agentType: input.agentType,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    priority: input.priority,
    scheduledFor: input.scheduledFor,
    inputPayload: input.inputPayload,
    dedupe: true,
  });

  if (!task) {
    throw new Error('Unable to queue AI worker task');
  }

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'agent_task_queued',
    entityType: 'agent_task',
    entityId: task.id,
    signalStrength: 0.4,
    metadata: {
      agentType: input.agentType,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  return successResponse({ task });
});
