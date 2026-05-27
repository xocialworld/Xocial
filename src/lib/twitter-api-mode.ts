export type TwitterApiMode = 'no-spend' | 'live';

const LIVE_VALUES = new Set(['live', 'paid', 'enabled', 'true', '1']);
const NO_SPEND_VALUES = new Set([
  'no-spend',
  'no_spend',
  'dry-run',
  'dry_run',
  'disabled',
  'false',
  '0',
]);

export const TWITTER_CREDITS_REQUIRED_CODE = 'TWITTER_API_CREDITS_REQUIRED';

export class TwitterApiCreditsRequiredError extends Error {
  status = 402;
  code = TWITTER_CREDITS_REQUIRED_CODE;
  retryable = false;

  constructor(action: string) {
    super(
      `X API credits required for ${action}. Twitter/X is currently in no-spend mode, so Xocial will not call live X API endpoints. Set TWITTER_API_MODE=live after adding X API credits.`
    );
    this.name = 'TwitterApiCreditsRequiredError';
  }
}

export function getTwitterApiMode(
  value = process.env.TWITTER_API_MODE,
  nodeEnv = process.env.NODE_ENV
): TwitterApiMode {
  const normalized = String(value || '').trim().toLowerCase();

  if (LIVE_VALUES.has(normalized)) return 'live';
  if (NO_SPEND_VALUES.has(normalized)) return 'no-spend';

  return nodeEnv === 'production' ? 'live' : 'no-spend';
}

export function isTwitterLiveApiEnabled(): boolean {
  return getTwitterApiMode() === 'live';
}

export function isTwitterNoSpendMode(): boolean {
  return !isTwitterLiveApiEnabled();
}

export function assertTwitterLiveApiEnabled(action: string): void {
  if (isTwitterNoSpendMode()) {
    throw new TwitterApiCreditsRequiredError(action);
  }
}

export function isTwitterApiCreditsRequiredError(error: unknown): boolean {
  return (
    error instanceof TwitterApiCreditsRequiredError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === TWITTER_CREDITS_REQUIRED_CODE)
  );
}

export function getTwitterApiModeSummary(appUrl?: string) {
  const mode = getTwitterApiMode();
  const effectiveAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';

  return {
    mode,
    liveApiEnabled: mode === 'live',
    noSpendMode: mode === 'no-spend',
    expectedLocalCallbackUrl: 'http://127.0.0.1:3000/api/auth/twitter/callback',
    activeCallbackUrl: `${effectiveAppUrl}/api/auth/twitter/callback`,
    requiredScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'],
    liveEnablement: {
      env: 'TWITTER_API_MODE=live',
      reason: 'Use only after adding X API credits in the X Developer Console.',
    },
  };
}

export function looksLikeTwitterBillingError(message: string, status?: number): boolean {
  const normalized = message.toLowerCase();

  return (
    status === 402 ||
    normalized.includes('credit') ||
    normalized.includes('billing') ||
    normalized.includes('payment') ||
    normalized.includes('pay-per') ||
    normalized.includes('usage cap') ||
    normalized.includes('usage limit') ||
    normalized.includes('client-not-enrolled') ||
    normalized.includes('subscribe') ||
    normalized.includes('subscription') ||
    normalized.includes('plan') ||
    normalized.includes('tier')
  );
}
