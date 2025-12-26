import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const EngagementSchema = z.object({
  event: z.enum(['cta_click', 'nav_click', 'feature_interaction']),
  label: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.number().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const payload = await validateRequest(request, EngagementSchema);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_events').insert({
      event_type: payload.event,
      label: payload.label,
      url: payload.url,
      user_id: user?.id || null,
      metadata: {}, // Add any extra metadata if needed from payload
    });
  } catch (error) {
    logger.error('Failed to save engagement event', error as Error);
  }

  return successResponse({ ok: true });
});