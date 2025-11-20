/**
 * Rate Limiting Utility
 * In-memory rate limiting for API routes
 * Based on Xocial SRS Security Requirements
 * 
 * Note: For production, consider using Redis or a dedicated rate limiting service
 */

import { APIError } from '@/lib/api-error';

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
    // Authentication endpoints
    AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes

    // AI generation endpoints (expensive)
    AI_GENERATE: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
    AI_REFINE: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute

    // Standard API endpoints
    STANDARD: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute

    // Read-only endpoints
    READ: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 requests per minute

    // Write endpoints
    WRITE: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 requests per minute

    // Webhook endpoints
    WEBHOOK: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute
};

/**
 * Checks if a request should be rate limited
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @throws APIError.rateLimit if rate limit exceeded
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number = RATE_LIMITS.STANDARD.maxRequests,
    windowMs: number = RATE_LIMITS.STANDARD.windowMs
): void {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // No record or window expired - create new record
    if (!record || now > record.resetAt) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetAt: now + windowMs,
        });
        return;
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        throw APIError.rateLimit('Too many requests. Please try again later.', {
            retryAfter,
            limit: maxRequests,
            windowMs,
        });
    }

    // Increment counter
    record.count++;
}

/**
 * Rate limit middleware for API routes
 * @param identifier - Unique identifier
 * @param preset - Rate limit preset name
 */
export function rateLimitMiddleware(
    identifier: string,
    preset: keyof typeof RATE_LIMITS = 'STANDARD'
): void {
    const config = RATE_LIMITS[preset];
    checkRateLimit(identifier, config.maxRequests, config.windowMs);
}

/**
 * Gets rate limit info for an identifier
 * @param identifier - Unique identifier
 * @returns Rate limit information
 */
export function getRateLimitInfo(identifier: string): {
    remaining: number;
    resetAt: number;
    total: number;
} | null {
    const record = rateLimitStore.get(identifier);

    if (!record) {
        return null;
    }

    const now = Date.now();
    if (now > record.resetAt) {
        rateLimitStore.delete(identifier);
        return null;
    }

    return {
        remaining: Math.max(0, RATE_LIMITS.STANDARD.maxRequests - record.count),
        resetAt: record.resetAt,
        total: RATE_LIMITS.STANDARD.maxRequests,
    };
}

/**
 * Resets rate limit for an identifier
 * Useful for testing or admin overrides
 * @param identifier - Unique identifier
 */
export function resetRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier);
}

/**
 * Gets rate limit headers for response
 * @param identifier - Unique identifier
 * @param preset - Rate limit preset
 * @returns Headers object
 */
export function getRateLimitHeaders(
    identifier: string,
    preset: keyof typeof RATE_LIMITS = 'STANDARD'
): Record<string, string> {
    const config = RATE_LIMITS[preset];
    const info = getRateLimitInfo(identifier);

    if (!info) {
        return {
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': String(config.maxRequests),
            'X-RateLimit-Reset': String(Date.now() + config.windowMs),
        };
    }

    return {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.resetAt),
    };
}
