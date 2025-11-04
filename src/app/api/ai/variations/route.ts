import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-middleware';
import { generateVariations } from '@/lib/openai';
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
  await requireAuth(request);

  // Validate request
  const validatedData = await validateRequest(request, variationsSchema);

  // Generate variations
  const variations = await generateVariations(
    validatedData.content,
    validatedData.platform,
    validatedData.count
  );

  return successResponse({
    variations,
    count: variations.length,
  });
});

