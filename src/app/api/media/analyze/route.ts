/**
 * Media Analysis API
 * AI-powered image analysis using OpenAI Vision
 * POST /api/media/analyze
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAIGatewayApiKey, getAIGatewayBaseURL, getAIGatewayRequestToken } from '@/lib/ai/gateway';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
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
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);
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
    const payload = {
      model: 'openai/gpt-4o-mini',
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
}

Respond with ONLY this JSON object, no extra commentary or text.`,
            },
            {
              type: 'image_url',
              image_url: { url, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    } as any;

    const gatewayKey = getAIGatewayApiKey(getAIGatewayRequestToken(request));
    if (!gatewayKey) {
      throw new APIError(500, 'AI Gateway is not configured', 'AI_GATEWAY_NOT_CONFIGURED');
    }

    const response = await fetch(`${getAIGatewayBaseURL()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let err: any = {};
      try { err = await response.json(); } catch {}
      if (response.status === 429) {
        throw new APIError(429, 'AI service rate limit exceeded. Please try again later.', 'RATE_LIMIT');
      }
      throw new APIError(500, err?.error?.message || 'Failed to analyze image', 'ANALYSIS_FAILED');
    }

    const json = await response.json();
    const raw = json?.choices?.[0]?.message?.content || '{}';
    const analysis = JSON.parse(raw);

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
