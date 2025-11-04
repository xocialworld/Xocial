import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-middleware';
import { generateHashtags } from '@/lib/openai';
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
  await requireAuth(request);

  // Validate request
  const validatedData = await validateRequest(request, hashtagSchema);

  // Generate hashtags
  const hashtags = await generateHashtags(
    validatedData.content,
    validatedData.platform,
    validatedData.count
  );

  return successResponse({
    hashtags,
    count: hashtags.length,
  });
});

