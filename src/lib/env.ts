/**
 * Environment Variable Validation
 * Validates all required environment variables on app startup
 * Provides type-safe access to env vars
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * All required variables for the application
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required for server-side operations',
  }),

  // Vercel AI Gateway Configuration
  VERCEL_AI_GATEWAY_API_KEY: z.string().optional(),
  VERCEL_AI_GATEWAY_URL: z.string().url().optional().default('https://ai-gateway.vercel.sh'),
  VERCEL_AI_GATEWAY_ORDER: z.string().optional(),

  // Direct OpenAI Configuration (Alternative to Gateway)
  OPENAI_API_KEY: z.string().optional(),

  // Encryption & Security
  ENCRYPTION_KEY: z.string().length(64, {
    message: 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
  }).regex(/^[0-9a-f]{64}$/i, {
    message: 'ENCRYPTION_KEY must be a valid hex string',
  }),
  // CRON_SECRET is only required in production (for Vercel cron jobs)
  // In development, it's optional since cron jobs don't run locally
  CRON_SECRET: z.string().min(32, {
    message: 'CRON_SECRET must be at least 32 characters for security',
  }).optional(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_LEVERAGE: z.string().optional(),

  // OAuth - Facebook
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // OAuth - Instagram (uses Facebook)
  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),

  // OAuth - Twitter/X
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),

  // OAuth - LinkedIn
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // OAuth - YouTube
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),

  // OAuth - TikTok
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  // Webhook Verification Tokens
  FACEBOOK_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  TWITTER_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Optional Features
  IP_HASH_SALT: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  DEMO_PUBLISH: z.string().optional(),
});

/**
 * Validated and type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Throws an error with helpful messages if validation fails
 */
function validateEnv(): Env {
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Check if we're in a build environment or development
  const isBuild = process.env.NODE_ENV === 'production' && process.env.CI === '1';
  const shouldSkipValidation = isBuild || process.env.SKIP_ENV_VALIDATION === '1';

  try {
    const parsed = envSchema.parse(process.env);

    parsed.NEXT_PUBLIC_SUPABASE_URL = parsed.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/+$/, '');

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (!shouldSkipValidation) {
        console.error('❌ Environment variable validation failed:');
        console.error('');

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          console.error(`  • ${path}: ${err.message}`);
        });

        console.error('');
        console.error('Please check your .env.local file and ensure all required variables are set.');
        console.error('');
      }

      // In production, this will prevent the app from starting UNLESS we're building
      if (!isDevelopment && !shouldSkipValidation) {
        throw new Error('Invalid environment configuration');
      } else if (shouldSkipValidation) {
        console.warn('⚠️  Skipping strict environment validation during build');
      }
    } else {
      throw error;
    }
  }

  // If we get here in development or build with validation issues, return env with warnings
  // We cast process.env to Env to satisfy the type, knowing it might be incomplete
  return process.env as unknown as Env;
}

// Validate on module load
let validatedEnv: Env;

try {
  validatedEnv = validateEnv();
  // Only log success if we actually validated
  if (!process.env.SKIP_ENV_VALIDATION && process.env.NODE_ENV !== 'production') {
    console.log('✅ Environment variables validated successfully');
  }
} catch (error) {
  console.error('Failed to validate environment variables:', error);
  // In development/build, provide mock values to allow partial functionality
  if (process.env.NODE_ENV === 'development' || process.env.CI === '1' || process.env.VERCEL === '1') {
    console.warn('⚠️  Running with potentially missing env vars (Build/Dev mode)');
    validatedEnv = process.env as unknown as Env;
  } else {
    // In actual production runtime, fail hard
    throw error;
  }
}

/**
 * Type-safe environment variable access
 */
export const env = validatedEnv;

/**
 * Helper to check if a feature is enabled
 */
export const isFeatureEnabled = {
  facebook: () => !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
  instagram: () => !!(env.INSTAGRAM_CLIENT_ID && env.INSTAGRAM_CLIENT_SECRET),
  twitter: () => !!(env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET),
  linkedin: () => !!(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET),
  youtube: () => !!(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET),
  tiktok: () => !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
  ai: () => !!(env.VERCEL_AI_GATEWAY_API_KEY || env.OPENAI_API_KEY),
};

/**
 * Get OAuth redirect URL for a platform
 */
export function getOAuthRedirectURL(platform: string): string {
  const baseURL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseURL}/api/oauth/${platform}/callback`;
}

/**
 * Helper to get environment type
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  return env.NODE_ENV;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Print environment configuration (safe for logging)
 */
export function printEnvironmentInfo(): void {
  console.log('═══════════════════════════════════════════════════');
  console.log('Environment Configuration');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`App URL: ${env.NEXT_PUBLIC_APP_URL || 'Not configured'}`);
  console.log('');
  console.log('Features Enabled:');
  console.log(`  • Facebook: ${isFeatureEnabled.facebook() ? '✓' : '✗'}`);
  console.log(`  • Instagram: ${isFeatureEnabled.instagram() ? '✓' : '✗'}`);
  console.log(`  • Twitter: ${isFeatureEnabled.twitter() ? '✓' : '✗'}`);
  console.log(`  • LinkedIn: ${isFeatureEnabled.linkedin() ? '✓' : '✗'}`);
  console.log(`  • YouTube: ${isFeatureEnabled.youtube() ? '✓' : '✗'}`);
  console.log(`  • TikTok: ${isFeatureEnabled.tiktok() ? '✓' : '✗'}`);
  console.log(`  • AI: ${isFeatureEnabled.ai() ? '✓' : '✗'}`);
  console.log('═══════════════════════════════════════════════════');
}

// Print env info in development
if (isDevelopment()) {
  printEnvironmentInfo();
}

export default env;
