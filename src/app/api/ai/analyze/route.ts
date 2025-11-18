import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  validateRequest,
  APIError,
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

  // Check if Vercel AI Gateway is configured
  if (!process.env.VERCEL_AI_GATEWAY_API_KEY) {
    throw new APIError(
      501,
      'AI analysis is not configured. Please add VERCEL_AI_GATEWAY_API_KEY to environment variables.',
      'AI_NOT_CONFIGURED'
    );
  }

  // Validate request
  const validatedData = await validateRequest(request, analyzeSchema);

  const analysis = await analyzeContent(validatedData.content);
  return successResponse(analysis);
});

