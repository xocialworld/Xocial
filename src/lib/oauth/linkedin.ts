/**
 * LinkedIn OAuth 2.0 Integration
 * OAuth 2.0 for LinkedIn authentication and API interactions
 */

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
  logoV2?: {
    original?: string;
  };
}

/**
 * Get user posts (shares/UGC)
 */
export async function getLinkedInUserPosts(
  accessToken: string,
  personId: string,
  limit: number = 25
): Promise<any[]> {
  const author = `urn:li:person:${personId}`;
  const response = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(
      author
    )})&count=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn user posts');
  }

  const data = await response.json();
  return data.elements || [];
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
    scope: [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_organization_social',
      'w_organization_social',
      'rw_organization_admin',
    ].join(' '),
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
    'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&projection=(elements*(organization~(id,localizedName,vanityName,logoV2(original))))',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn organizations');
  }

  const data = await response.json();
  return data.elements?.map((element: any) => element['organization~']) || [];
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
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    },
    body: JSON.stringify({
      author: content.author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': content.visibility || 'PUBLIC',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create LinkedIn post');
  }

  return response.json();
}

/**
 * Get post statistics (requires the post URN)
 */
export async function getLinkedInPostStats(
  accessToken: string,
  shareUrn: string
): Promise<any> {
  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(shareUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn post stats');
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
    `https://api.linkedin.com/v2/organizationalEntityShareStatistics?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn organization stats');
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
    `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(shareUrn)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete LinkedIn post');
  }
}

