import { NextRequest } from 'next/server';
import { withErrorHandler, requireAuth, successResponse, APIError } from '@/lib/api-middleware';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const body = await request.json();
  const feature_name = String(body?.feature_name || '').trim();
  const interested = Boolean(body?.interested);

  if (!feature_name) {
    throw new APIError(400, 'feature_name is required', 'VALIDATION_ERROR');
  }

  const { error } = await supabase
    .from('feature_waitlist')
    .upsert(
      {
        user_id: user.id,
        feature_name,
        interested,
      },
      { onConflict: 'user_id,feature_name' }
    );

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ ok: true });
});