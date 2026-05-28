import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { generateVariations } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';
import type { Platform } from '@/types';

const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
]);

/**
 * Validation schema for content variations
 */
const variationsSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: platformEnum,
  count: z.number().min(1).max(5).optional().default(3),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
});

/**
 * POST /api/ai/variations
 * Generate content variations
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, workspace, serviceClient } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
    allowOnboardingFallback: true,
  });
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, variationsSchema);

  // Rate limit per user for variations
  const limited = checkRateLimit(`${user.id}:ai:variations`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  const aiContextPacket = validatedData.useBrandBrain
    ? await buildAIContextPacket(serviceClient, {
        workspaceId: workspace.id,
        selectedPlatforms: [validatedData.platform as Platform],
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        query: validatedData.content,
      })
    : undefined;

  // Generate variations
  const variations = await generateVariations(
    validatedData.content,
    validatedData.platform,
    validatedData.count,
    aiContextPacket
      ? {
          promptContext: aiContextPacket.promptContext,
          contextMetadata: aiContextPacket.contextMetadata,
        }
      : undefined
  );

  const totalDuration = Date.now() - startTime;
  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'content_variations',
    promptVersion: 'ai.variations.v1',
    model: 'openai/gpt-4o',
    inputPayload: {
      content: validatedData.content,
      platform: validatedData.platform,
      count: validatedData.count,
      campaignGoal: validatedData.campaignGoal,
      contentPillar: validatedData.contentPillar,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: { variations },
    status: 'succeeded',
    latencyMs: totalDuration,
    entityType: 'content_variations',
  });

  await recordLearningEvent(serviceClient, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'ai_generated',
    entityType: 'content_variations',
    entityId: modelRun?.id ?? null,
    platform: validatedData.platform,
    signalStrength: 0.5,
    metadata: {
      count: variations.length,
      requestedCount: validatedData.count,
      usedBrandBrain: Boolean(aiContextPacket),
      contextMetadata: aiContextPacket?.contextMetadata,
    },
  });

  const response = successResponse({
    variations,
    count: variations.length,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });

  logger.trackAPIRequest('POST', '/api/ai/variations', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, count: validatedData.count },
  });

  return response;
});
