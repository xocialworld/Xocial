import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getWorkspaceFromRequest,
  successResponse,
  APIError,
} from '@/lib/api-middleware';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  const limit = Math.min(
    50,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10))
  );

  const { data, error } = await supabase
    .from('ai_generations')
    .select('id, prompt, platform, generated_content, parameters, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new APIError(500, `Failed to fetch AI history: ${error.message}`, 'AI_HISTORY_FAILED');
  }

  return successResponse({
    history: data ?? [],
  });
});

