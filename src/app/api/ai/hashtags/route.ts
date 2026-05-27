import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { generateHashtags } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';

/**
 * Validation schema for hashtag generation
 */
const hashtagSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: z.string(),
  count: z.number().min(1).max(30).optional().default(5),
});

/**
 * POST /api/ai/hashtags
 * Generate relevant hashtags for content
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, workspace, serviceClient } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
    allowOnboardingFallback: true,
  });
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, hashtagSchema);

  // Rate limit per user for hashtag generation
  const limited = checkRateLimit(`${user.id}:ai:hashtags`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Generate hashtags
  const hashtags = await generateHashtags(
    validatedData.content,
    validatedData.platform,
    validatedData.count
  );

  const totalDuration = Date.now() - startTime;
  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'hashtag_generation',
    promptVersion: 'create.hashtags.v1',
    inputPayload: {
      content: validatedData.content,
      platform: validatedData.platform,
      count: validatedData.count,
    },
    outputPayload: {
      hashtags,
    },
    status: 'succeeded',
    latencyMs: totalDuration,
    entityType: 'hashtag_generation',
  });

  await recordLearningEvent(serviceClient, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'hashtag_generated',
    entityType: 'hashtag_generation',
    entityId: modelRun?.id ?? null,
    platform: validatedData.platform,
    signalStrength: 0.55,
    metadata: {
      modelRunId: modelRun?.id,
      count: hashtags.length,
      requestedCount: validatedData.count,
      contentLength: validatedData.content.length,
    },
  });

  const response = successResponse({
    hashtags,
    count: hashtags.length,
  });

  logger.trackAPIRequest('POST', '/api/ai/hashtags', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, count: validatedData.count },
  });

  return response;
});
