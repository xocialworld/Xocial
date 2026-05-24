/**
 * Facebook OAuth Integration
 * Handles authentication and API interactions with Facebook/Meta Graph API
 */

export interface FacebookOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  configurationId?: string;
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
  category_list?: Array<{ id: string; name: string }>;
  picture?: {
    data: {
      url: string;
    };
  };
  fan_count?: number;
}

export const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';
export const META_GRAPH_API_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
export const META_FACEBOOK_AUTH_BASE_URL = `https://www.facebook.com/${META_GRAPH_API_VERSION}`;

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(
  config: FacebookOAuthConfig,
  state: string,
  includeInstagramScopes: boolean = false
): string {
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_read_user_content',
    'pages_manage_engagement',
    'read_insights',
  ];

  if (includeInstagramScopes) {
    scopes.push(
      'instagram_basic',
      'instagram_content_publish'
    );
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    response_type: 'code',
  });

  if (config.configurationId) {
    params.set('config_id', config.configurationId);
    params.set('override_default_response_type', 'true');
  } else {
    params.set('scope', scopes.join(','));
    params.set('auth_type', 'rerequest');
  }

  return `${META_FACEBOOK_AUTH_BASE_URL}/dialog/oauth?${params.toString()}`;
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
    `${META_GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`
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
    `${META_GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to get Facebook long-lived token');
  }

  return response.json();
}

/**
 * Exchange for long-lived token (alias for convenience)
 */
export async function exchangeForLongLivedToken(
  clientId: string,
  clientSecret: string,
  shortLivedToken: string
): Promise<FacebookTokenResponse> {
  return getFacebookLongLivedToken(
    { clientId, clientSecret, redirectUri: '' },
    shortLivedToken
  );
}


/**
 * Get user profile information
 */
export async function getFacebookProfile(
  accessToken: string
): Promise<FacebookProfile> {
  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/me?fields=id,name,email,picture&access_token=${accessToken}`
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
  const fields = [
    'id',
    'name',
    'access_token',
    'category',
    'tasks',
    'category_list',
    'picture',
    'fan_count',
  ].join(',');

  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/me/accounts?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook pages');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Facebook page posts
 */
export async function getFacebookPagePosts(
  accessToken: string,
  pageId: string,
  limit: number = 25
): Promise<any[]> {
  const fields = [
    'id',
    'message',
    'story',
    'created_time',
    'full_picture',
    'permalink_url',
    'shares',
    'likes.summary(true)',
    'comments.summary(true)',
    'type',
    'status_type',
    'link',
  ];

  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/${pageId}/posts?fields=${fields.join(',')}&limit=${limit}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook page posts');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get comments for a post
 */
export async function getFacebookPostComments(
  accessToken: string,
  postId: string
): Promise<any[]> {
  const fields = [
    'id',
    'message',
    'created_time',
    'from',
    'like_count',
    'comment_count',
    'parent',
  ];

  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/${postId}/comments?fields=${fields.join(',')}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook post comments');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get page insights
 */
export async function getFacebookPageInsights(
  accessToken: string,
  pageId: string,
  period: string = 'day'
): Promise<any[]> {
  const metrics = [
    'page_fans',
    'page_impressions',
    'page_engaged_users',
    'page_actions_post_reactions_like_total',
  ];

  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/${pageId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook page insights');
  }

  const data = await response.json();
  return data.data || [];
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
    `${META_GRAPH_API_BASE_URL}/${pageId}/feed`,
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
): Promise<any[]> {
  const metrics = [
    'post_impressions',
    'post_reach',
    'post_engaged_users',
    'post_reactions',
    'post_clicks',
  ];

  const response = await fetch(
    `${META_GRAPH_API_BASE_URL}/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook post insights');
  }

  const data = await response.json();
  return data.data || [];
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
