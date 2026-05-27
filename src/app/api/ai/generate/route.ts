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
import { buildIntelligenceContext } from '@/lib/intelligence/context';
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
  const intelligenceContext = validatedData.useBrandBrain
    ? await buildIntelligenceContext(serviceClient, {
        workspaceId: workspace.id,
        selectedPlatforms: platforms,
        campaignGoal: validatedData.campaignGoal,
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
      intelligenceContext: intelligenceContext
        ? {
            brandProfile: intelligenceContext.brandProfile,
            recentTopPosts: intelligenceContext.recentTopPosts.slice(0, 4),
            recentFailedPosts: intelligenceContext.recentFailedPosts.slice(0, 3),
            currentPerformanceSummary: intelligenceContext.currentPerformanceSummary,
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
      },
      status: 'failed',
      latencyMs: Date.now() - startTime,
      errorMessage: message,
    });
    throw new APIError(502, message, 'AI_GENERATE_FAILED');
  }

  const generationTime = Date.now() - startTime;

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
        brandCompletion: intelligenceContext?.brandProfile?.confidence_score,
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
    },
    outputPayload: {
      platformContent: generated.platformContent,
      hashtags: generated.hashtags,
      summary: generated.summary,
      generationId: aiGeneration?.id,
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
