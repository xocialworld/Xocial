import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const EngagementSchema = z.object({
  event: z.enum(['cta_click', 'nav_click', 'feature_interaction']),
  label: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.number().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const payload = await validateRequest(request, EngagementSchema);
  logger.info('Engagement Event', payload as any);
  return successResponse({ ok: true });
});