/**
 * Instagram OAuth Integration
 * Supports both Instagram Login and Instagram via Facebook Page.
 */

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Generate the primary Instagram Professional Account OAuth URL.
 * This is Instagram API with Instagram Login and does not require a linked
 * Facebook Page.
 */
export function getInstagramAuthUrl(config: InstagramOAuthConfig, state: string): string {
  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_insights',
  ];

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    response_type: 'code',
  });

  params.set('scope', scopes.join(','));

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export interface InstagramFacebookOAuthConfig extends InstagramOAuthConfig {
  configurationId: string;
}

/**
 * Generate the secondary Instagram-via-Facebook-Page OAuth URL.
 * This is Instagram API with Facebook Login and requires a Page-linked
 * Instagram Professional account.
 */
export function getInstagramFacebookAuthUrl(
  config: InstagramFacebookOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    response_type: 'code',
    config_id: config.configurationId,
    override_default_response_type: 'true',
  });

  return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange Instagram Login code for an Instagram short-lived access token.
 */
export async function exchangeInstagramLoginCode(
  config: InstagramOAuthConfig,
  code: string
): Promise<{ access_token: string; user_id: string; permissions?: string[] }> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error_message || error?.error?.message || 'Failed to exchange Instagram OAuth code'
    );
  }

  return response.json();
}

/**
 * Exchange an Instagram short-lived token for a long-lived Instagram token.
 */
export async function exchangeInstagramLongLivedToken(
  config: Pick<InstagramOAuthConfig, 'clientSecret'>,
  shortLivedToken: string
): Promise<{ access_token: string; token_type?: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: config.clientSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || 'Failed to exchange Instagram long-lived token');
  }

  return response.json();
}

/**
 * Refresh a long-lived Instagram Login token.
 */
export async function refreshInstagramLongLivedToken(
  accessToken: string
): Promise<{ access_token: string; token_type?: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || 'Failed to refresh Instagram token');
  }

  return response.json();
}

export interface InstagramLoginAccountInfo {
  id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

/**
 * Get account info for Instagram API with Instagram Login.
 */
export async function getInstagramLoginAccountInfo(
  accessToken: string
): Promise<InstagramLoginAccountInfo> {
  const fields = [
    'id',
    'username',
    'name',
    'account_type',
    'profile_picture_url',
    'followers_count',
    'follows_count',
    'media_count',
  ].join(',');

  const response = await fetch(
    `https://graph.instagram.com/v24.0/me?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || 'Failed to fetch Instagram account info');
  }

  return response.json();
}

/**
 * Exchange Instagram/Facebook OAuth code for access token.
 */
export async function exchangeInstagramCode(
  config: InstagramOAuthConfig,
  code: string
): Promise<{ access_token: string; token_type: string }> {
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
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange Instagram OAuth code');
  }

  return response.json();
}

export function getInstagramGraphBaseUrl(connectedVia?: string): string {
  return connectedVia === 'instagram_login'
    ? 'https://graph.instagram.com/v24.0'
    : 'https://graph.facebook.com/v24.0';
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

/**
 * Get Instagram business accounts connected to Facebook page
 */
export async function getInstagramBusinessAccounts(
  pageAccessToken: string,
  pageId: string
): Promise<InstagramBusinessAccount | null> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram business account');
  }

  const data = await response.json();

  if (!data.instagram_business_account) {
    return null;
  }

  // Get detailed account info
  const igResponse = await fetch(
    `https://graph.facebook.com/v24.0/${data.instagram_business_account.id}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${pageAccessToken}`
  );

  if (!igResponse.ok) {
    throw new Error('Failed to fetch Instagram account details');
  }

  return igResponse.json();
}

/**
 * Post media to Instagram (Create Container + Publish)
 */
export async function postInstagramMedia(
  accessToken: string,
  instagramAccountId: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'IMAGE' | 'VIDEO' | 'REELS' = 'IMAGE',
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<{ id: string }> {
  // Step 1: Create container
  const containerParams = new URLSearchParams({
    access_token: accessToken,
    caption: caption || '',
  });

  if (mediaType === 'IMAGE') {
    containerParams.append('image_url', mediaUrl);
  } else {
    containerParams.append('video_url', mediaUrl);
    containerParams.append('media_type', mediaType === 'REELS' ? 'REELS' : 'VIDEO');
  }

  const containerResponse = await fetch(
    `${baseUrl}/${instagramAccountId}/media?${containerParams.toString()}`,
    { method: 'POST' }
  );

  if (!containerResponse.ok) {
    const error = await containerResponse.json();
    throw new Error(error.error?.message || 'Failed to create Instagram media container');
  }

  const containerData = await containerResponse.json();
  const creationId = containerData.id;

  // Step 2: Publish container
  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: creationId,
  });

  const publishResponse = await fetch(
    `${baseUrl}/${instagramAccountId}/media_publish?${publishParams.toString()}`,
    { method: 'POST' }
  );

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(error.error?.message || 'Failed to publish Instagram media');
  }

  return publishResponse.json();
}

/**
 * Get Instagram media list
 */
export async function getInstagramMedia(
  accessToken: string,
  instagramAccountId: string,
  limit: number = 20,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<any[]> {
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
    'like_count',
    'comments_count',
  ].join(',');

  const response = await fetch(
    `${baseUrl}/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram media');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create Instagram media container (for images)
 */
type InstagramMediaContent =
  | {
      image_url: string;
      caption: string;
    }
  | {
      video_url: string;
      caption: string;
    };

export async function createInstagramMediaContainer(
  igAccountId: string,
  accessToken: string,
  content: InstagramMediaContent,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<{ id: string }> {
  const response = await fetch(`${baseUrl}/${igAccountId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...content,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Instagram media container');
  }

  return response.json();
}

/**
 * Publish Instagram media container
 */
export async function publishInstagramMedia(
  igAccountId: string,
  accessToken: string,
  creationId: string,
  publishTime?: Date,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<{ id: string }> {
  const response = await fetch(`${baseUrl}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
      ...(publishTime
        ? {
            publish_time: Math.floor(publishTime.getTime() / 1000),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to publish Instagram media');
  }

  return response.json();
}

/**
 * Get Instagram media insights
 */
export async function getInstagramMediaInsights(
  mediaId: string,
  accessToken: string,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<any[]> {
  const metrics = ['impressions', 'reach', 'engagement', 'saved', 'comments', 'likes', 'shares'];

  const response = await fetch(
    `${baseUrl}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram media insights');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Instagram account insights
 */
export async function getInstagramAccountInsights(
  igAccountId: string,
  accessToken: string,
  period: 'day' | 'week' | 'days_28' = 'day',
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<any[]> {
  const metrics = ['impressions', 'reach', 'follower_count', 'profile_views'];

  const response = await fetch(
    `${baseUrl}/${igAccountId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram account insights');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Instagram comments on a media
 */
export async function getInstagramComments(
  mediaId: string,
  accessToken: string,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<any[]> {
  const response = await fetch(
    `${baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram comments');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Reply to Instagram comment
 */
export async function replyToInstagramComment(
  commentId: string,
  accessToken: string,
  message: string,
  baseUrl = 'https://graph.facebook.com/v24.0'
): Promise<{ id: string }> {
  const response = await fetch(`${baseUrl}/${commentId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to reply to Instagram comment');
  }

  return response.json();
}
