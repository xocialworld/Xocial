import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { analyzeContent } from '@/lib/openai';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';
import type { Platform } from '@/types';
import { z } from 'zod';

const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
]);

/**
 * Validation schema for content analysis
 */
const analyzeSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platforms: z.array(platformEnum).min(1).optional(),
  platform: platformEnum.optional(),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
});

/**
 * POST /api/ai/analyze
 * Analyze content sentiment and provide suggestions
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, workspace, serviceClient } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
    allowOnboardingFallback: true,
  });
  const startTime = Date.now();

  // Check if Vercel AI Gateway is configured
  if (!process.env.VERCEL_AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new APIError(
      501,
      'AI analysis is not configured. Please add VERCEL_AI_GATEWAY_API_KEY or OPENAI_API_KEY to environment variables.',
      'AI_NOT_CONFIGURED'
    );
  }

  // Validate request
  const validatedData = await validateRequest(request, analyzeSchema);
  const platforms = (validatedData.platforms ??
    (validatedData.platform ? [validatedData.platform] : [])) as Platform[];
  const aiContextPacket = validatedData.useBrandBrain
    ? await buildAIContextPacket(serviceClient, {
        workspaceId: workspace.id,
        selectedPlatforms: platforms.length ? platforms : undefined,
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        query: validatedData.content,
      })
    : undefined;

  const analysis = await analyzeContent(validatedData.content, {
    platforms,
    promptContext: aiContextPacket?.promptContext,
    contextMetadata: aiContextPacket?.contextMetadata,
  });
  const latencyMs = Date.now() - startTime;

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'content_analysis',
    promptVersion: 'ai.analyze.v1',
    model: 'openai/gpt-4o-mini',
    inputPayload: {
      content: validatedData.content,
      platforms,
      campaignGoal: validatedData.campaignGoal,
      contentPillar: validatedData.contentPillar,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: analysis,
    status: 'succeeded',
    latencyMs,
    entityType: 'content_analysis',
  });

  await recordLearningEvent(serviceClient, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'ai_generated',
    entityType: 'content_analysis',
    entityId: modelRun?.id ?? null,
    signalStrength: 0.45,
    metadata: {
      platforms,
      sentiment: analysis.sentiment,
      readability: analysis.readability,
      usedBrandBrain: Boolean(aiContextPacket),
      contextMetadata: aiContextPacket?.contextMetadata,
    },
  });

  return successResponse({
    ...analysis,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });
});
