/**
 * LinkedIn OAuth 2.0 Integration
 * OAuth 2.0 for LinkedIn authentication and API interactions
 */

import { OAUTH_CONFIG } from './oauth-config';

export const LINKEDIN_MARKETING_API_VERSION = process.env.LINKEDIN_API_VERSION || '202605';
const LINKEDIN_REST_BASE_URL = 'https://api.linkedin.com/rest';

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInProfile {
  sub: string; // User ID
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: {
    country: string;
    language: string;
  };
  followersCount?: number;
  connectionsCount?: number;
}

export interface LinkedInOrganization {
  id: string;
  name: string;
  localizedName: string;
  vanityName?: string;
  role?: string;
  logoV2?: {
    original?: string;
  };
}

function linkedInRestHeaders(accessToken: string, contentType = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_MARKETING_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function linkedInError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);
    return json.message || json.detail || json.error_description || fallback;
  } catch {
    return text;
  }
}

/**
 * Get posts for a LinkedIn member or organization author URN.
 */
export async function getLinkedInAuthorPosts(
  accessToken: string,
  authorUrn: string,
  limit: number = 25
): Promise<any[]> {
  const params = new URLSearchParams({
    q: 'author',
    author: authorUrn,
    count: Math.min(Math.max(limit, 1), 100).toString(),
  });

  const response = await fetch(`${LINKEDIN_REST_BASE_URL}/posts?${params.toString()}`, {
    headers: linkedInRestHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to fetch LinkedIn posts'));
  }

  const data = await response.json();
  return data.elements || [];
}

/**
 * Backward-compatible helper for personal profile post sync.
 */
export async function getLinkedInUserPosts(
  accessToken: string,
  personId: string,
  limit: number = 25
): Promise<any[]> {
  const author = personId.startsWith('urn:li:')
    ? personId
    : `urn:li:person:${personId}`;
  return getLinkedInAuthorPosts(accessToken, author, limit);
}

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function getLinkedInAuthUrl(
  config: LinkedInOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: OAUTH_CONFIG.linkedin.scopes.join(' '),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(
  config: LinkedInOAuthConfig,
  code: string
): Promise<LinkedInTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange LinkedIn authorization code: ${error}`);
  }

  return response.json();
}

/**
 * Refresh LinkedIn access token
 */
export async function refreshLinkedInToken(
  config: LinkedInOAuthConfig,
  refreshToken: string
): Promise<LinkedInTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh LinkedIn token');
  }

  return response.json();
}

/**
 * Get authenticated user profile (OpenID Connect)
 */
export async function getLinkedInProfile(
  accessToken: string
): Promise<LinkedInProfile> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn profile');
  }

  return response.json();
}

/**
 * Get user's LinkedIn organizations (company pages)
 */
export async function getLinkedInOrganizations(
  accessToken: string
): Promise<LinkedInOrganization[]> {
  // Note: This requires organization admin access
  const response = await fetch(
    `${LINKEDIN_REST_BASE_URL}/organizationAcls?q=roleAssignee&projection=(elements*(role,organization~(id,localizedName,vanityName,logoV2(original))))`,
    {
      headers: linkedInRestHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to fetch LinkedIn organizations'));
  }

  const data = await response.json();
  return data.elements?.map((element: any) => ({
    ...(element['organization~'] || {}),
    role: element.role,
  })) || [];
}

/**
 * Create a LinkedIn post (User or Organization)
 */
export async function createLinkedInPost(
  accessToken: string,
  content: {
    author: string; // URN format: urn:li:person:{personId} or urn:li:organization:{organizationId}
    text: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }
): Promise<{ id: string }> {
  const response = await fetch(`${LINKEDIN_REST_BASE_URL}/posts`, {
    method: 'POST',
    headers: linkedInRestHeaders(accessToken, true),
    body: JSON.stringify({
      author: content.author,
      commentary: content.text,
      visibility: content.visibility || 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to create LinkedIn post'));
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  const id = data.id || response.headers.get('x-restli-id');
  if (!id) {
    throw new Error('LinkedIn post was created but no post URN was returned');
  }
  return { id };
}

/**
 * Get post statistics (requires the post URN)
 */
export async function getLinkedInPostStats(
  accessToken: string,
  shareUrn: string
): Promise<any> {
  const response = await fetch(
    `${LINKEDIN_REST_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}`,
    {
      headers: linkedInRestHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to fetch LinkedIn post stats'));
  }

  return response.json();
}

/**
 * Get organization page statistics
 */
export async function getLinkedInOrganizationStats(
  accessToken: string,
  organizationId: string,
  timeRange?: {
    start: number; // Unix timestamp in milliseconds
    end: number;
  }
): Promise<any> {
  const params = new URLSearchParams({
    q: 'organization',
    organization: `urn:li:organization:${organizationId}`,
  });

  if (timeRange) {
    params.append('timeIntervals.timeGranularityType', 'DAY');
    params.append('timeIntervals.timeRange.start', timeRange.start.toString());
    params.append('timeIntervals.timeRange.end', timeRange.end.toString());
  }

  const response = await fetch(
    `${LINKEDIN_REST_BASE_URL}/organizationalEntityShareStatistics?${params.toString()}`,
    {
      headers: linkedInRestHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to fetch LinkedIn organization stats'));
  }

  return response.json();
}

/**
 * Delete a LinkedIn post
 */
export async function deleteLinkedInPost(
  accessToken: string,
  shareUrn: string
): Promise<void> {
  const response = await fetch(
    `${LINKEDIN_REST_BASE_URL}/posts/${encodeURIComponent(shareUrn)}`,
    {
      method: 'DELETE',
      headers: linkedInRestHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await linkedInError(response, 'Failed to delete LinkedIn post'));
  }
}
