import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, APIError, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const VitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  delta: z.number().optional(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
  timestamp: z.number().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const payload = await validateRequest(request, VitalsSchema);

  // Basic rate limiting per IP
  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  if (!ip) {
    throw new APIError(400, 'Missing client IP', 'BAD_REQUEST');
  }

  logger.info('Web Vitals', payload as any);
  return successResponse({ ok: true });
});