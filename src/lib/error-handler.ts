/**
 * API Error Handler for Next.js API Routes
 * Based on Xocial SRS Section 2.2.2
 */

import { NextResponse } from 'next/server';
import { APIError, isAPIError, APIErrorCode } from './api-error';

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleAPIError(error: unknown): NextResponse {
    // Log error for debugging (in production, send to error tracking service)
    console.error('[API Error]:', error);

    // Handle known APIError instances
    if (isAPIError(error)) {
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    // Handle Supabase errors
    if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code: string; message: string; details?: string };

        // Map common Supabase error codes
        if (supabaseError.code === 'PGRST116') {
            return NextResponse.json(
                {
                    error: 'Resource not found',
                    code: APIErrorCode.NOT_FOUND,
                    hint: 'The requested resource does not exist',
                },
                { status: 404 }
            );
        }

        if (supabaseError.code === '23505') {
            return NextResponse.json(
                {
                    error: 'Resource already exists',
                    code: APIErrorCode.ALREADY_EXISTS,
                    hint: 'A resource with these details already exists',
                },
                { status: 409 }
            );
        }

        if (supabaseError.code === '23503') {
            return NextResponse.json(
                {
                    error: 'Invalid reference',
                    code: APIErrorCode.DB_CONSTRAINT_ERROR,
                    hint: 'Referenced resource does not exist',
                },
                { status: 400 }
            );
        }

        // Generic Supabase error
        return NextResponse.json(
            {
                error: supabaseError.message || 'Database error',
                code: APIErrorCode.DB_ERROR,
                hint: 'Please try again or contact support',
                details: supabaseError.details,
            },
            { status: 500 }
        );
    }

    // Handle standard Error instances
    if (error instanceof Error) {
        return NextResponse.json(
            {
                error: error.message,
                code: APIErrorCode.INTERNAL_ERROR,
                hint: 'An unexpected error occurred. Please try again.',
            },
            { status: 500 }
        );
    }

    // Handle unknown errors
    return NextResponse.json(
        {
            error: 'An unexpected error occurred',
            code: APIErrorCode.UNKNOWN_ERROR,
            hint: 'Please try again later',
        },
        { status: 500 }
    );
}

/**
 * Wrap async API route handler with error handling
 */
export function withErrorHandling<T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
) {
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
export function validateRequiredFields(
    body: Record<string, any>,
    requiredFields: string[]
): void {
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
        throw APIError.validation(
            `Missing required fields: ${missingFields.join(', ')}`,
            { missing_fields: missingFields }
        );
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
export async function parseJSONBody<T = Record<string, any>>(
    request: Request
): Promise<T> {
    try {
        const body = await request.json();
        return body as T;
    } catch (error) {
        throw APIError.validation(
            'Invalid JSON in request body',
            { error: error instanceof Error ? error.message : 'Unknown parsing error' }
        );
    }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
}

/**
 * Created response helper
 */
export function createdResponse<T>(data: T): NextResponse {
    return NextResponse.json(data, { status: 201 });
}

/**
 * No content response helper
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 });
}
