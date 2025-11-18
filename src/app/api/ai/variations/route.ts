import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
  checkRateLimit,
} from '@/lib/api-middleware';
import { generateVariations } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Validation schema for content variations
 */
const variationsSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  platform: z.string(),
  count: z.number().min(1).max(5).optional().default(3),
});

/**
 * POST /api/ai/variations
 * Generate content variations
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  const startTime = Date.now();

  // Validate request
  const validatedData = await validateRequest(request, variationsSchema);

  // Rate limit per user for variations
  const limited = checkRateLimit(`${user.id}:ai:variations`, 60, 60_000);
  if (!limited) {
    throw new APIError(429, 'Too many AI requests. Please wait a moment.', 'RATE_LIMIT');
  }

  // Generate variations
  const variations = await generateVariations(
    validatedData.content,
    validatedData.platform,
    validatedData.count
  );

  const response = successResponse({
    variations,
    count: variations.length,
  });

  const totalDuration = Date.now() - startTime;
  logger.trackAPIRequest('POST', '/api/ai/variations', 200, totalDuration, {
    userId: user.id,
    metadata: { platform: validatedData.platform, count: validatedData.count },
  });

  return response;
});

