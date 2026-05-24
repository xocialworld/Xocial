import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { slugify } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiEnvelope, ApiMeta } from '@/lib/contracts/api';

/**
 * API Error class for consistent error handling
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: ApiMeta | Record<string, unknown>;
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  meta?: APIResponse['meta']
): NextResponse<ApiEnvelope<T, APIResponse['meta']>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  } as ApiEnvelope<T, APIResponse['meta']>);
}

/**
 * Create error response
 */
export function errorResponse(
  error: APIError | Error,
  statusCode: number = 500
): NextResponse<APIResponse> {
  const code = error instanceof APIError ? error.code : 'INTERNAL_ERROR';
  const status = error instanceof APIError ? error.statusCode : statusCode;

  return NextResponse.json(
    {
      success: false,
      error: {
        message: error.message,
        code: code || 'INTERNAL_ERROR',
        ...(error instanceof APIError && error.details ? { details: error.details } : {}),
      },
    },
    { status }
  );
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new APIError(400, 'Validation error', 'VALIDATION_ERROR');
    }
    throw new APIError(400, 'Invalid request body', 'INVALID_BODY');
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    // Bootstrap: ensure profile exists
    try {
      await ensureUserProfile(user, supabase);
    } catch (e) {
      // Allow downstream routes to handle if needed
    }

    return { user, supabase };
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearerToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const bearerClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      });
      const {
        data: { user: bearerUser },
        error: bearerError,
      } = await bearerClient.auth.getUser(bearerToken);

      if (!bearerError && bearerUser) {
        try {
          await ensureUserProfile(bearerUser, bearerClient);
        } catch (e) {
          // Allow downstream routes to handle if needed
        }

        return { user: bearerUser, supabase: bearerClient };
      }
    }
  }

  throw new APIError(401, 'Unauthorized', 'UNAUTHORIZED');
}

/**
 * Create a Supabase client with service role to bypass RLS
 * Use ONLY for admin operations like workspace creation
 */
export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new APIError(
      500,
      'Supabase service role credentials not configured',
      'SERVICE_ROLE_NOT_CONFIGURED'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'creator'
  | 'analyst'
  | 'client'
  | 'editor'
  | 'viewer'
  | 'guest'
  | 'member';

async function ensureWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'owner'
): Promise<boolean> {
  const { error } = await supabase.from('workspace_members').upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role,
    },
    { onConflict: 'workspace_id,user_id' }
  );
  return !error;
}

function isMissingAccountSchemaError(error: any) {
  const code = error?.code;
  const message = String(error?.message || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST205' ||
    message.includes("Could not find the table 'public.accounts'") ||
    message.includes("Could not find the 'account_id' column")
  );
}

export async function ensureUserProfile(
  user: { id: string; email?: string | null; user_metadata?: any },
  existingClient?: SupabaseClient
) {
  const supabase = existingClient ?? (await createClient());
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const nameCandidate =
    (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) ||
    (user.email ? String(user.email).split('@')[0] : 'User');
  const email = user.email ?? `${user.id}@local.invalid`;

  const { error } = await supabase
    .from('profiles')
    .insert({ id: user.id, email, name: nameCandidate })
    .select()
    .single();

  if (error) {
    throw new APIError(500, `Failed to create profile: ${error.message}`, 'PROFILE_CREATE_ERROR');
  }
}

async function ensureAccountForProfile(
  serviceClient: SupabaseClient,
  profile: { id: string; name: string; email?: string | null }
) {
  const { data: existing, error: existingError } = await serviceClient
    .from('accounts')
    .select('*')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await serviceClient
      .from('account_members')
      .upsert(
        { account_id: existing.id, user_id: profile.id, role: 'owner' },
        { onConflict: 'account_id,user_id' }
      );
    return existing;
  }

  // Older databases do not have the account billing layer yet. Keep onboarding
  // functional until the migration is applied.
  if (isMissingAccountSchemaError(existingError)) {
    return null;
  }

  const accountName = profile.name?.trim() || profile.email?.split('@')[0] || 'Xocial Account';
  const slug = `${slugify(accountName) || 'account'}-${profile.id.replace(/-/g, '').slice(0, 8)}`;

  const { data: account, error } = await serviceClient
    .from('accounts')
    .insert({
      owner_id: profile.id,
      name: accountName,
      slug,
    })
    .select()
    .single();

  if (error || !account) {
    if (isMissingAccountSchemaError(error)) {
      return null;
    }
    throw new APIError(500, error?.message || 'Unable to create account', 'ACCOUNT_CREATE_FAILED');
  }

  await serviceClient
    .from('account_members')
    .upsert(
      { account_id: account.id, user_id: profile.id, role: 'owner' },
      { onConflict: 'account_id,user_id' }
    );

  return account;
}

/**
 * Create workspace for user using service role to bypass RLS
 * This prevents infinite recursion in workspace policies
 */
async function createWorkspaceForUser(
  profile: { id: string; name: string; email?: string | null },
  userClient?: SupabaseClient
) {
  const serviceClient = createServiceRoleClient();
  const account = await ensureAccountForProfile(serviceClient, profile);

  const baseName = profile.name?.trim() || profile.email?.split('@')[0] || 'Workspace';
  const workspaceName = baseName.endsWith("'s Workspace") ? baseName : `${baseName}'s Workspace`;

  const slugBase = slugify(baseName || 'workspace') || 'workspace';
  const uniqueSuffix = profile.id.replace(/-/g, '').slice(0, 8);
  const slug = `${slugBase}-${uniqueSuffix}`;
  // If a workspace already exists for this owner, return it to avoid duplicates
  const { data: existingOwned, error: existingOwnedError } = await serviceClient
    .from('workspaces')
    .select('*')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingOwnedError) {
    logger.warn?.('Workspace lookup failed, will attempt creation', existingOwnedError as any);
  }

  if (existingOwned) {
    await ensureWorkspaceMembership(serviceClient, existingOwned.id, profile.id, 'owner');
    if (account?.id && !(existingOwned as any).account_id) {
      const { error: accountLinkError } = await serviceClient
        .from('workspaces')
        .update({ account_id: account.id })
        .eq('id', existingOwned.id);

      if (!accountLinkError) {
        return { ...existingOwned, account_id: account.id };
      }
    }
    return existingOwned;
  }

  const insertClient = userClient ?? serviceClient;
  const { data: newWorkspace, error } = await insertClient
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug,
      owner_id: profile.id,
      ...(account?.id ? { account_id: account.id } : {}),
    })
    .select()
    .single();

  if (error || !newWorkspace) {
    if (account?.id && isMissingAccountSchemaError(error)) {
      const { data: legacyWorkspace, error: legacyError } = await insertClient
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug,
          owner_id: profile.id,
        })
        .select()
        .single();

      if (legacyWorkspace) {
        await ensureWorkspaceMembership(serviceClient, legacyWorkspace.id, profile.id, 'owner');
        return legacyWorkspace;
      }

      if (legacyError) {
        logger.error('Legacy workspace creation failed', legacyError as any, {
          userId: profile.id,
          workspaceName,
        });
      }
    }

    // Handle unique slug conflicts by fetching existing owned workspace
    const isUniqueViolation =
      (error as any)?.code === '23505' ||
      String((error as any)?.message || '').includes('workspaces_slug_key');
    if (isUniqueViolation) {
      const { data: owned, error: ownedErr } = await serviceClient
        .from('workspaces')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (owned) {
        await ensureWorkspaceMembership(serviceClient, owned.id, profile.id, 'owner');
        return owned;
      }
      if (ownedErr) {
        logger.error('Workspace create conflict and lookup failed', ownedErr as any);
      }
    }
    logger.error('Failed to create workspace', error as Error, {
      userId: profile.id,
      workspaceName,
    });
    throw new APIError(
      500,
      `Failed to create workspace: ${error?.message}`,
      'WORKSPACE_CREATE_FAILED'
    );
  }

  await ensureWorkspaceMembership(serviceClient, newWorkspace.id, profile.id, 'owner');

  logger.info('Workspace created successfully', {
    workspaceId: newWorkspace.id,
    userId: profile.id,
    workspaceName: newWorkspace.name,
  });

  return newWorkspace;
}

/**
 * Get user's workspace (creates one if it doesn't exist)
 */
export async function getUserWorkspace(userId: string, existingClient?: SupabaseClient) {
  const userClient = existingClient ?? (await createClient());
  const serviceClient = createServiceRoleClient();

  // Read profile using user client to satisfy RLS
  let { data: profile } = await userClient
    .from('profiles')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();

  // If profile missing, attempt to create it using user session
  if (!profile) {
    const { data: authUser } = await userClient.auth.getUser();
    if (!authUser?.user) {
      throw new APIError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    await ensureUserProfile(authUser.user, userClient);
    const { data: reloaded } = await userClient
      .from('profiles')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();
    if (!reloaded) {
      throw new APIError(
        404,
        'User profile not found. Please complete registration.',
        'PROFILE_NOT_FOUND'
      );
    }
    profile = reloaded;
  }

  const { data: membership } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    const { data: workspace, error: wsError } = await serviceClient
      .from('workspaces')
      .select('*')
      .eq('id', membership.workspace_id)
      .single();
    if (wsError || !workspace) {
      throw new APIError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
    }
    return workspace;
  }

  const { data: ownedWorkspace } = await serviceClient
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedWorkspace) {
    await ensureWorkspaceMembership(serviceClient, ownedWorkspace.id, userId, 'owner');
    return ownedWorkspace;
  }

  return createWorkspaceForUser(profile, userClient);
}

export async function getWorkspaceFromRequest(
  userId: string,
  request: NextRequest,
  existingClient?: SupabaseClient
) {
  const workspaceId =
    request.nextUrl.searchParams.get('workspaceId') || request.headers.get('x-workspace-id');

  const supabase = existingClient ?? (await createClient());

  if (!workspaceId) {
    return getUserWorkspace(userId, supabase);
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (workspaceError || !workspace) {
    throw new APIError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
  }

  if (workspace.owner_id === userId) {
    return workspace;
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new APIError(403, 'Access denied to workspace', 'ACCESS_DENIED');
  }

  return workspace;
}

/**
 * Check workspace access
 */
export async function checkWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole> {
  const supabase = await createClient();

  // First check if user is the workspace owner
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if (workspace?.owner_id === userId) {
    return 'owner';
  }

  // Then check workspace_members table
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    throw new APIError(403, 'Access denied', 'ACCESS_DENIED');
  }

  return data.role;
}

/**
 * Pagination helper
 */
export function getPagination(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function enforceUserRateLimit(
  supabase: SupabaseClient,
  userId: string,
  table: 'ai_generations' | 'api_call_logs',
  timeColumn: 'created_at' | 'generation_time_ms' | 'created_at',
  windowMs: number,
  maxRequests: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte(timeColumn, since);
  const byUser =
    table === 'ai_generations' ? query.eq('created_by', userId) : query.eq('user_id', userId);
  const { count, error } = await byUser;
  if (error) {
    return true;
  }
  return (count ?? 0) < maxRequests;
}

/**
 * API handler wrapper with error handling
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      logger.error('API Error', error as Error);

      if (error instanceof APIError) {
        return errorResponse(error);
      }

      return errorResponse(new Error('An unexpected error occurred'), 500);
    }
  };
}

/**
 * Log API call
 */
export async function logAPICall(
  workspaceId: string | null,
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: string
) {
  const supabase = await createClient();

  await supabase.from('api_call_logs').insert({
    workspace_id: workspaceId,
    user_id: userId,
    endpoint,
    method,
    status_code: statusCode,
    duration_ms: duration,
    error_message: error,
  });
}

/**
 * Handle API errors
 */
export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof Error) {
    logger.error('API Error', error);
  } else {
    logger.error('API Error (unknown)', new Error(String(error)));
  }

  if (error instanceof APIError) {
    return errorResponse(error);
  }

  if (error instanceof Error) {
    return errorResponse(new APIError(500, error.message), 500);
  }

  return errorResponse(new APIError(500, 'An unexpected error occurred'), 500);
}
