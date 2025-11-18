/**
 * Security Headers for Next.js Middleware
 * Extracted from security.ts to work in Edge Runtime
 */

/**
 * Get security headers for Next.js middleware
 * Compatible with Edge Runtime (no Node.js modules)
 */
export function getSecurityHeaders(): Record<string, string> {
  // In development, allow WebSocket connections for Hot Module Replacement (HMR)
  const isDev = process.env.NODE_ENV === 'development';
  // Allow Vercel AI Gateway host as single AI entrypoint
  const gatewayUrl = process.env.VERCEL_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh';
  // Normalize to scheme+host for CSP
  const gatewayOrigin = (() => {
    try {
      const u = new URL(gatewayUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return 'https://ai-gateway.vercel.sh';
    }
  })();
  const connectSrc = isDev
    ? `connect-src 'self' ${gatewayOrigin} ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:* http://localhost:* https://*.supabase.co wss://*.supabase.co`
    : `connect-src 'self' ${gatewayOrigin} https://*.supabase.co wss://*.supabase.co`;

  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      connectSrc,
      "media-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection (legacy but still useful)
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Strict Transport Security (HTTPS only)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Permissions Policy (limit browser features)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',

    // Additional security headers
    'X-DNS-Prefetch-Control': 'on',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

