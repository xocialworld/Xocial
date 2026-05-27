import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { runStrategyAnalysis } from '@/lib/ai/strategy-engine';
import { getBrandProfile } from '@/lib/intelligence/context';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const startTime = Date.now();
  const brandProfile = await getBrandProfile(serviceClient, workspaceId);
  const { performanceData, recommendations } = await runStrategyAnalysis(workspaceId);
  const latencyMs = Date.now() - startTime;

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId,
    userId: user.id,
    feature: 'leverage_strategy',
    promptVersion: 'leverage.strategy.v1',
    model: 'openai/gpt-4o-mini',
    inputPayload: {
      performanceData,
      brandProfile: {
        voice: brandProfile.voice,
        audience: brandProfile.audience,
        contentPillars: brandProfile.content_pillars,
      },
    },
    outputPayload: {
      recommendationCount: recommendations.length,
      recommendations,
    },
    status: 'succeeded',
    latencyMs,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'strategy_generated',
    entityType: 'ai_model_run',
    entityId: modelRun?.id ?? null,
    metadata: {
      recommendationCount: recommendations.length,
      hasPerformanceData: Boolean(performanceData),
    },
  });

  return successResponse({
    performanceData,
    recommendations,
    modelRunId: modelRun?.id ?? null,
  });
});
