import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { refineContent } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { z } from 'zod';

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
  ]),
});

/**
 * POST /api/ai/refine
 * Refine existing content with specific improvements
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, refineSchema);

  // Rate limit per user for AI refine
  const limited = checkRateLimit(`${user.id}:ai:refine`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Refine content
  const refinedText = await refineContent(
    validatedData.content,
    validatedData.platform,
    validatedData.refinementType
  );

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
  });

  const totalDuration = Date.now() - startTime;
  logger.trackAPIRequest('POST', '/api/ai/refine', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, type: validatedData.refinementType },
  });

  return response;
});

