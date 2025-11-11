import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  getPagination,
  APIError,
} from '@/lib/api-middleware';

/**
 * GET /api/accounts - List user's social accounts
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const { page, limit, offset } = getPagination(request);
  const platformFilter = request.nextUrl.searchParams.get('platform');

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Get social accounts
  let query = supabase
    .from('social_accounts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .eq('is_active', true);

  if (platformFilter) {
    query = query.eq('platform', platformFilter);
  }

  const { data: accounts, error, count } = await query
    .order('connected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse(
    {
      accounts: accounts || [],
    },
    {
      page,
      limit,
      total: count || 0,
    }
  );
});

/**
 * POST /api/accounts - Create/connect a new social account
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const { platform, account_id, account_name, access_token, refresh_token } = body;

  // Validate required fields
  if (!platform || !account_id || !account_name || !access_token) {
    throw new APIError(400, 'Missing required fields', 'VALIDATION_ERROR');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Check if account already exists
  const { data: existing } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('platform', platform)
    .eq('account_id', account_id)
    .single();

  if (existing) {
    throw new APIError(409, 'Account already connected', 'ACCOUNT_EXISTS');
  }

  // Create social account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .insert({
      workspace_id: workspace.id,
      platform,
      account_id,
      account_name,
      access_token,
      refresh_token,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ account }, { page: 1, limit: 1, total: 1 });
});

/**
 * DELETE /api/accounts/:id - Disconnect a social account
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  const url = new URL(request.url);
  const accountId = url.pathname.split('/').pop();

  if (!accountId) {
    throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Deactivate the account (soft delete)
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('workspace_id', workspace.id);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ message: 'Account disconnected successfully' });
});

