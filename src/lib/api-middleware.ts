import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { slugify } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  meta?: APIResponse['meta']
): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
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
        code,
        ...(error instanceof APIError && error.details
          ? { details: error.details }
          : {}),
      },
    },
    { status }
  );
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new APIError(
        400,
        'Validation error',
        'VALIDATION_ERROR'
      );
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

  if (error || !user) {
    throw new APIError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  return { user, supabase };
}

/**
 * Create a Supabase client with service role to bypass RLS
 * Use ONLY for admin operations like workspace creation
 */
function createServiceRoleClient(): SupabaseClient {
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

type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'client';

async function ensureWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'owner'
) {
  const { error } = await supabase
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        role,
      },
      { onConflict: 'workspace_id,user_id' }
    );

  if (error) {
    throw new APIError(500, `Failed to link user to workspace: ${error.message}`, 'WORKSPACE_MEMBERSHIP_FAILED');
  }
}

/**
 * Create workspace for user using service role to bypass RLS
 * This prevents infinite recursion in workspace policies
 */
async function createWorkspaceForUser(
  profile: { id: string; name: string; email?: string | null }
) {
  // Use service role client to bypass RLS policies
  const serviceClient = createServiceRoleClient();

  const baseName =
    profile.name?.trim() ||
    profile.email?.split('@')[0] ||
    'Workspace';
  const workspaceName = baseName.endsWith("'s Workspace")
    ? baseName
    : `${baseName}'s Workspace`;

  const slugBase = slugify(baseName || 'workspace') || 'workspace';
  const uniqueSuffix = profile.id.replace(/-/g, '').slice(0, 8);
  const slug = `${slugBase}-${uniqueSuffix}`;

  // Create workspace with service role (bypasses RLS)
  const { data: newWorkspace, error } = await serviceClient
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug,
      owner_id: profile.id,
    })
    .select()
    .single();

  if (error || !newWorkspace) {
    logger.error('Failed to create workspace', error as Error, {
      userId: profile.id,
      workspaceName,
    });
    throw new APIError(500, `Failed to create workspace: ${error?.message}`, 'WORKSPACE_CREATE_FAILED');
  }

  // Create workspace membership with service role (bypasses RLS)
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
  const supabase = existingClient ?? await createClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new APIError(404, 'User profile not found. Please complete registration.', 'PROFILE_NOT_FOUND');
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspace_id (*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.workspace) {
    return membership.workspace;
  }

  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedWorkspace) {
    await ensureWorkspaceMembership(supabase, ownedWorkspace.id, userId, 'owner');
    return ownedWorkspace;
  }

  // No existing workspace found, create a new one
  // Note: createWorkspaceForUser uses service role client internally
  return createWorkspaceForUser(profile);
}

export async function getWorkspaceFromRequest(
  userId: string,
  request: NextRequest,
  existingClient?: SupabaseClient
) {
  const workspaceId =
    request.nextUrl.searchParams.get('workspaceId') ||
    request.headers.get('x-workspace-id');

  const supabase = existingClient ?? (await createClient());

  if (!workspaceId) {
    return getUserWorkspace(userId, supabase);
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new APIError(403, 'Access denied to workspace', 'ACCESS_DENIED');
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (workspaceError || !workspace) {
    throw new APIError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND');
  }

  return workspace;
}

/**
 * Check workspace access
 */
export async function checkWorkspaceAccess(
  userId: string,
  workspaceId: string
) {
  const supabase = await createClient();

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
    table === 'ai_generations'
      ? query.eq('created_by', userId)
      : query.eq('user_id', userId);
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

      return errorResponse(
        new Error('An unexpected error occurred'),
        500
      );
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

  return errorResponse(
    new APIError(500, 'An unexpected error occurred'),
    500
  );
}

