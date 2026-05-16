import { NextRequest } from 'next/server';
import {
  APIError,
  successResponse,
  withErrorHandler,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

const SAFE_ACCOUNT_SELECT = [
  'id',
  'workspace_id',
  'platform',
  'account_id',
  'account_name',
  'account_handle',
  'account_avatar',
  'token_expires_at',
  'connected_at',
  'is_active',
  'assigned_user_id',
  'follower_count',
  'last_synced_at',
  'metadata',
  'created_at',
  'updated_at',
].join(',');

const SENSITIVE_KEY_PATTERN = /(access_token|refresh_token|token|secret|authorization|api_key)/i;

function sanitizeAccountMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAccountMetadata);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, metadataValue]) => [key, sanitizeAccountMetadata(metadataValue)])
  );
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
  });
  const pathParts = request.nextUrl.pathname.split('/');
  const accountId = pathParts[pathParts.indexOf('accounts') + 1];

  if (!accountId || accountId === 'accounts') {
    throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
  }

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select(SAFE_ACCOUNT_SELECT)
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .maybeSingle();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!account) {
    throw new APIError(404, 'Social account not found', 'ACCOUNT_NOT_FOUND');
  }

  const accountRow = account as Record<string, any>;

  return successResponse({
    ...accountRow,
    metadata: sanitizeAccountMetadata(accountRow.metadata),
  });
});
