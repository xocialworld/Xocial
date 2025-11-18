import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const AIMetricSchema = z.object({
  event: z.literal('ai_generate'),
  duration: z.number(),
  metadata: z.object({
    platforms: z.array(z.string()).optional(),
    promptLength: z.number().optional(),
  }).optional(),
  url: z.string().url().optional(),
  timestamp: z.number().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const payload = await validateRequest(request, AIMetricSchema);
  logger.info('AI Metric', payload as any);
  return successResponse({ ok: true });
});