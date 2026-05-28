import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  successResponse,
  validateRequest,
  withErrorHandler,
} from '@/lib/api-middleware';
import { recordAIFeedbackAction } from '@/lib/intelligence/feedback';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

const targetTypeSchema = z.enum([
  'strategy_recommendation',
  'agent_artifact',
  'content_prediction',
  'platform_variant',
  'calendar_suggestion',
  'approval_item',
  'ai_generation',
  'hashtag_set',
  'analytics_insight',
]);

const actionSchema = z.enum([
  'accept',
  'edit_accept',
  'ignore',
  'dismiss',
  'complete',
  'apply',
  'reject',
  'mark_off_brand',
]);

const requestSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().optional().nullable(),
  action: actionSchema,
  reasonType: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  originalValue: z.unknown().optional().nullable(),
  editedValue: z.unknown().optional().nullable(),
  applyToBrandBrain: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, requestSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
  });

  const result = await recordAIFeedbackAction(serviceClient, {
    ...input,
    workspaceId,
    actorUserId: user.id,
    applyToBrandBrain:
      input.applyToBrandBrain ?? (input.action === 'mark_off_brand' || input.action === 'edit_accept'),
  });

  return successResponse(result);
});
