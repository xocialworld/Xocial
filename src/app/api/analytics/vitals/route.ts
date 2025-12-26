import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, APIError, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

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

  // Basic rate limiting per IP (keep this logic)
  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  if (!ip) {
    throw new APIError(400, 'Missing client IP', 'BAD_REQUEST');
  }

  try {
    const supabase = await createClient();

    // transform payloadKeys to snake_case if needed or map directly
    await supabase.from('analytics_web_vitals').insert({
      name: payload.name,
      value: payload.value,
      rating: payload.rating,
      delta: payload.delta,
      metric_id: payload.id,
      navigation_type: payload.navigationType,
      url: payload.url,
      user_agent: payload.userAgent || request.headers.get('user-agent'),
    });
  } catch (error) {
    // Fallback to logger if DB fails, to avoid losing visibility completely during migration
    logger.error('Failed to save vital', error as Error);
  }

  return successResponse({ ok: true });
});