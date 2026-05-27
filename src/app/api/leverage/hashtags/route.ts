import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { generateHashtags } from '@/lib/openai';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';

export const dynamic = 'force-dynamic';

const hashtagSchema = z.object({
  content: z.string().min(5, 'Content is required'),
  platform: z.string().min(2).default('instagram'),
  count: z.number().min(1).max(30).default(12),
  intent: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, hashtagSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const startTime = Date.now();
  const platform = input.platform || 'instagram';
  const count = input.count ?? 12;
  const hashtags = await generateHashtags(input.content, platform, count);
  const latencyMs = Date.now() - startTime;

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId,
    userId: user.id,
    feature: 'leverage_hashtags',
    promptVersion: 'leverage.hashtags.v1',
    model: 'openai/gpt-4o-mini',
    inputPayload: { ...input, platform, count },
    outputPayload: { hashtags },
    status: 'succeeded',
    latencyMs,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'ai_generated',
    entityType: 'hashtag_set',
    entityId: modelRun?.id ?? null,
    platform,
    signalStrength: 0.5,
    metadata: {
      count: hashtags.length,
      intent: input.intent,
    },
  });

  return successResponse({
    hashtags,
    count: hashtags.length,
    modelRunId: modelRun?.id ?? null,
  });
});
