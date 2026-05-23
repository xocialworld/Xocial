/**
 * Cron Job Verification Utility
 * Verifies that cron job requests are authentic
 */

import { NextRequest, NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Verify that a request is from a valid cron job
 * Checks the Authorization header for the cron secret
 * 
 * In development mode:
 * - Allows requests without authentication (cron jobs don't run locally)
 * - Logs a warning if CRON_SECRET is missing
 * 
 * In production mode:
 * - Requires valid CRON_SECRET
 * - Rejects requests with invalid or missing authentication
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow cron requests without verification
  // since they're typically triggered manually for testing
  if (isDevelopment()) {
    if (!cronSecret) {
      console.warn('[Cron Verification] ⚠️  CRON_SECRET not configured (OK in development)');
    }
    console.log('[Cron Verification] Development mode - allowing request');
    return true;
  }

  // Production mode - strict verification required
  if (!cronSecret) {
    console.error('[Cron Verification] CRON_SECRET is not configured');
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  
  if (authHeader !== expectedAuth) {
    console.warn('[Cron Verification] Invalid cron secret provided');
    return false;
  }

  return true;
}

/**
 * Middleware wrapper for cron endpoints
 * Returns 401 if verification fails
 */
export function withCronVerification(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    return handler(request);
  };
}

/**
 * Create a consistent error response for cron jobs
 */
export function cronErrorResponse(message: string, details?: any): NextResponse {
  console.error('[Cron Error]', message, details);
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

/**
 * Create a consistent success response for cron jobs
 */
export function cronSuccessResponse(data: any): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }, {
    headers: NO_STORE_HEADERS,
  });
}
