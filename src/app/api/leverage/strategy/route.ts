import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { runStrategyAnalysis } from '@/lib/ai/strategy-engine';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const startTime = Date.now();
  const aiContextPacket = await buildAIContextPacket(serviceClient, {
    workspaceId,
    campaignGoal: 'Generate actionable social media strategy',
    query: 'Create strategy recommendations for Leverage',
  });
  const { performanceData, recommendations, contextMetadata } = await runStrategyAnalysis(
    workspaceId,
    { aiContext: aiContextPacket }
  );
  const latencyMs = Date.now() - startTime;

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId,
    userId: user.id,
    feature: 'leverage_strategy',
    promptVersion: 'leverage.strategy.v1',
    model: 'openai/gpt-4o-mini',
    inputPayload: {
      performanceData,
      contextMetadata,
      brandProfile: {
        voice: aiContextPacket.intelligenceContext.brandProfile.voice,
        audience: aiContextPacket.intelligenceContext.brandProfile.audience,
        contentPillars: aiContextPacket.intelligenceContext.brandProfile.content_pillars,
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
      contextMetadata,
    },
  });

  return successResponse({
    performanceData,
    recommendations,
    modelRunId: modelRun?.id ?? null,
    context: contextMetadata
      ? {
          brandCompletion: contextMetadata.brandCompletion,
          contextSources: contextMetadata.contextSources,
        }
      : undefined,
  });
});
