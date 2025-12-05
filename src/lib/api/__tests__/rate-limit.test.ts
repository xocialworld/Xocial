/**
 * Rate Limiting Utility Tests
 * Tests for API rate limiting functionality
 */

import {
    checkRateLimit,
    rateLimitMiddleware,
    getRateLimitInfo,
    resetRateLimit,
    getRateLimitHeaders,
    RATE_LIMITS,
} from '../rate-limit';
import { APIError } from '../../api-error';

describe('Rate Limiting Utility', () => {
    beforeEach(() => {
        // Reset all rate limits before each test
        jest.clearAllMocks();
    });

    describe('checkRateLimit', () => {
        it('should allow requests within limit', () => {
            const identifier = 'user-test-1';

            // Should not throw for first request
            expect(() => checkRateLimit(identifier, 5, 60000)).not.toThrow();

            // Should not throw for subsequent requests within limit
            expect(() => checkRateLimit(identifier, 5, 60000)).not.toThrow();
            expect(() => checkRateLimit(identifier, 5, 60000)).not.toThrow();
        });

        it('should throw error when limit exceeded', () => {
            const identifier = 'user-test-2';
            const maxRequests = 3;

            // Make requests up to limit
            checkRateLimit(identifier, maxRequests, 60000);
            checkRateLimit(identifier, maxRequests, 60000);
            checkRateLimit(identifier, maxRequests, 60000);

            // Next request should throw
            expect(() => checkRateLimit(identifier, maxRequests, 60000)).toThrow('Rate limit exceeded');
        });

        it('should reset after window expires', async () => {
            const identifier = 'user-test-3';
            const windowMs = 100; // 100ms window for testing

            // Make requests up to limit
            checkRateLimit(identifier, 2, windowMs);
            checkRateLimit(identifier, 2, windowMs);

            // Should throw on next request
            expect(() => checkRateLimit(identifier, 2, windowMs)).toThrow();

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, windowMs + 10));

            // Should allow requests again
            expect(() => checkRateLimit(identifier, 2, windowMs)).not.toThrow();
        });

        it('should use default limits when not specified', () => {
            const identifier = 'user-test-4';

            // Should use STANDARD preset (100 requests/minute)
            expect(() => checkRateLimit(identifier)).not.toThrow();
        });

        it('should throw APIError with retry info', () => {
            const identifier = 'user-test-5';
            const maxRequests = 1;

            checkRateLimit(identifier, maxRequests, 60000);

            try {
                checkRateLimit(identifier, maxRequests, 60000);
                fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(APIError);
                expect((error as Error).message).toContain('Rate limit exceeded');
            }
        });
    });

    describe('rateLimitMiddleware', () => {
        it('should use AUTH preset correctly', () => {
            const identifier = 'user-auth-test';

            // AUTH preset: 5 requests per 15 minutes
            for (let i = 0; i < 5; i++) {
                expect(() => rateLimitMiddleware(identifier, 'AUTH')).not.toThrow();
            }

            // 6th request should throw
            expect(() => rateLimitMiddleware(identifier, 'AUTH')).toThrow();
        });

        it('should use AI_GENERATE preset correctly', () => {
            const identifier = 'user-ai-test';

            // AI_GENERATE preset: 20 requests per minute
            for (let i = 0; i < 20; i++) {
                expect(() => rateLimitMiddleware(identifier, 'AI_GENERATE')).not.toThrow();
            }

            // 21st request should throw
            expect(() => rateLimitMiddleware(identifier, 'AI_GENERATE')).toThrow();
        });

        it('should use STANDARD preset by default', () => {
            const identifier = 'user-standard-test';

            // STANDARD preset: 100 requests per minute
            expect(() => rateLimitMiddleware(identifier)).not.toThrow();
        });
    });

    describe('getRateLimitInfo', () => {
        it('should return null for new identifier', () => {
            const info = getRateLimitInfo('user-new');
            expect(info).toBeNull();
        });

        it('should return correct info after requests', () => {
            const identifier = 'user-info-test';

            checkRateLimit(identifier, 10, 60000);
            checkRateLimit(identifier, 10, 60000);

            const info = getRateLimitInfo(identifier);

            expect(info).not.toBeNull();
            expect(info?.remaining).toBeLessThan(100); // STANDARD limit
            expect(info?.total).toBe(100);
            expect(info?.resetAt).toBeGreaterThan(Date.now());
        });

        it('should return null after window expires', async () => {
            const identifier = 'user-expire-test';
            const windowMs = 50;

            checkRateLimit(identifier, 5, windowMs);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, windowMs + 10));

            const info = getRateLimitInfo(identifier);
            expect(info).toBeNull();
        });
    });

    describe('resetRateLimit', () => {
        it('should clear rate limit for identifier', () => {
            const identifier = 'user-reset-test';

            // Make requests up to limit
            checkRateLimit(identifier, 2, 60000);
            checkRateLimit(identifier, 2, 60000);

            // Should throw on next request
            expect(() => checkRateLimit(identifier, 2, 60000)).toThrow();

            // Reset limit
            resetRateLimit(identifier);

            // Should allow requests again
            expect(() => checkRateLimit(identifier, 2, 60000)).not.toThrow();
        });
    });

    describe('getRateLimitHeaders', () => {
        it('should return headers for new identifier', () => {
            const headers = getRateLimitHeaders('user-headers-test');

            expect(headers['X-RateLimit-Limit']).toBe('100'); // STANDARD limit
            expect(headers['X-RateLimit-Remaining']).toBe('100');
            expect(headers['X-RateLimit-Reset']).toBeDefined();
        });

        it('should return updated headers after requests', () => {
            const identifier = 'user-headers-test-2';

            checkRateLimit(identifier, 10, 60000);
            checkRateLimit(identifier, 10, 60000);

            const headers = getRateLimitHeaders(identifier);

            expect(headers['X-RateLimit-Limit']).toBe('100');
            expect(parseInt(headers['X-RateLimit-Remaining'])).toBeLessThan(100);
        });

        it('should use correct preset limits', () => {
            const headers = getRateLimitHeaders('user-ai-headers', 'AI_GENERATE');

            expect(headers['X-RateLimit-Limit']).toBe('20'); // AI_GENERATE limit
        });
    });

    describe('RATE_LIMITS presets', () => {
        it('should have all required presets', () => {
            expect(RATE_LIMITS.AUTH).toBeDefined();
            expect(RATE_LIMITS.AI_GENERATE).toBeDefined();
            expect(RATE_LIMITS.AI_REFINE).toBeDefined();
            expect(RATE_LIMITS.STANDARD).toBeDefined();
            expect(RATE_LIMITS.READ).toBeDefined();
            expect(RATE_LIMITS.WRITE).toBeDefined();
            expect(RATE_LIMITS.WEBHOOK).toBeDefined();
        });

        it('should have correct AUTH limits', () => {
            expect(RATE_LIMITS.AUTH.maxRequests).toBe(5);
            expect(RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000); // 15 minutes
        });

        it('should have correct AI_GENERATE limits', () => {
            expect(RATE_LIMITS.AI_GENERATE.maxRequests).toBe(20);
            expect(RATE_LIMITS.AI_GENERATE.windowMs).toBe(60 * 1000); // 1 minute
        });

        it('should have stricter limits for expensive operations', () => {
            // AI operations should be more limited than standard
            expect(RATE_LIMITS.AI_GENERATE.maxRequests).toBeLessThan(RATE_LIMITS.STANDARD.maxRequests);

            // Auth should be most restrictive
            expect(RATE_LIMITS.AUTH.maxRequests).toBeLessThan(RATE_LIMITS.STANDARD.maxRequests);

            // Webhooks should allow high volume
            expect(RATE_LIMITS.WEBHOOK.maxRequests).toBeGreaterThan(RATE_LIMITS.STANDARD.maxRequests);
        });
    });
});
