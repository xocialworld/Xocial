import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { generateHashtags } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Validation schema for hashtag generation
 */
const hashtagSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: z.string(),
  count: z.number().min(1).max(30).optional().default(5),
});

/**
 * POST /api/ai/hashtags
 * Generate relevant hashtags for content
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, hashtagSchema);

  // Rate limit per user for hashtag generation
  const limited = checkRateLimit(`${user.id}:ai:hashtags`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Generate hashtags
  const hashtags = await generateHashtags(
    validatedData.content,
    validatedData.platform,
    validatedData.count
  );

  const response = successResponse({
    hashtags,
    count: hashtags.length,
  });

  const totalDuration = Date.now() - startTime;
  logger.trackAPIRequest('POST', '/api/ai/hashtags', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, count: validatedData.count },
  });

  return response;
});

