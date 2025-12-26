/**
 * Twitter (X) Platform Integration
 * 
 * Handles:
 * 1. OAuth 2.0 Authentication (PKCE)
 * 2. API v2 Client (Tweets, Media, User Info)
 * 3. Token Management
 */

import { OAUTH_CONFIG } from '@/lib/oauth/oauth-config';
import { createHash, randomBytes } from 'node:crypto';

// ─── 1. Types & Interfaces ───────────────────────────────────────────

export interface TwitterOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TwitterTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface Tweet {
  text: string;
  media_ids?: string[];
  poll_options?: string[];
  poll_duration_minutes?: number;
  reply_settings?: 'everyone' | 'mentionedUsers' | 'followers';
}

// ─── 2. Twitter API Client ───────────────────────────────────────────

export class TwitterClient {
  private baseUrl = 'https://api.twitter.com/2';
  private uploadUrl = 'https://upload.twitter.com/1.1';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Post a tweet
   */
  async publishTweet(tweet: Tweet): Promise<{ data: { id: string; text: string } }> {
    const url = `${this.baseUrl}/tweets`;

    const body: any = {
      text: tweet.text,
    };

    if (tweet.media_ids && tweet.media_ids.length > 0) {
      body.media = { media_ids: tweet.media_ids };
    }

    if (tweet.poll_options && tweet.poll_options.length > 0) {
      body.poll = {
        options: tweet.poll_options,
        duration_minutes: tweet.poll_duration_minutes || 1440, // 24 hours default
      };
    }

    if (tweet.reply_settings) {
      body.reply_settings = tweet.reply_settings;
    }

    console.log('[Twitter] Publishing tweet:', {
      textLength: tweet.text?.length,
      hasMedia: !!tweet.media_ids?.length,
      mediaCount: tweet.media_ids?.length || 0
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Twitter] Tweet publish failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      let errorMessage = 'Failed to publish tweet';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.title || errorJson.errors?.[0]?.message || errorMessage;

        // Check for specific errors
        if (response.status === 403) {
          errorMessage = `Twitter access denied: ${errorMessage}. Make sure your app has write permissions.`;
        } else if (response.status === 401) {
          errorMessage = `Twitter authentication failed: ${errorMessage}. Please reconnect your account.`;
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Twitter] Tweet published:', result);
    return result;
  }

  /**
   * Upload media for tweet (returns media_id)
   * Uses the new Twitter/X API v2 media upload endpoints that support OAuth 2.0
   * Endpoints: /2/media/upload/initialize, /2/media/upload/{id}/append, /2/media/upload/{id}/finalize
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video' = 'image'): Promise<string> {
    console.log('[Twitter] Uploading media from URL:', mediaUrl, 'type:', mediaType);

    try {
      // Download media from URL
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch media from URL: ${mediaResponse.status}`);
      }

      const mediaBlob = await mediaResponse.blob();
      const mediaBuffer = await mediaResponse.arrayBuffer();
      const mediaSize = mediaBuffer.byteLength;

      console.log('[Twitter] Media downloaded, size:', mediaSize, 'bytes');

      // Determine content type
      const contentType = mediaType === 'video' ? 'video/mp4' :
        mediaUrl.includes('.png') ? 'image/png' :
          mediaUrl.includes('.gif') ? 'image/gif' :
            'image/jpeg';

      // ─── Step 1: Initialize upload using v2 endpoint ───
      console.log('[Twitter] Step 1: Initializing upload...');

      const initResponse = await fetch(`${this.baseUrl}/media/upload/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_type: contentType,
          file_size: mediaSize,
          media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image',
        }),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('[Twitter] v2 Media upload INIT failed:', initResponse.status, errorText);

        // Fall back to trying the v1.1 endpoint with form-data (some accounts may have access)
        console.log('[Twitter] Trying v1.1 fallback...');
        return await this.uploadMediaV1Fallback(mediaBuffer, mediaType, contentType);
      }

      const initData = await initResponse.json();
      const mediaId = initData.data?.id || initData.id || initData.media_id_string;
      console.log('[Twitter] INIT successful, media_id:', mediaId);

      // ─── Step 2: Append media data ───
      console.log('[Twitter] Step 2: Appending media data...');

      const appendResponse = await fetch(`${this.baseUrl}/media/upload/${mediaId}/append`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': contentType,
        },
        body: new Blob([mediaBuffer]),
      });

      if (!appendResponse.ok) {
        const errorText = await appendResponse.text();
        console.error('[Twitter] v2 Media upload APPEND failed:', errorText);
        throw new Error(`Twitter media upload APPEND failed: ${errorText}`);
      }

      console.log('[Twitter] APPEND successful');

      // ─── Step 3: Finalize upload ───
      console.log('[Twitter] Step 3: Finalizing upload...');

      const finalizeResponse = await fetch(`${this.baseUrl}/media/upload/${mediaId}/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        console.error('[Twitter] v2 Media upload FINALIZE failed:', errorText);
        throw new Error(`Twitter media upload FINALIZE failed: ${errorText}`);
      }

      const finalData = await finalizeResponse.json();
      const finalMediaId = finalData.data?.id || finalData.id || finalData.media_id_string || mediaId;
      console.log('[Twitter] FINALIZE successful, final media_id:', finalMediaId);

      // For videos, wait for processing
      if (mediaType === 'video') {
        await this.waitForMediaProcessing(finalMediaId);
      }

      return finalMediaId;
    } catch (error: any) {
      console.error('[Twitter] Media upload error:', error);
      throw error;
    }
  }

  /**
   * Fallback to v1.1 media upload (may work for some accounts)
   */
  private async uploadMediaV1Fallback(
    mediaBuffer: ArrayBuffer,
    mediaType: 'image' | 'video',
    contentType: string
  ): Promise<string> {
    const base64Media = Buffer.from(mediaBuffer).toString('base64');

    // Try simple upload first (for images < 5MB)
    const formData = new FormData();
    formData.append('media_data', base64Media);

    const response = await fetch(`${this.uploadUrl}/media/upload.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Twitter] v1.1 fallback failed:', errorText);
      throw new Error(`Twitter media upload failed: ${errorText}. Note: Media upload may require additional API access.`);
    }

    const data = await response.json();
    console.log('[Twitter] v1.1 upload successful:', data.media_id_string);
    return data.media_id_string;
  }

  /**
   * Wait for video media to finish processing
   */
  private async waitForMediaProcessing(mediaId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(`${this.baseUrl}/media/upload/${mediaId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const state = statusData.data?.processing_state || statusData.processing_info?.state;

        if (state === 'succeeded' || !state) {
          console.log('[Twitter] Media processing complete');
          return;
        }

        if (state === 'failed') {
          throw new Error('Twitter media processing failed');
        }

        console.log('[Twitter] Media processing state:', state);
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.warn('[Twitter] Media processing timeout, continuing anyway');
  }

  /**
   * Get tweet with metrics
   */
  async getTweet(tweetId: string): Promise<any> {
    const url = `${this.baseUrl}/tweets/${tweetId}`;
    const params = new URLSearchParams({
      'tweet.fields': 'public_metrics,non_public_metrics,organic_metrics,promoted_metrics',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch tweet');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user information
   */
  async getUserInfo(username?: string): Promise<any> {
    const url = username
      ? `${this.baseUrl}/users/by/username/${username}`
      : `${this.baseUrl}/users/me`;

    const params = new URLSearchParams({
      'user.fields': 'id,name,username,profile_image_url,public_metrics,description,created_at,verified',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch Twitter user info');
    }

    const data = await response.json();
    return data.data;
  }
}

/**
 * Twitter-specific error types for better error categorization
 */
export type TwitterErrorType = 
  | 'AUTH_ERROR'           // 401 - Token invalid/expired, needs reconnection
  | 'RATE_LIMIT'           // 429 - Rate limited, retry later
  | 'FORBIDDEN'            // 403 - Missing permissions
  | 'CONTENT_ERROR'        // 400 - Content rejected (duplicate, etc.)
  | 'MEDIA_ERROR'          // Media upload/processing failed
  | 'SERVER_ERROR'         // 5xx - Twitter server error
  | 'UNKNOWN';

export interface TwitterError extends Error {
  type: TwitterErrorType;
  retryAfter?: number;  // Seconds until retry for rate limits
  canRetry: boolean;
  originalStatus?: number;
}

/**
 * Create a typed Twitter error
 */
function createTwitterError(
  message: string, 
  type: TwitterErrorType, 
  options?: { 
    retryAfter?: number; 
    originalStatus?: number;
  }
): TwitterError {
  const error = new Error(message) as TwitterError;
  error.type = type;
  error.retryAfter = options?.retryAfter;
  error.originalStatus = options?.originalStatus;
  error.canRetry = ['RATE_LIMIT', 'SERVER_ERROR'].includes(type);
  return error;
}

/**
 * Categorize HTTP error responses into Twitter error types
 */
function categorizeTwitterError(status: number, errorText: string): { type: TwitterErrorType; message: string; retryAfter?: number } {
  try {
    const errorJson = JSON.parse(errorText);
    const message = errorJson.detail || errorJson.title || errorJson.errors?.[0]?.message || errorText;
    
    switch (status) {
      case 401:
        return {
          type: 'AUTH_ERROR',
          message: `Twitter authentication failed: ${message}. Please reconnect your account.`,
        };
      case 403:
        return {
          type: 'FORBIDDEN',
          message: `Twitter access denied: ${message}. Check your app has the required permissions.`,
        };
      case 429: {
        // Extract retry-after if available
        const retryMatch = errorText.match(/retryAfter[=:](\d+)/);
        return {
          type: 'RATE_LIMIT',
          message: `Twitter rate limit exceeded: ${message}`,
          retryAfter: retryMatch ? parseInt(retryMatch[1]) : 60,
        };
      }
      case 400:
        return {
          type: 'CONTENT_ERROR',
          message: `Twitter rejected content: ${message}`,
        };
      default:
        if (status >= 500) {
          return {
            type: 'SERVER_ERROR',
            message: `Twitter server error: ${message}`,
          };
        }
        return {
          type: 'UNKNOWN',
          message: message || `Twitter API error: ${status}`,
        };
    }
  } catch {
    return {
      type: status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
      message: errorText || `Twitter API error: ${status}`,
    };
  }
}

/**
 * Factory function to create Twitter client
 */
export async function createTwitterClient(accountId: string): Promise<TwitterClient> {
  const { createClient } = await import('@/lib/supabase/server');
  const { decryptToken, encryptToken } = await import('@/lib/encryption');

  const supabase = await createClient();

  // Fetch account to get access token
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw createTwitterError(
      `Twitter account not found: ${accountId}`,
      'AUTH_ERROR',
      { originalStatus: 404 }
    );
  }

  let accessToken: string;
  
  try {
    accessToken = decryptToken(account.access_token);
  } catch (decryptError) {
    console.error('[Twitter] Failed to decrypt access token:', decryptError);
    throw createTwitterError(
      'Failed to decrypt Twitter access token. Please reconnect your account.',
      'AUTH_ERROR'
    );
  }

  // Check if token is expired (or close to expiring)
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
  const now = new Date();
  
  // Refresh if expired or expiring in next 5 minutes
  const needsRefresh = expiresAt && (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000);
  
  if (needsRefresh) {
    console.log('[Twitter] Token expired or expiring soon, attempting refresh...');
    
    if (!account.refresh_token) {
      throw createTwitterError(
        'Twitter token expired and no refresh token available. Please reconnect your account.',
        'AUTH_ERROR'
      );
    }

    try {
      const refreshToken = decryptToken(account.refresh_token);
      const config: TwitterOAuthConfig = {
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
        redirectUri: '', // Not needed for refresh
      };

      const tokenResponse = await refreshTwitterToken(config, refreshToken);

      // Update database with new tokens
      const encryptedAccessToken = encryptToken(tokenResponse.access_token);
      const encryptedRefreshToken = tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token)
        : account.refresh_token; // Keep old if not rotated

      const newExpiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString();

      await supabase
        .from('social_accounts')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      console.log('[Twitter] Token refreshed successfully, new expiry:', newExpiresAt);
      accessToken = tokenResponse.access_token;
    } catch (refreshError: any) {
      console.error('[Twitter] Token refresh failed:', refreshError);
      
      // If refresh fails with auth error, account needs reconnection
      if (refreshError.message?.includes('invalid_grant') || 
          refreshError.message?.includes('invalid_request') ||
          refreshError.originalStatus === 401) {
        
        // Mark account as needing reconnection
        await supabase
          .from('social_accounts')
          .update({
            status: 'needs_reconnection',
            error_message: 'Token refresh failed. Please reconnect your account.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
        
        throw createTwitterError(
          'Twitter token refresh failed. Please reconnect your account.',
          'AUTH_ERROR'
        );
      }
      
      // For other errors, try with the existing token (it might work)
      console.warn('[Twitter] Using existing token despite refresh failure');
    }
  }

  return new TwitterClient(accessToken);
}

export { createTwitterError, categorizeTwitterError };


export async function getTwitterTweetMetrics(accessToken: string, tweetId: string) {
  const client = new TwitterClient(accessToken);
  const tweet = await client.getTweet(tweetId);
  return tweet;
}

export async function getTwitterUserProfile(accessToken: string, userId: string) {
  const client = new TwitterClient(accessToken);
  // Note: getUserInfo(username) or getUserInfo() for me. 
  // If we need by ID, we might need to extend TwitterClient or use the 'me' endpoint if the token belongs to that user.
  // Assuming 'me' is sufficient for profile sync of the connected account.
  return client.getUserInfo();
}

export async function getTwitterUserTweets(accessToken: string, userId: string, maxTweets: number = 50) {
  const baseUrl = 'https://api.twitter.com/2';
  const url = `${baseUrl}/users/${userId}/tweets`;
  const params = new URLSearchParams({
    'max_results': Math.min(Math.max(maxTweets, 5), 100).toString(), // Twitter requires min 5
    'tweet.fields': 'created_at,public_metrics,entities,attachments',
    'media.fields': 'url,preview_image_url,type,variants',
    'expansions': 'attachments.media_keys'
  });

  console.log('[Twitter] Fetching user tweets for userId:', userId);

  // Retry a few times on rate limit / transient failures (serverless-safe short backoff)
  let lastResponse: Response | null = null;
  let lastBody = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    lastResponse = response;

    if (response.ok) {
      const data = await response.json();
      console.log('[Twitter] Received tweets:', data.data?.length || 0);

      // Attach includes to each tweet for media resolution
      const tweets = data.data || [];
      const includes = data.includes || {};

      // Map media to tweets
      return tweets.map((tweet: any) => {
        if (tweet.attachments?.media_keys?.length > 0 && includes.media) {
          tweet.media = includes.media.filter((m: any) =>
            tweet.attachments.media_keys.includes(m.media_key)
          );
        }
        return tweet;
      });
    }

    lastBody = await response.text();
    const status = response.status;
    console.error('[Twitter] Failed to fetch user tweets:', status, lastBody);

    // Rate limit: short exponential backoff (don’t sleep long in API routes)
    if (status === 429 || status >= 500) {
      // Prefer using Twitter-provided retry info when available
      const retryAfterHeader = response.headers.get('retry-after');
      const rateResetHeader = response.headers.get('x-rate-limit-reset');
      if (status === 429) {
        // If we have explicit retry info, surface it in the error string so callers can act on it.
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
        const resetEpochSeconds = rateResetHeader ? Number(rateResetHeader) : null;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const untilResetSeconds =
          resetEpochSeconds && resetEpochSeconds > nowSeconds
            ? resetEpochSeconds - nowSeconds
            : null;
        const suggested = retryAfterSeconds ?? untilResetSeconds ?? null;
        if (suggested !== null) {
          // Encode as "429;retryAfter=NN" so upstream can parse
          throw new Error(`Failed to fetch user tweets: 429;retryAfter=${suggested}`);
        }
      }
      const delayMs = 500 * Math.pow(2, attempt); // 500, 1000, 2000
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    // Non-retriable error
    try {
      const error = JSON.parse(lastBody);
      throw new Error(error.detail || error.errors?.[0]?.message || `Failed to fetch user tweets: ${status}`);
    } catch {
      throw new Error(`Failed to fetch user tweets: ${status}`);
    }
  }

  const status = lastResponse?.status ?? 0;
  try {
    const error = JSON.parse(lastBody);
    throw new Error(error.detail || error.errors?.[0]?.message || `Failed to fetch user tweets: ${status}`);
  } catch {
    throw new Error(`Failed to fetch user tweets: ${status}`);
  }
}

export const getTweetMetrics = getTwitterTweetMetrics;
export const getUserTweets = getTwitterUserTweets;


// ─── 3. OAuth & Auth Helpers ─────────────────────────────────────────

/**
 * Generate code verifier and challenge for PKCE
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = generateRandomString(128);
  const challenge = base64URLEncode(createHash('sha256').update(verifier).digest());

  return { verifier, challenge };
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = randomBytes(length);
  let text = '';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(bytes[i] % possible.length);
  }

  return text;
}

function base64URLEncode(data: Buffer): string {
  return data.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate Twitter OAuth authorization URL
 * PKCE is required for Twitter OAuth 2.0
 * 
 * Twitter OAuth 2.0 Client IDs from the Developer Portal look like:
 * "ZTRnZGlYRnVMNDNhS1UwVEUzSFA6MTpjaQ" (Base64 encoded)
 * 
 * This should be used AS-IS in the authorization request.
 * Twitter handles the decoding on their end.
 */
export function getTwitterAuthUrl(
  config: TwitterOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  // Use the Client ID exactly as provided from Twitter Developer Portal
  // Twitter OAuth 2.0 expects the full Client ID string (which is Base64 encoded)
  const clientId = config.clientId;

  console.log('[Twitter OAuth] Generating auth URL:', {
    clientIdLength: clientId.length,
    redirectUri: config.redirectUri,
    stateLength: state.length,
    challengeLength: codeChallenge.length,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: config.redirectUri,
    scope: OAUTH_CONFIG.twitter.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${OAUTH_CONFIG.twitter.endpoints.auth}?${params.toString()}`;

  console.log('[Twitter OAuth] Generated auth URL:', {
    baseUrl: OAUTH_CONFIG.twitter.endpoints.auth,
    fullUrlLength: authUrl.length,
  });

  return authUrl;
}

/**
 * Exchange authorization code for access token
 * 
 * For confidential clients, Twitter requires:
 * - Basic Auth header with client_id:client_secret (Base64 encoded)
 * - The client_id in the request body matches the one used in authorization
 */
export async function exchangeTwitterCode(
  config: TwitterOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TwitterTokenResponse> {
  // Use the Client ID exactly as provided from Twitter Developer Portal
  const clientId = config.clientId;

  console.log('[Twitter OAuth] Exchanging code for tokens:', {
    clientIdLength: clientId.length,
    codeLength: code.length,
    verifierLength: codeVerifier.length,
    redirectUri: config.redirectUri,
  });

  // Twitter requires Basic Auth header with client_id:client_secret for confidential clients
  const basicAuth = Buffer.from(`${clientId}:${config.clientSecret}`).toString('base64');

  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(OAUTH_CONFIG.twitter.endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    let message = 'Failed to exchange Twitter authorization code';
    let errorDetails = {};
    try {
      const error = await response.json();
      message = error.error_description || error.error || message;
      errorDetails = error;
    } catch { }

    console.error('[Twitter OAuth] Token exchange failed:', {
      status: response.status,
      message,
      errorDetails,
    });

    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status, message, 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }

  console.log('[Twitter OAuth] Token exchange successful');
  return response.json();
}

/**
 * Refresh Twitter access token
 */
export async function refreshTwitterToken(
  config: TwitterOAuthConfig,
  refreshToken: string
): Promise<TwitterTokenResponse> {
  // Use the Client ID exactly as provided from Twitter Developer Portal
  const clientId = config.clientId;

  const basicAuth = Buffer.from(`${clientId}:${config.clientSecret}`).toString('base64');

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: clientId,
  });

  const response = await fetch(OAUTH_CONFIG.twitter.endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(401, 'Failed to refresh Twitter token', 'OAUTH_TOKEN_REFRESH_FAILED');
  }

  return response.json();
}

/**
 * Get authenticated user's profile
 */
export async function getTwitterUser(
  accessToken: string
): Promise<TwitterUser> {
  const params = new URLSearchParams({
    'user.fields': 'id,name,username,profile_image_url,description,public_metrics',
  });

  const response = await fetch(`${OAUTH_CONFIG.twitter.endpoints.user}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status, 'Failed to fetch Twitter user', 'TWITTER_API_ERROR');
  }

  const data = await response.json();
  return data.data;
}
