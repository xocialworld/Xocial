import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * API Error class for consistent error handling
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
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
 * Get user's workspace (creates one if doesn't exist)
 */
export async function getUserWorkspace(userId: string) {
  const supabase = await createClient();
  
  // First, check if user has a profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new APIError(404, 'User profile not found. Please complete registration.', 'PROFILE_NOT_FOUND');
  }

  // Try to get workspace
  let { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .limit(1)
    .single();

  // If workspace doesn't exist, create one
  if (error || !workspace) {
    const { data: newWorkspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name: `${profile.name}'s Workspace`,
        slug: `workspace-${userId}`,
        owner_id: userId,
      })
      .select()
      .single();

    if (createError) {
      throw new APIError(500, `Failed to create workspace: ${createError.message}`, 'WORKSPACE_CREATE_FAILED');
    }

    workspace = newWorkspace;
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
      console.error('API Error:', error);
      
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
  console.error('API Error:', error);
  
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

