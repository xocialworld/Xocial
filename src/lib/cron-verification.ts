/**
 * Cron Job Verification Utility
 * Verifies that cron job requests are authentic
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a request is from a valid cron job
 * Checks the Authorization header for the cron secret
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

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
        { status: 401 }
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
    { status: 500 }
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
  });
}

