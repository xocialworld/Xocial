import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-middleware';
import { analyzeContent } from '@/lib/openai';
import { z } from 'zod';

/**
 * Validation schema for content analysis
 */
const analyzeSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

/**
 * POST /api/ai/analyze
 * Analyze content sentiment and provide suggestions
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireAuth(request);

  // Validate request
  const validatedData = await validateRequest(request, analyzeSchema);

  // Analyze content
  const analysis = await analyzeContent(validatedData.content);

  return successResponse(analysis);
});

