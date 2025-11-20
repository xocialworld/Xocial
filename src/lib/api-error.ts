/**
 * API Error handling utilities
 * Based on Xocial SRS Section 2.2.2
 */

/**
 * Standard API error codes
 */
export enum APIErrorCode {
    // Authentication & Authorization
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',

    // Resources
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // Rate Limiting
    RATE_LIMIT = 'RATE_LIMIT',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

    // External Services
    PLATFORM_API_ERROR = 'PLATFORM_API_ERROR',
    AI_GENERATION_ERROR = 'AI_GENERATION_ERROR',
    OAUTH_ERROR = 'OAUTH_ERROR',

    // Database
    DB_ERROR = 'DB_ERROR',
    DB_CONSTRAINT_ERROR = 'DB_CONSTRAINT_ERROR',

    // Business Logic
    POST_PUBLISHED = 'POST_PUBLISHED',
    ACCOUNT_DISCONNECTED = 'ACCOUNT_DISCONNECTED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',

    // Generic
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(
        public statusCode: number,
        public code: APIErrorCode,
        message: string,
        public hint?: string,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = 'APIError';

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }

    /**
     * Convert to JSON response format
     */
    toJSON() {
        return {
            error: this.message,
            code: this.code,
            hint: this.hint,
            details: this.details,
        };
    }

    /**
     * Factory methods for common errors
     */
    static unauthorized(message = 'Unauthorized', hint?: string): APIError {
        return new APIError(401, APIErrorCode.UNAUTHORIZED, message, hint);
    }

    static forbidden(message = 'Forbidden', hint?: string): APIError {
        return new APIError(403, APIErrorCode.FORBIDDEN, message, hint);
    }

    static notFound(resource: string, hint?: string): APIError {
        return new APIError(
            404,
            APIErrorCode.NOT_FOUND,
            `${resource} not found`,
            hint || `The requested ${resource.toLowerCase()} does not exist`
        );
    }

    static validation(message: string, details?: Record<string, any>): APIError {
        return new APIError(
            400,
            APIErrorCode.VALIDATION_ERROR,
            message,
            'Please check your input and try again',
            details
        );
    }

    static conflict(message: string, hint?: string): APIError {
        return new APIError(409, APIErrorCode.CONFLICT, message, hint);
    }

    static rateLimit(retryAfter?: number): APIError {
        return new APIError(
            429,
            APIErrorCode.RATE_LIMIT,
            'Rate limit exceeded',
            retryAfter ? `You can try again in ${retryAfter} seconds` : 'Please try again later',
            { retry_after: retryAfter }
        );
    }

    static internal(message = 'An unexpected error occurred', hint?: string): APIError {
        return new APIError(
            500,
            APIErrorCode.INTERNAL_ERROR,
            message,
            hint || 'Please try again later'
        );
    }

    static platformAPI(platform: string, originalError?: string): APIError {
        return new APIError(
            502,
            APIErrorCode.PLATFORM_API_ERROR,
            `${platform} API error`,
            'There was an issue connecting to the social platform. Please try again.',
            { platform, original_error: originalError }
        );
    }

    static aiGeneration(hint?: string): APIError {
        return new APIError(
            500,
            APIErrorCode.AI_GENERATION_ERROR,
            'AI generation failed',
            hint || 'You can still write content manually'
        );
    }

    static tokenExpired(platform: string): APIError {
        return new APIError(
            401,
            APIErrorCode.TOKEN_EXPIRED,
            `${platform} token expired`,
            `Please reconnect your ${platform} account`,
            { platform }
        );
    }
}

/**
 * Type guard to check if error is APIError
 */
export function isAPIError(error: unknown): error is APIError {
    return error instanceof APIError;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (isAPIError(error)) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unknown error occurred';
}

/**
 * Extract error code from unknown error
 */
export function getErrorCode(error: unknown): APIErrorCode {
    if (isAPIError(error)) {
        return error.code;
    }

    return APIErrorCode.UNKNOWN_ERROR;
}
