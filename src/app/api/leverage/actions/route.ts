import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, validateRequest, withErrorHandler } from '@/lib/api-middleware';
import { recordAIFeedbackAction } from '@/lib/intelligence/feedback';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import type { AIFeedbackActionType, AIFeedbackTargetType } from '@/types/intelligence';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum([
    'recommendation_accept',
    'recommendation_dismiss',
    'recommendation_complete',
    'recommendation_mark_off_brand',
    'artifact_accept',
    'artifact_ignore',
    'artifact_mark_off_brand',
  ]),
  targetId: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
});

function mapLegacyAction(action: z.infer<typeof actionSchema>['action']): {
  targetType: AIFeedbackTargetType;
  action: AIFeedbackActionType;
} {
  switch (action) {
    case 'recommendation_accept':
      return { targetType: 'strategy_recommendation', action: 'accept' };
    case 'recommendation_dismiss':
      return { targetType: 'strategy_recommendation', action: 'dismiss' };
    case 'recommendation_complete':
      return { targetType: 'strategy_recommendation', action: 'complete' };
    case 'recommendation_mark_off_brand':
      return { targetType: 'strategy_recommendation', action: 'mark_off_brand' };
    case 'artifact_accept':
      return { targetType: 'agent_artifact', action: 'accept' };
    case 'artifact_ignore':
      return { targetType: 'agent_artifact', action: 'ignore' };
    case 'artifact_mark_off_brand':
      return { targetType: 'agent_artifact', action: 'mark_off_brand' };
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, actionSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });
  const mapped = mapLegacyAction(input.action);
  const payload = input.payload || {};

  const result = await recordAIFeedbackAction(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    targetType: mapped.targetType,
    targetId: input.targetId,
    action: mapped.action,
    reasonType: String(payload.reasonType || ''),
    comment: String(payload.comment || ''),
    editedValue: payload,
    applyToBrandBrain: mapped.action === 'mark_off_brand' || input.action === 'artifact_accept',
    metadata: {
      legacyAction: input.action,
      feedbackSource: payload.feedbackSource || 'leverage_ui',
      ...payload,
    },
  });

  return successResponse({
    recommendation: result.target.recommendation,
    artifact: result.target.artifact,
    feedback: result.feedback,
    brandBrainUpdate: result.brandBrainUpdate,
  });
});
