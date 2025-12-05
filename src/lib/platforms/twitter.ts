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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || 'Failed to publish tweet');
    }

    return response.json();
  }

  /**
   * Upload media for tweet (returns media_id)
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video' = 'image'): Promise<string> {
    // Download media from URL
    const mediaResponse = await fetch(mediaUrl);
    const mediaBlob = await mediaResponse.blob();
    const mediaBuffer = await mediaBlob.arrayBuffer();

    // Upload to Twitter
    const url = `${this.uploadUrl}/media/upload.json`;

    const formData = new FormData();
    formData.append('media', new Blob([mediaBuffer]));
    formData.append('media_category', mediaType === 'video' ? 'tweet_video' : 'tweet_image');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to upload media to Twitter');
    }

    const data = await response.json();
    return data.media_id_string;
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
    throw new Error(`Twitter account not found: ${accountId}`);
  }

  let accessToken = decryptToken(account.access_token);

  // Check if token is expired (or close to expiring)
  const expiresAt = new Date(account.token_expires_at);
  const now = new Date();
  // Refresh if expired or expiring in next 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      if (!account.refresh_token) {
        throw new Error('No refresh token available');
      }
      
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
        
      await supabase
        .from('social_accounts')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
        
      accessToken = tokenResponse.access_token;
    } catch (refreshError) {
      console.error('Failed to refresh Twitter token:', refreshError);
      // Continue with old token, it might still work or throw 401 later
    }
  }

  return new TwitterClient(accessToken);
}


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
    const client = new TwitterClient(accessToken);
    // We need to add a method to fetch user tweets to the client
    // For now, implementing a direct fetch here using the client's private vars (not accessible) 
    // so we'll just use the same pattern as the client
    
    const baseUrl = 'https://api.twitter.com/2';
    const url = `${baseUrl}/users/${userId}/tweets`;
    const params = new URLSearchParams({
        'max_results': Math.min(maxTweets, 100).toString(),
        'tweet.fields': 'created_at,public_metrics,entities,attachments',
        'media.fields': 'url,preview_image_url,variants',
        'expansions': 'attachments.media_keys'
    });

    const response = await fetch(`${url}?${params}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch user tweets');
    }

  const data = await response.json();
  return data.data || [];
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
 */
export function getTwitterAuthUrl(
  config: TwitterOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  // Ensure we only send the plain client ID (Twitter expects no secret in this param)
  const cleanClientId = config.clientId.split(':')[0];

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cleanClientId,
    redirect_uri: config.redirectUri,
    scope: OAUTH_CONFIG.twitter.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${OAUTH_CONFIG.twitter.endpoints.auth}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeTwitterCode(
  config: TwitterOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TwitterTokenResponse> {
  // Ensure we only send the plain client ID
  const cleanClientId = config.clientId.split(':')[0];

  // Twitter requires Basic Auth header with client_id:client_secret for confidential clients
  const basicAuth = Buffer.from(`${cleanClientId}:${config.clientSecret}`).toString('base64');

  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: cleanClientId,
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
    try {
      const error = await response.json();
      message = error.error_description || error.error || message;
    } catch { }

    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status, message, 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }

  return response.json();
}

/**
 * Refresh Twitter access token
 */
export async function refreshTwitterToken(
  config: TwitterOAuthConfig,
  refreshToken: string
): Promise<TwitterTokenResponse> {
  // Ensure we only send the plain client ID
  const cleanClientId = config.clientId.split(':')[0];

  const basicAuth = Buffer.from(`${cleanClientId}:${config.clientSecret}`).toString('base64');

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: cleanClientId,
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
