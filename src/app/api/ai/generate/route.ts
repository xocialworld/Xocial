import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { generateContent } from '@/lib/openai';
import { z } from 'zod';

/**
 * Validation schema for content generation
 */
const generateSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube']),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  tone: z.enum(['professional', 'casual', 'friendly', 'enthusiastic', 'informative']).optional(),
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

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  const startTime = Date.now();

  // Generate content using OpenAI
  const generated = await generateContent({
    platform: validatedData.platform,
    prompt: validatedData.prompt,
    tone: validatedData.tone,
    addEmojis: validatedData.addEmojis,
    addHashtags: validatedData.addHashtags,
    addCTA: validatedData.addCTA,
    maxLength: validatedData.maxLength,
  });

  const generationTime = Date.now() - startTime;

  // Store generation in database
  const { data: aiGeneration, error } = await supabase
    .from('ai_generations')
    .insert({
      workspace_id: workspace.id,
      created_by: user.id,
      prompt: validatedData.prompt,
      platform: validatedData.platform,
      generated_content: {
        text: generated.text,
        hashtags: generated.hashtags,
        mentions: generated.mentions,
      },
      model: 'gpt-4',
      tokens_used: Math.ceil(generated.estimatedCharCount / 4), // Rough estimate
      generation_time_ms: generationTime,
      parameters: {
        tone: validatedData.tone,
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

  return successResponse({
    ...generated,
    generationId: aiGeneration?.id,
  });
});

