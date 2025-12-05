/**
 * Instagram OAuth Integration
 * Instagram uses Facebook's Graph API for business accounts
 */

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Generate Instagram OAuth authorization URL
 * Instagram uses Facebook Login for OAuth
 */
export function getInstagramAuthUrl(
  config: InstagramOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    response_type: 'code',
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange Instagram/Facebook OAuth code for access token
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
    `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange Instagram OAuth code');
  }

  return response.json();
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
  mediaType: 'IMAGE' | 'VIDEO' | 'REELS' = 'IMAGE'
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
    `https://graph.facebook.com/v24.0/${instagramAccountId}/media?${containerParams.toString()}`,
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
    `https://graph.facebook.com/v24.0/${instagramAccountId}/media_publish?${publishParams.toString()}`,
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
  limit: number = 20
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
    'comments_count'
  ].join(',');

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
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
  content: InstagramMediaContent
): Promise<{ id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...content,
        access_token: accessToken,
      }),
    }
  );

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
  publishTime?: Date
): Promise<{ id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${igAccountId}/media_publish`,
    {
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
    }
  );

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
  accessToken: string
): Promise<any> {
  const metrics = [
    'impressions',
    'reach',
    'engagement',
    'saved',
    'comments',
    'likes',
    'shares',
  ];

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram media insights');
  }

  return response.json();
}

/**
 * Get Instagram account insights
 */
export async function getInstagramAccountInsights(
  igAccountId: string,
  accessToken: string,
  period: 'day' | 'week' | 'days_28' = 'day'
): Promise<any> {
  const metrics = [
    'impressions',
    'reach',
    'follower_count',
    'profile_views',
  ];

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${igAccountId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram account insights');
  }

  return response.json();
}



/**
 * Get Instagram comments on a media
 */
export async function getInstagramComments(
  mediaId: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram comments');
  }

  return response.json();
}

/**
 * Reply to Instagram comment
 */
export async function replyToInstagramComment(
  commentId: string,
  accessToken: string,
  message: string
): Promise<{ id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${commentId}/replies`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to reply to Instagram comment');
  }

  return response.json();
}

