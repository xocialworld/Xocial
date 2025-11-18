import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getSecurityHeaders } from '@/lib/security-headers';

/**
 * Middleware for authentication and security
 * Runs on every request except static assets
 */
export async function middleware(request: NextRequest) {
  // Skip authentication for webhook endpoints - they need to be publicly accessible
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    const response = NextResponse.next();
    
    // Still add security headers for webhooks
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // Update Supabase session for authenticated routes
  // Be resilient in development if environment variables are missing
  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (err) {
    // Avoid hard-failing the whole app due to auth/session setup
    response = NextResponse.next();
  }

  // Add comprehensive security headers
  const securityHeaders = getSecurityHeaders();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add additional context headers
  response.headers.set('X-API-Version', '1.0');
  response.headers.set('X-Response-Time', new Date().toISOString());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

