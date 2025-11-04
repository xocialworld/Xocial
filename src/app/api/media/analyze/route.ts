/**
 * Media Analysis API
 * AI-powered image analysis using OpenAI Vision
 * POST /api/media/analyze
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * Validation schema
 */
const analyzeSchema = z.object({
  mediaId: z.string().uuid(),
  url: z.string().url(),
});

/**
 * POST /api/media/analyze
 * Analyze image and generate metadata
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  const workspace = await getUserWorkspace(user.id);
  const { mediaId, url } = await validateRequest(request, analyzeSchema);

  logger.info('Media analysis requested', {
    userId: user.id,
    workspaceId: workspace.id,
    mediaId,
  });

  // Verify media belongs to workspace
  const { data: media, error: mediaError } = await supabase
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .eq('workspace_id', workspace.id)
    .single();

  if (mediaError || !media) {
    throw new APIError(404, 'Media not found', 'MEDIA_NOT_FOUND');
  }

  // Check if it's an image
  if (!media.mime_type?.startsWith('image/')) {
    throw new APIError(400, 'Only images can be analyzed', 'INVALID_MEDIA_TYPE');
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use OpenAI Vision to analyze the image
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and provide:
1. A concise description (1-2 sentences)
2. Relevant keywords/labels (comma-separated)
3. Suggested alt text for accessibility
4. Content category (product, person, landscape, food, etc.)

Return as JSON:
{
  "description": "...",
  "labels": ["label1", "label2", ...],
  "altText": "...",
  "category": "..."
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url,
                detail: 'low', // Use 'low' to save tokens
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    // Update media record with AI metadata
    const { error: updateError } = await supabase
      .from('media')
      .update({
        ai_labels: analysis.labels || [],
        ai_description: analysis.description || null,
        metadata: {
          ...media.metadata,
          aiAnalysis: {
            altText: analysis.altText,
            category: analysis.category,
            analyzedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', mediaId);

    if (updateError) {
      logger.error('Failed to update media with AI analysis', updateError as any);
      throw new APIError(500, 'Failed to save analysis', 'UPDATE_FAILED');
    }

    logger.info('Media analyzed successfully', {
      userId: user.id,
      mediaId,
      labelsCount: analysis.labels?.length || 0,
    });

    return successResponse({
      analysis: {
        description: analysis.description,
        labels: analysis.labels || [],
        altText: analysis.altText,
        category: analysis.category,
      },
    });
  } catch (error: any) {
    logger.error('AI media analysis failed', error, {
      userId: user.id,
      mediaId,
    });

    // Check if it's an OpenAI API error
    if (error.status === 429) {
      throw new APIError(429, 'AI service rate limit exceeded. Please try again later.', 'RATE_LIMIT');
    }

    throw new APIError(
      500,
      'Failed to analyze image. Please try again.',
      'ANALYSIS_FAILED'
    );
  }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

