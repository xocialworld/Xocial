/**
 * TikTok OAuth 2.0 Integration
 * TikTok for Business API / Content Posting API
 */

export interface TikTokOAuthConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideoInfo {
  id: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration: number;
  height: number;
  width: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

/**
 * Generate TikTok OAuth authorization URL
 */
export function getTikTokAuthUrl(
  config: TikTokOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_key: config.clientKey,
    scope: [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.upload',
      'video.publish',
    ].join(','),
    response_type: 'code',
    redirect_uri: config.redirectUri,
    state,
  });

  return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeTikTokCode(
  config: TikTokOAuthConfig,
  code: string
): Promise<TikTokTokenResponse> {
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange TikTok authorization code');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.data;
}

/**
 * Refresh TikTok access token
 */
export async function refreshTikTokToken(
  config: TikTokOAuthConfig,
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh TikTok token');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.data;
}

/**
 * Get TikTok user info
 */
export async function getTikTokUserInfo(
  accessToken: string,
  fields: string[] = [
    'open_id',
    'union_id',
    'avatar_url',
    'display_name',
    'bio_description',
    'profile_deep_link',
    'is_verified',
    'follower_count',
    'following_count',
    'likes_count',
    'video_count',
  ]
): Promise<TikTokUserInfo> {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(',')}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok user info');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch TikTok user info');
  }

  return data.data.user;
}

/**
 * Get user's TikTok videos
 */
export async function getTikTokUserVideos(
  accessToken: string,
  maxCount: number = 20
): Promise<{ videos: TikTokVideoInfo[]; has_more: boolean; cursor?: number }> {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count&max_count=${maxCount}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok videos');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch TikTok videos');
  }

  return data.data;
}

/**
 * Initialize video upload (Direct Post)
 */
export async function initializeTikTokUpload(
  accessToken: string,
  chunkSize: number,
  totalSize: number
): Promise<{ upload_id: string; upload_url: string }> {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: totalSize,
          chunk_size: chunkSize,
          total_chunk_count: Math.ceil(totalSize / chunkSize),
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to initialize TikTok video upload');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to initialize TikTok upload');
  }

  return data.data;
}

/**
 * Upload video chunk
 */
export async function uploadTikTokVideoChunk(
  uploadUrl: string,
  chunk: Blob
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
    },
    body: chunk,
  });

  if (!response.ok) {
    throw new Error('Failed to upload TikTok video chunk');
  }
}

/**
 * Publish TikTok video after upload
 */
export async function publishTikTokVideo(
  accessToken: string,
  uploadId: string,
  metadata: {
    title?: string;
    description?: string;
    privacy_level?: 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS' | 'PUBLIC_TO_EVERYONE';
    disable_comment?: boolean;
    disable_duet?: boolean;
    disable_stitch?: boolean;
    video_cover_timestamp_ms?: number;
  }
): Promise<{ publish_id: string }> {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: metadata.title || '',
          description: metadata.description || '',
          privacy_level: metadata.privacy_level || 'PUBLIC_TO_EVERYONE',
          disable_comment: metadata.disable_comment || false,
          disable_duet: metadata.disable_duet || false,
          disable_stitch: metadata.disable_stitch || false,
          video_cover_timestamp_ms: metadata.video_cover_timestamp_ms || 0,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          upload_id: uploadId,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to publish TikTok video');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to publish TikTok video');
  }

  return data.data;
}

/**
 * Check video publishing status
 */
export async function getTikTokPublishStatus(
  accessToken: string,
  publishId: string
): Promise<{
  status: 'PROCESSING_UPLOAD' | 'SENDING_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
  fail_reason?: string;
  publicaly_available_post_id?: string[];
}> {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/post/publish/status/fetch/?publish_id=${publishId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok publish status');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch TikTok publish status');
  }

  return data.data;
}

/**
 * Get video comments
 */
export async function getTikTokVideoComments(
  accessToken: string,
  videoId: string,
  maxCount: number = 50
): Promise<any[]> {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/video/comment/list/?video_id=${videoId}&max_count=${maxCount}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok video comments');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch TikTok comments');
  }

  return data.data?.comments || [];
}

/**
 * Reply to a TikTok comment
 */
export async function replyToTikTokComment(
  accessToken: string,
  videoId: string,
  commentId: string,
  text: string
): Promise<{ comment_id: string }> {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/video/comment/reply/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        comment_id: commentId,
        text,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to reply to TikTok comment');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed to reply to TikTok comment');
  }

  return data.data;
}

