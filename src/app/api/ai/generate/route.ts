import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  validateRequest,
  APIError,
  enforceUserRateLimit,
} from '@/lib/api-middleware';
import { generateContent } from '@/lib/openai';
import { logger } from '@/lib/logger';
import type { Platform } from '@/types';
import { AI_MODEL_IDS, DEFAULT_AI_MODEL } from '@/lib/ai/models';
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
  model: z.enum(AI_MODEL_IDS).optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'enthusiastic', 'informative']).optional(),
  style: z
    .enum(['informative', 'storytelling', 'educational', 'promotional', 'playful'])
    .optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  addEmojis: z.boolean().optional(),
  addHashtags: z.boolean().optional(),
  addCTA: z.boolean().optional(),
  maxLength: z.number().optional(),
});

/**
 * POST /api/ai/generate
 * Generate AI content for social media
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  // Validate request
  const validatedData = await validateRequest(request, generateSchema);

  const defaultPlatform: Platform = 'instagram';
  const platforms: Platform[] =
    validatedData.platforms ??
    (validatedData.platform ? [validatedData.platform] : [defaultPlatform]);
  const resolvedModel = validatedData.model ?? DEFAULT_AI_MODEL;

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  const startTime = Date.now();

  const limited = await enforceUserRateLimit(supabase, user.id, 'ai_generations', 'created_at', 60_000, 30);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Generate content using OpenAI
  let generated;
  try {
    generated = await generateContent({
      prompt: validatedData.prompt,
      platforms,
      model: resolvedModel,
      tone: validatedData.tone,
      style: validatedData.style,
      length: validatedData.length,
      addEmojis: validatedData.addEmojis,
      addHashtags: validatedData.addHashtags,
      addCTA: validatedData.addCTA,
      maxLength: validatedData.maxLength,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to generate AI content';
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
        length: validatedData.length,
        platforms,
        model: resolvedModel,
        addEmojis: validatedData.addEmojis,
        addHashtags: validatedData.addHashtags,
        addCTA: validatedData.addCTA,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store AI generation:', error);
    // Don't fail the request if storage fails
  }

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

