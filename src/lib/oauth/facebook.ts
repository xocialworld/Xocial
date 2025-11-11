/**
 * Facebook OAuth Integration
 * Handles authentication and API interactions with Facebook/Meta Graph API
 */

export interface FacebookOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[];
}

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(config: FacebookOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: [
      'email',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'pages_manage_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
    ].join(','),
    response_type: 'code',
    // Force the user to re-authorize and select pages every time
    auth_type: 'rerequest',
  });

  return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(
  config: FacebookOAuthConfig,
  code: string
): Promise<FacebookTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/v24.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to exchange Facebook authorization code');
  }

  return response.json();
}

/**
 * Get long-lived access token
 */
export async function getFacebookLongLivedToken(
  config: FacebookOAuthConfig,
  shortLivedToken: string
): Promise<FacebookTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v24.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to get Facebook long-lived token');
  }

  return response.json();
}

/**
 * Get user profile information
 */
export async function getFacebookProfile(
  accessToken: string
): Promise<FacebookProfile> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/me?fields=id,name,email,picture&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook profile');
  }

  return response.json();
}

/**
 * Get user's Facebook pages
 */
export async function getFacebookPages(
  accessToken: string
): Promise<FacebookPage[]> {
  // Request specific fields including access_token and tasks
  const fields = 'id,name,access_token,category,tasks';
  const response = await fetch(
    `https://graph.facebook.com/v24.0/me/accounts?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[getFacebookPages] API Error:', errorData);
    throw new Error(
      `Failed to fetch Facebook pages: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  console.log('[getFacebookPages] Raw API Response:', JSON.stringify(data, null, 2));
  
  // Check if there's an error in the response
  if (data.error) {
    console.error('[getFacebookPages] Error in response:', data.error);
    throw new Error(`Facebook API Error: ${data.error.message}`);
  }
  
  const pages = data.data || [];
  console.log('[getFacebookPages] Parsed pages:', pages.length, pages.map((p: any) => ({ id: p.id, name: p.name })));
  
  return pages;
}

/**
 * Publish a post to Facebook page
 */
export async function publishFacebookPost(
  pageAccessToken: string,
  pageId: string,
  content: {
    message: string;
    link?: string;
    published?: boolean;
    scheduled_publish_time?: number;
  }
): Promise<{ id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...content,
        access_token: pageAccessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to publish Facebook post');
  }

  return response.json();
}

/**
 * Get post insights/analytics
 */
export async function getFacebookPostInsights(
  postId: string,
  accessToken: string
): Promise<any> {
  const metrics = [
    'post_impressions',
    'post_reach',
    'post_engaged_users',
    'post_reactions',
    'post_clicks',
  ];

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook post insights');
  }

  return response.json();
}

/**
 * Verify webhook signature
 */
export function verifyFacebookWebhook(
  signature: string,
  body: string,
  appSecret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

