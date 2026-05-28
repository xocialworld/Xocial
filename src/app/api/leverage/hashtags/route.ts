import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { generateHashtags } from '@/lib/openai';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import type { Platform } from '@/types';
import type { AIExplanation } from '@/types/intelligence';

export const dynamic = 'force-dynamic';

const PLATFORM_VALUES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
];

const hashtagSchema = z.object({
  content: z.string().min(5, 'Content is required'),
  platform: z.string().min(2).default('instagram'),
  count: z.number().min(1).max(30).default(12),
  intent: z.string().optional(),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
});

function normalizePlatform(value: string): Platform | undefined {
  return PLATFORM_VALUES.includes(value as Platform) ? (value as Platform) : undefined;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, hashtagSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const startTime = Date.now();
  const platform = input.platform || 'instagram';
  const count = input.count ?? 12;
  const selectedPlatform = normalizePlatform(platform);
  const aiContextPacket = input.useBrandBrain
    ? await buildAIContextPacket(serviceClient, {
        workspaceId,
        selectedPlatforms: selectedPlatform ? [selectedPlatform] : undefined,
        campaignGoal: input.campaignGoal,
        contentPillar: input.contentPillar,
        query: input.content,
      })
    : undefined;
  const hashtags = await generateHashtags(
    input.content,
    platform,
    count,
    aiContextPacket
      ? {
          promptContext: aiContextPacket.promptContext,
          contextMetadata: aiContextPacket.contextMetadata,
          intent: input.intent,
        }
      : { intent: input.intent }
  );
  const latencyMs = Date.now() - startTime;
  const explanation: AIExplanation = {
    reasonSummary: aiContextPacket
      ? 'Hashtags were generated from the draft content plus Brand Brain and platform context.'
      : 'Hashtags were generated from the draft content and selected platform.',
    evidence: [
      `${hashtags.length} hashtags generated for ${platform}.`,
      aiContextPacket?.contextMetadata.contextSources?.length
        ? `Context sources: ${aiContextPacket.contextMetadata.contextSources.slice(0, 4).join(', ')}.`
        : '',
    ].filter(Boolean),
    confidenceScore: aiContextPacket ? 0.72 : 0.58,
    targetPlatforms: selectedPlatform ? [selectedPlatform] : undefined,
    contentPillar: input.contentPillar,
    generatedBy: 'hashtag_generator',
    promptVersion: 'leverage.hashtags.v1',
  };

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId,
    userId: user.id,
    feature: 'leverage_hashtags',
    promptVersion: 'leverage.hashtags.v1',
    model: 'openai/gpt-4o-mini',
    inputPayload: {
      ...input,
      platform,
      count,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: { hashtags, explanation },
    status: 'succeeded',
    latencyMs,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'hashtag_generated',
    entityType: 'hashtag_set',
    entityId: modelRun?.id ?? null,
    platform,
    signalStrength: 0.5,
    metadata: {
      count: hashtags.length,
      intent: input.intent,
      usedBrandBrain: Boolean(aiContextPacket),
      contextMetadata: aiContextPacket?.contextMetadata,
      explanation,
    },
  });

  return successResponse({
    hashtags,
    count: hashtags.length,
    modelRunId: modelRun?.id ?? null,
    explanation,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });
});
