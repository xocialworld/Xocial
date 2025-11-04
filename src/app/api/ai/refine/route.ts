import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-middleware';
import { refineContent } from '@/lib/openai';
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
  await requireAuth(request);

  // Validate request
  const validatedData = await validateRequest(request, refineSchema);

  // Refine content
  const refinedText = await refineContent(
    validatedData.content,
    validatedData.platform,
    validatedData.refinementType
  );

  return successResponse({
    text: refinedText,
    original: validatedData.content,
    refinementType: validatedData.refinementType,
  });
});

