import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

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

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_ai_metrics').insert({
      event_type: payload.event,
      duration: payload.duration,
      metadata: payload.metadata || {},
      url: payload.url,
      user_id: user?.id || null,
    });
  } catch (error) {
    logger.error('Failed to save AI metric', error as Error);
  }

  return successResponse({ ok: true });
});