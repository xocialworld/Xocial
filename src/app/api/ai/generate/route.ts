import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
  enforceUserRateLimit,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { generateContent } from '@/lib/openai';
import { logger } from '@/lib/logger';
import type { Platform } from '@/types';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';
import { recordAIModelRun, recordLearningEvent } from '@/lib/intelligence/learning';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import type { AIExplanation } from '@/types/intelligence';
import { z } from 'zod';

/**
 * Validation schema for content generation
 */
const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
]);

const generateSchema = z.object({
  platforms: z.array(platformEnum).min(1).optional(),
  platform: platformEnum.optional(),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  model: z.string().optional(),
  tone: z.enum([
    'professional',
    'casual',
    'friendly',
    'enthusiastic',
    'informative',
    'playful',
    'inspirational',
    'educational',
  ]).optional(),
  style: z
    .enum(['informative', 'storytelling', 'educational', 'promotional', 'playful'])
    .optional(),
  audience: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  addEmojis: z.boolean().optional(),
  addHashtags: z.boolean().optional(),
  addCTA: z.boolean().optional(),
  maxLength: z.number().optional(),
  useBrandBrain: z.boolean().optional().default(true),
  campaignGoal: z.string().optional(),
  contentPillar: z.string().optional(),
});

function buildGenerationExplanations(input: {
  platforms: Platform[];
  generatedModel: string;
  useBrandBrain?: boolean;
  aiContextPacket?: Awaited<ReturnType<typeof buildAIContextPacket>>;
  contentPillar?: string;
  promptVersion: string;
}): {
  explanation: AIExplanation;
  platformExplanations: Partial<Record<Platform, AIExplanation>>;
} {
  const contextSources = input.aiContextPacket?.contextMetadata.contextSources || [];
  const brandCompletion = input.aiContextPacket?.contextMetadata.brandCompletion || 0;
  const recentTopCount = input.aiContextPacket?.intelligenceContext.recentTopPosts.length || 0;
  const failedCount = input.aiContextPacket?.intelligenceContext.recentFailedPosts.length || 0;
  const evidence = [
    input.useBrandBrain && contextSources.length
      ? `Used Brand Brain context from ${contextSources.slice(0, 4).join(', ')}.`
      : input.useBrandBrain
        ? 'Brand Brain was requested, but the available memory is still light.'
        : 'Brand Brain was disabled for this generation.',
    brandCompletion ? `Brand Brain completion is ${Math.round(brandCompletion)}%.` : '',
    recentTopCount ? `${recentTopCount} recent top post example${recentTopCount === 1 ? '' : 's'} used for style context.` : '',
    failedCount ? `${failedCount} weak post example${failedCount === 1 ? '' : 's'} used as avoid patterns.` : '',
  ].filter(Boolean);

  const baseExplanation: AIExplanation = {
    reasonSummary: input.useBrandBrain
      ? 'Xocial adapted the content using saved brand memory, platform selection, and recent workspace signals.'
      : 'Xocial generated this from the prompt and selected platform rules without Brand Brain memory.',
    evidence,
    dataCaveats: contextSources.length
      ? []
      : ['Add more Brand Brain details, published posts, and analytics syncs to make future explanations stronger.'],
    confidenceScore: input.useBrandBrain ? Math.min(0.9, 0.55 + brandCompletion / 250) : 0.55,
    contentPillar: input.contentPillar || undefined,
    targetPlatforms: input.platforms,
    generatedBy: 'content_generation',
    workerVersion: 'create.generate.v2',
    promptVersion: input.promptVersion,
  };

  return {
    explanation: baseExplanation,
    platformExplanations: input.platforms.reduce((acc, platform) => {
      acc[platform] = {
        ...baseExplanation,
        reasonSummary: `This ${platform} version was adapted for the selected platform's format, tone, and posting constraints.`,
        evidence: [
          ...evidence,
          `Selected platform: ${platform}.`,
        ].filter(Boolean),
        targetPlatforms: [platform],
      };
      return acc;
    }, {} as Partial<Record<Platform, AIExplanation>>),
  };
}

/**
 * POST /api/ai/generate
 * Generate AI content for social media
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate request
  const validatedData = await validateRequest(request, generateSchema);
  const {
    user,
    userClient: supabase,
    serviceClient,
    workspace,
  } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
  });

  const defaultPlatform: Platform = 'instagram';
  const platforms: Platform[] =
    validatedData.platforms ??
    (validatedData.platform ? [validatedData.platform] : [defaultPlatform]);
  const resolvedModel = validatedData.model ?? DEFAULT_AI_MODEL;

  const startTime = Date.now();

  const limited = await enforceUserRateLimit(supabase, user.id, 'ai_generations', 'created_at', 60_000, 30);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Generate content using OpenAI
  let generated;
  let refinedPrompt = validatedData.prompt;
  const aiContextPacket = validatedData.useBrandBrain
    ? await buildAIContextPacket(serviceClient, {
        workspaceId: workspace.id,
        selectedPlatforms: platforms,
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        query: validatedData.prompt,
      })
    : undefined;
  try {
    // Enhance the prompt to be more explicit if it's very short
    if (refinedPrompt.length < 50) {
        refinedPrompt = `Create a high-quality social media post based on this idea: "${refinedPrompt}". Expand on it, make it engaging, and ensure it offers value to the reader.`;
    }

    generated = await generateContent({
      prompt: refinedPrompt,
      platforms,
      model: resolvedModel,
      tone: validatedData.tone,
      style: validatedData.style,
      audience: validatedData.audience,
      length: validatedData.length,
      addEmojis: validatedData.addEmojis,
      addHashtags: validatedData.addHashtags,
      addCTA: validatedData.addCTA,
      maxLength: validatedData.maxLength,
      userId: user.id,
      intelligenceContext: aiContextPacket
        ? {
            promptContext: aiContextPacket?.promptContext,
            contextMetadata: aiContextPacket?.contextMetadata,
            brandProfile: aiContextPacket.intelligenceContext.brandProfile,
            recentTopPosts: aiContextPacket.intelligenceContext.recentTopPosts.slice(0, 4),
            recentFailedPosts: aiContextPacket.intelligenceContext.recentFailedPosts.slice(0, 3),
            currentPerformanceSummary: aiContextPacket.intelligenceContext.currentPerformanceSummary,
            campaignGoal: validatedData.campaignGoal,
            contentPillar: validatedData.contentPillar,
          }
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate AI content';
    await recordAIModelRun(serviceClient, {
      workspaceId: workspace.id,
      userId: user.id,
      feature: 'content_generation',
      promptVersion: 'create.generate.v2',
      model: resolvedModel,
      inputPayload: {
        prompt: refinedPrompt,
        platforms,
        tone: validatedData.tone,
        style: validatedData.style,
        audience: validatedData.audience,
        length: validatedData.length,
        useBrandBrain: validatedData.useBrandBrain,
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        contextMetadata: aiContextPacket?.contextMetadata,
      },
      status: 'failed',
      latencyMs: Date.now() - startTime,
      errorMessage: message,
    });
    throw new APIError(502, message, 'AI_GENERATE_FAILED');
  }

  const generationTime = Date.now() - startTime;
  const explanations = buildGenerationExplanations({
    platforms,
    generatedModel: generated.model,
    useBrandBrain: validatedData.useBrandBrain,
    aiContextPacket,
    contentPillar: validatedData.contentPillar,
    promptVersion: 'create.generate.v2',
  });

  // Store generation in database
  const { data: aiGeneration, error } = await supabase
    .from('ai_generations')
    .insert({
      workspace_id: workspace.id,
      created_by: user.id,
      prompt: validatedData.prompt,
      platform: platforms.length === 1 ? platforms[0] : 'multi',
      generated_content: {
        platform_content: generated.platformContent,
        hashtags: generated.hashtags,
        summary: generated.summary,
        analytics: generated.analytics,
        explanation: explanations.explanation,
        platform_explanations: explanations.platformExplanations,
      },
      model: generated.model,
      tokens_used: generated.tokenUsage,
      generation_time_ms: generationTime,
      parameters: {
        tone: validatedData.tone,
        style: validatedData.style,
        audience: validatedData.audience,
        length: validatedData.length,
        platforms,
        model: resolvedModel,
        addEmojis: validatedData.addEmojis,
        addHashtags: validatedData.addHashtags,
        addCTA: validatedData.addCTA,
        useBrandBrain: validatedData.useBrandBrain,
        campaignGoal: validatedData.campaignGoal,
        contentPillar: validatedData.contentPillar,
        brandCompletion: aiContextPacket?.contextMetadata.brandCompletion,
        contextSources: aiContextPacket?.contextMetadata.contextSources,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store AI generation:', error);
    // Don't fail the request if storage fails
  }

  const modelRun = await recordAIModelRun(serviceClient, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'content_generation',
    promptVersion: 'create.generate.v2',
    model: generated.model,
    inputPayload: {
      prompt: refinedPrompt,
      sourcePrompt: validatedData.prompt,
      platforms,
      tone: validatedData.tone,
      style: validatedData.style,
      audience: validatedData.audience,
      length: validatedData.length,
      addEmojis: validatedData.addEmojis,
      addHashtags: validatedData.addHashtags,
      addCTA: validatedData.addCTA,
      contextMetadata: aiContextPacket?.contextMetadata,
    },
    outputPayload: {
      platformContent: generated.platformContent,
      hashtags: generated.hashtags,
      summary: generated.summary,
      generationId: aiGeneration?.id,
      explanation: explanations.explanation,
      platformExplanations: explanations.platformExplanations,
    },
    status: 'succeeded',
    tokenUsage: generated.tokenUsage,
    latencyMs: generationTime,
    entityType: 'ai_generation',
    entityId: aiGeneration?.id ?? null,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'ai_generated',
    entityType: 'ai_generation',
    entityId: aiGeneration?.id ?? modelRun?.id ?? null,
    signalStrength: 0.7,
    metadata: {
      model: generated.model,
      platforms,
      generationId: aiGeneration?.id,
      modelRunId: modelRun?.id,
      usedBrandBrain: validatedData.useBrandBrain,
      contextMetadata: aiContextPacket?.contextMetadata,
      explanation: explanations.explanation,
    },
  });

  logger.ai('ai_generate', {
    userId: user.id,
    workspaceId: workspace.id,
    metadata: {
      platforms,
      tone: validatedData.tone,
      length: validatedData.length,
      model: resolvedModel,
    },
  });

  const response = successResponse({
    platformContent: generated.platformContent,
    hashtags: generated.hashtags,
    summary: generated.summary,
    analytics: generated.analytics,
    generationId: aiGeneration?.id,
    model: generated.model,
    explanation: explanations.explanation,
    platformExplanations: explanations.platformExplanations,
    context: aiContextPacket
      ? {
          brandCompletion: aiContextPacket.contextMetadata.brandCompletion,
          contextSources: aiContextPacket.contextMetadata.contextSources,
        }
      : undefined,
  });

  // Track API request with duration
  const totalDuration = Date.now() - startTime;
  logger.trackAPIRequest('POST', '/api/ai/generate', 200, totalDuration, {
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { model: resolvedModel, tokens: generated.tokenUsage },
  });

  return response;
});
