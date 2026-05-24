/**
 * API Error Handler for Next.js API Routes
 * Based on Xocial SRS Section 2.2.2
 */

import { NextResponse } from 'next/server';
import { APIError, isAPIError, APIErrorCode } from './api-error';
import { apiError, apiSuccess } from '@/lib/contracts/api';

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleAPIError(error: unknown): NextResponse {
  // Log error for debugging (in production, send to error tracking service)
  console.error('[API Error]:', error);

  // Handle known APIError instances
  if (isAPIError(error)) {
    const body = error.toJSON();
    return apiError(
      {
        code: body.code || APIErrorCode.INTERNAL_ERROR,
        message: body.error || error.message,
        details: body.details,
        hint: body.hint,
      },
      error.statusCode
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };

    // Map common Supabase error codes
    if (supabaseError.code === 'PGRST116') {
      return apiError(
        {
          code: APIErrorCode.NOT_FOUND,
          message: 'Resource not found',
          hint: 'The requested resource does not exist',
        },
        404
      );
    }

    if (supabaseError.code === '23505') {
      return apiError(
        {
          code: APIErrorCode.ALREADY_EXISTS,
          message: 'Resource already exists',
          hint: 'A resource with these details already exists',
        },
        409
      );
    }

    if (supabaseError.code === '23503') {
      return apiError(
        {
          code: APIErrorCode.DB_CONSTRAINT_ERROR,
          message: 'Invalid reference',
          hint: 'Referenced resource does not exist',
        },
        400
      );
    }

    // Generic Supabase error
    return apiError(
      {
        code: APIErrorCode.DB_ERROR,
        message: supabaseError.message || 'Database error',
        hint: 'Please try again or contact support',
        details: supabaseError.details,
      },
      500
    );
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return apiError(
      {
        code: APIErrorCode.INTERNAL_ERROR,
        message: error.message,
        hint: 'An unexpected error occurred. Please try again.',
      },
      500
    );
  }

  // Handle unknown errors
  return apiError(
    {
      code: APIErrorCode.UNKNOWN_ERROR,
      message: 'An unexpected error occurred',
      hint: 'Please try again later',
    },
    500
  );
}

/**
 * Wrap async API route handler with error handling
 */
export function withErrorHandling<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter((field) => !body[field]);

  if (missingFields.length > 0) {
    throw APIError.validation(`Missing required fields: ${missingFields.join(', ')}`, {
      missing_fields: missingFields,
    });
  }
}

/**
 * Validate request method
 */
export function validateMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new APIError(
      405,
      APIErrorCode.VALIDATION_ERROR,
      `Method ${request.method} not allowed`,
      `Allowed methods: ${allowedMethods.join(', ')}`
    );
  }
}

/**
 * Parse and validate JSON body
 */
export async function parseJSONBody<T = Record<string, any>>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw APIError.validation('Invalid JSON in request body', {
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    });
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return apiSuccess(data, undefined, { status });
}

/**
 * Created response helper
 */
export function createdResponse<T>(data: T): NextResponse {
  return apiSuccess(data, undefined, { status: 201 });
}

/**
 * No content response helper
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
