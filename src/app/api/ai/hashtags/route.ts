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
import { buildAIContextPacket } from '@/lib/intelligence/context';
import type { Platform } from '@/types';
import type { AIExplanation } from '@/types/intelligence';

const PLATFORM_VALUES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
];

/**
 * Validation schema for hashtag generation
 */
const hashtagSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: z.string(),
  count: z.number().min(1).max(30).optional().default(5),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
  intent: z.string().optional(),
});

function normalizePlatform(value: string): Platform | undefined {
  return PLATFORM_VALUES.includes(value as Platform) ? (value as Platform) : undefined;
}

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

  const platform = normalizePlatform(validatedData.platform);
  const aiContextPacket = validatedData.useBrandBrain
    ? await buildAIContextPacket(serviceClient, {
        workspaceId: workspace.id,
        selectedPlatforms: platform ? [platform] : undefined,
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        query: validatedData.content,
      })
    : undefined;

  // Generate hashtags
  const hashtags = await generateHashtags(
    validatedData.content,
    validatedData.platform,
    validatedData.count,
    aiContextPacket
      ? {
          promptContext: aiContextPacket.promptContext,
          contextMetadata: aiContextPacket.contextMetadata,
          intent: validatedData.intent,
        }
      : { intent: validatedData.intent }
  );

  const totalDuration = Date.now() - startTime;
  const explanation: AIExplanation = {
    reasonSummary: aiContextPacket
      ? 'Hashtags were generated using the draft, selected platform, and Brand Brain context.'
      : 'Hashtags were generated using the draft and selected platform.',
    evidence: [
      `${hashtags.length} hashtags generated for ${validatedData.platform}.`,
      aiContextPacket?.contextMetadata.contextSources?.length
        ? `Context sources: ${aiContextPacket.contextMetadata.contextSources.slice(0, 4).join(', ')}.`
        : '',
    ].filter(Boolean),
    confidenceScore: aiContextPacket ? 0.72 : 0.58,
    targetPlatforms: platform ? [platform] : undefined,
    contentPillar: validatedData.contentPillar,
    generatedBy: 'hashtag_generation',
    promptVersion: 'create.hashtags.v1',
  };
  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'hashtag_generation',
    promptVersion: 'create.hashtags.v1',
    inputPayload: {
      content: validatedData.content,
      platform: validatedData.platform,
      count: validatedData.count,
      intent: validatedData.intent,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: {
      hashtags,
      explanation,
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
      intent: validatedData.intent,
      usedBrandBrain: Boolean(aiContextPacket),
      contextMetadata: aiContextPacket?.contextMetadata,
      explanation,
    },
  });

  const response = successResponse({
    hashtags,
    count: hashtags.length,
    explanation,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });

  logger.trackAPIRequest('POST', '/api/ai/hashtags', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, count: validatedData.count },
  });

  return response;
});
