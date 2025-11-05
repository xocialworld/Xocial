import { createHash, randomBytes } from 'node:crypto';

/**
 * Twitter/X OAuth 2.0 Integration
 * Using OAuth 2.0 with PKCE for user authentication
 */

export interface TwitterOAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface TwitterTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

/**
 * Generate code verifier and challenge for PKCE
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = generateRandomString(128);
  const challenge = base64URLEncode(sha256(verifier));
  
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

function sha256(plain: string): string {
  return createHash('sha256').update(plain).digest('base64');
}

function base64URLEncode(data: Buffer | string): string {
  const base64 = typeof data === 'string' ? Buffer.from(data, 'utf-8').toString('base64') : data.toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate Twitter OAuth authorization URL
 */
export function getTwitterAuthUrl(
  config: TwitterOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'follows.read',
      'offline.access',
    ].join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeTwitterCode(
  config: TwitterOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TwitterTokenResponse> {
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  // Add client secret if available (for confidential clients)
  if (config.clientSecret) {
    params.append('client_secret', config.clientSecret);
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange Twitter authorization code');
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
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: config.clientId,
  });

  if (config.clientSecret) {
    params.append('client_secret', config.clientSecret);
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Twitter token');
  }

  return response.json();
}

/**
 * Get authenticated user information
 */
export async function getTwitterUser(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,description,public_metrics',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Twitter user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a tweet
 */
export async function createTweet(
  accessToken: string,
  content: {
    text: string;
    media_ids?: string[];
  }
): Promise<{ data: { id: string; text: string } }> {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create tweet');
  }

  return response.json();
}

/**
 * Get tweet metrics
 */
export async function getTweetMetrics(
  tweetId: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,created_at&expansions=author_id`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch tweet metrics');
  }

  return response.json();
}

/**
 * Get user tweets
 */
export async function getUserTweets(
  userId: string,
  accessToken: string,
  maxResults: number = 10
): Promise<any> {
  const response = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics&expansions=attachments.media_keys&media.fields=url,preview_image_url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user tweets');
  }

  return response.json();
}

/**
 * Delete a tweet
 */
export async function deleteTweet(
  tweetId: string,
  accessToken: string
): Promise<{ data: { deleted: boolean } }> {
  const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete tweet');
  }

  return response.json();
}

