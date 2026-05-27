import {
  getTwitterApiMode,
  isTwitterApiCreditsRequiredError,
  looksLikeTwitterBillingError,
  TwitterApiCreditsRequiredError,
  TWITTER_CREDITS_REQUIRED_CODE,
} from '@/lib/twitter-api-mode';
import { OAUTH_CONFIG } from '@/lib/oauth/oauth-config';
import { generatePKCE, getTwitterAuthUrl } from '@/lib/platforms/twitter';

describe('Twitter/X phase 1 API mode', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('defaults development to no-spend', () => {
    expect(getTwitterApiMode('', 'development')).toBe('no-spend');
  });

  it('defaults production to live unless explicitly disabled', () => {
    expect(getTwitterApiMode('', 'production')).toBe('live');
    expect(getTwitterApiMode('no-spend', 'production')).toBe('no-spend');
  });

  it('recognizes live overrides', () => {
    expect(getTwitterApiMode('live', 'development')).toBe('live');
    expect(getTwitterApiMode('true', 'development')).toBe('live');
  });

  it('uses the required phase 1 OAuth scopes', () => {
    expect(OAUTH_CONFIG.twitter.scopes).toEqual([
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
      'media.write',
    ]);
  });

  it('generates a PKCE OAuth URL with the 127.0.0.1 callback and required scopes', () => {
    const pkce = generatePKCE();
    const authUrl = getTwitterAuthUrl(
      {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://127.0.0.1:3000/api/auth/twitter/callback',
      },
      'test-state',
      pkce.challenge
    );
    const url = new URL(authUrl);

    expect(url.origin + url.pathname).toBe('https://twitter.com/i/oauth2/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:3000/api/auth/twitter/callback'
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe(OAUTH_CONFIG.twitter.scopes.join(' '));
  });

  it('classifies credit and billing failures', () => {
    expect(looksLikeTwitterBillingError('Client is not enrolled in a paid plan', 403)).toBe(true);
    expect(looksLikeTwitterBillingError('usage billing required', 402)).toBe(true);
  });

  it('marks no-spend guard errors with the API credits code', () => {
    const error = new TwitterApiCreditsRequiredError('testing X calls');

    expect(isTwitterApiCreditsRequiredError(error)).toBe(true);
    expect(error.code).toBe(TWITTER_CREDITS_REQUIRED_CODE);
    expect(error.status).toBe(402);
  });
});
