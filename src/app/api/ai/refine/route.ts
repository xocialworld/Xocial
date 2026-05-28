import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { refineContent } from '@/lib/openai';
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
 * Validation schema for content refinement
 */
const refineSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: z.string(),
  refinementType: z.enum([
    'shorter',
    'longer',
    'more_emojis',
    'more_professional',
    'more_casual',
    'add_urgency',
    'custom',
  ]),
  customInstruction: z.string().max(500).optional(),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.refinementType === 'custom' && !data.customInstruction?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customInstruction'],
      message: 'Custom instruction is required for custom regeneration',
    });
  }
});

function normalizePlatform(value: string): Platform | undefined {
  return PLATFORM_VALUES.includes(value as Platform) ? (value as Platform) : undefined;
}

/**
 * POST /api/ai/refine
 * Refine existing content with specific improvements
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, workspace, serviceClient } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
    allowOnboardingFallback: true,
  });
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, refineSchema);

  // Rate limit per user for AI refine
  const limited = checkRateLimit(`${user.id}:ai:refine`, 60, 60_000);
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
        query: validatedData.customInstruction || validatedData.content,
      })
    : undefined;

  // Refine content
  const refinedText = await refineContent(
    validatedData.content,
    validatedData.platform,
    validatedData.refinementType,
    validatedData.customInstruction,
    aiContextPacket
      ? {
          promptContext: aiContextPacket.promptContext,
          contextMetadata: aiContextPacket.contextMetadata,
        }
      : undefined
  );

  const totalDuration = Date.now() - startTime;
  const explanation: AIExplanation = {
    reasonSummary:
      validatedData.refinementType === 'custom'
        ? `Regenerated this platform draft using the custom instruction: ${validatedData.customInstruction}.`
        : `Regenerated this platform draft with the ${validatedData.refinementType.replace(/_/g, ' ')} quick option.`,
    evidence: [
      `Target platform: ${validatedData.platform}.`,
      aiContextPacket?.contextMetadata.contextSources?.length
        ? `Context sources: ${aiContextPacket.contextMetadata.contextSources.slice(0, 4).join(', ')}.`
        : '',
    ].filter(Boolean),
    confidenceScore: aiContextPacket ? 0.7 : 0.56,
    targetPlatforms: platform ? [platform] : undefined,
    contentPillar: validatedData.contentPillar,
    generatedBy: 'content_refinement',
    promptVersion: 'create.refine.v1',
  };
  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'content_refinement',
    promptVersion: 'create.refine.v1',
    inputPayload: {
      content: validatedData.content,
      platform: validatedData.platform,
      refinementType: validatedData.refinementType,
      customInstruction: validatedData.customInstruction,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: {
      text: refinedText,
      explanation,
    },
    status: 'succeeded',
    latencyMs: totalDuration,
    entityType: 'ai_refinement',
  });

  await recordLearningEvent(serviceClient, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'ai_regenerated',
    entityType: 'ai_refinement',
    entityId: modelRun?.id ?? null,
    platform: validatedData.platform,
    signalStrength: 0.65,
    metadata: {
      modelRunId: modelRun?.id,
      refinementType: validatedData.refinementType,
      customInstruction: validatedData.customInstruction,
      contentLength: validatedData.content.length,
      outputLength: refinedText.length,
      usedBrandBrain: Boolean(aiContextPacket),
      contextMetadata: aiContextPacket?.contextMetadata,
      explanation,
    },
  });

  logger.ai('ai_refine', {
    userId: user.id,
    metadata: {
      platform: validatedData.platform,
      refinementType: validatedData.refinementType,
    },
  });

  const response = successResponse({
    text: refinedText,
    original: validatedData.content,
    refinementType: validatedData.refinementType,
    modelRunId: modelRun?.id ?? null,
    explanation,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });

  logger.trackAPIRequest('POST', '/api/ai/refine', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, type: validatedData.refinementType },
  });

  return response;
});
