/**
 * Instagram OAuth Integration
 * Instagram uses Facebook's Graph API for business accounts
 */

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
 * Create Instagram media container (for images)
 */
export async function createInstagramMediaContainer(
  igAccountId: string,
  accessToken: string,
  content: {
    image_url: string;
    caption: string;
  }
): Promise<{ id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: content.image_url,
        caption: content.caption,
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
  creationId: string
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
 * Get Instagram media (posts)
 */
export async function getInstagramMedia(
  igAccountId: string,
  accessToken: string,
  limit: number = 25
): Promise<any> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram media');
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

