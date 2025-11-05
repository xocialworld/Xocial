/**
 * Security Utilities
 * Token encryption, webhook verification, CSRF protection
 * Based on SRS Section 9.2
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // Must be 64 hex characters (32 bytes)

/**
 * Validate encryption key on module load
 */
if (!ENCRYPTION_KEY) {
  console.error('[Security] ENCRYPTION_KEY is not configured');
} else if (ENCRYPTION_KEY.length !== 64) {
  console.error('[Security] ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

// ═══════════════════════════════════════════════════════════════
// TOKEN ENCRYPTION/DECRYPTION
// ═══════════════════════════════════════════════════════════════

/**
 * Encrypt a sensitive token (e.g., OAuth access token)
 * Returns: iv:authTag:encryptedData (all in hex)
 */
export function encryptToken(token: string): string {
  if (!token) {
    throw new Error('Token cannot be empty');
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Security] Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt an encrypted token
 * Expects format: iv:authTag:encryptedData (all in hex)
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    throw new Error('Encrypted token cannot be empty');
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  try {
    // Split the encrypted token
    const parts = encryptedToken.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt the token
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Security] Token decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify webhook signature using HMAC-SHA256
 * Used for Facebook, Instagram, and other webhooks
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    // Remove 'sha256=' prefix if present (Facebook format)
    const actualSignature = signature.startsWith('sha256=') 
      ? signature.substring(7) 
      : signature;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(actualSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Security] Webhook verification failed:', error);
    return false;
  }
}

/**
 * Verify webhook signature (alternative format for Twitter/X)
 * Uses SHA-256 with base64 encoding
 */
export function verifyWebhookSignatureBase64(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Security] Webhook verification (base64) failed:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CSRF TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a secure CSRF token
 * Returns a 64-character hex string
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token using constant-time comparison
 */
export function verifyCSRFToken(token: string, expected: string): boolean {
  if (!token || !expected) {
    return false;
  }

  if (token.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expected)
    );
  } catch (error) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize user input to prevent XSS
 * Removes potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitize HTML content
 * Strips all HTML tags (server-side)
 * For client-side, use DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim()
    .slice(0, 50000);
}

/**
 * Sanitize filename for uploads
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'untitled';

  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .slice(0, 255); // Limit length
}

// ═══════════════════════════════════════════════════════════════
// SECURE RANDOM GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a secure random string
 * Uses cryptographically secure random bytes
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a secure random hex string
 */
export function generateSecureHex(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random UUID
 */
export function generateSecureUUID(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD HASHING (if needed for custom auth)
// ═══════════════════════════════════════════════════════════════

/**
 * Hash a password using bcrypt-compatible PBKDF2
 * Note: Supabase handles password hashing, this is for reference
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a rate limit key from IP and identifier
 */
export function generateRateLimitKey(ip: string, identifier?: string): string {
  const base = `ratelimit:${ip}`;
  return identifier ? `${base}:${identifier}` : base;
}

/**
 * Hash an IP address for privacy-preserving rate limiting
 */
export function hashIPAddress(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_HASH_SALT || 'xocial-salt')
    .digest('hex')
    .substring(0, 16);
}

// ═══════════════════════════════════════════════════════════════
// DATA MASKING
// ═══════════════════════════════════════════════════════════════

/**
 * Mask sensitive data for logging
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) return '***';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask credit card number
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return '****';
  return `****-****-****-${cardNumber.slice(-4)}`;
}

// ═══════════════════════════════════════════════════════════════
// API KEY VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate API key format
 */
export function validateAPIKey(apiKey: string): boolean {
  // Check if API key matches expected format
  // Adjust pattern based on your API key format
  const apiKeyPattern = /^[A-Za-z0-9_-]{32,128}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * Generate API key
 */
export function generateAPIKey(): string {
  const prefix = 'xocial';
  const randomPart = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${randomPart}`;
}

// ═══════════════════════════════════════════════════════════════
// SECURE COMPARISON
// ═══════════════════════════════════════════════════════════════

/**
 * Constant-time string comparison
 * Prevents timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b)
    );
  } catch (error) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get security headers for Next.js middleware
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com",
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

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Check if a URL is safe (no javascript:, data:, etc.)
 */
export function isSafeURL(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    const safeProtocols = ['http:', 'https:'];
    return safeProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Redact sensitive information from objects for logging
 */
export function redactSensitiveData<T extends Record<string, any>>(
  obj: T,
  keysToRedact: string[] = ['password', 'token', 'secret', 'key', 'authorization']
): T {
  const redacted: Record<string, any> = { ...obj };

  for (const key of Object.keys(redacted)) {
    if (keysToRedact.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key], keysToRedact);
    }
  }

  return redacted as T;
}

/**
 * Generate a secure nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Validate and sanitize redirect URL
 * Prevents open redirect vulnerabilities
 */
export function sanitizeRedirectURL(url: string, allowedDomains: string[]): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url, 'https://dummy.com');
    
    // Only allow relative URLs or whitelisted domains
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      if (allowedDomains.includes(parsed.hostname)) {
        return url;
      }
    }
    
    // If it's a relative URL, return it
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }

    return null;
  } catch {
    // If URL parsing fails, only allow paths that start with /
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const Security = {
  encryptToken,
  decryptToken,
  verifyWebhookSignature,
  verifyWebhookSignatureBase64,
  generateCSRFToken,
  verifyCSRFToken,
  sanitizeInput,
  sanitizeHTML,
  sanitizeFilename,
  generateSecureToken,
  generateSecureHex,
  generateSecureUUID,
  getSecurityHeaders,
  isValidUUID,
  isSafeURL,
  redactSensitiveData,
  generateNonce,
  sanitizeRedirectURL,
  maskToken,
  maskEmail,
  maskCardNumber,
  secureCompare,
  validateAPIKey,
  generateAPIKey,
  hashPassword,
  verifyPassword,
  generateRateLimitKey,
  hashIPAddress,
};

export default Security;

