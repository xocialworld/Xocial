/**
 * YouTube OAuth 2.0 Integration
 * Google OAuth 2.0 for YouTube Data API v3
 */

export interface YouTubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YouTubeTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
  brandingSettings?: {
    channel?: {
      title: string;
      description: string;
    };
  };
}

export interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    tags?: string[];
    categoryId?: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string; // ISO 8601 duration (e.g. PT1M)
    dimension?: string;
    definition?: string;
  };
}

/**
 * Generate YouTube/Google OAuth authorization URL
 */
export function getYouTubeAuthUrl(
  config: YouTubeOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline', // To get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeYouTubeCode(
  config: YouTubeOAuthConfig,
  code: string
): Promise<YouTubeTokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    let description = 'Failed to exchange YouTube authorization code';
    try {
      const error = await response.json();
      description = error.error_description || error.error || description;
    } catch { }
    // Use APIError so our handler preserves the message
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(400, description, 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }

  return response.json();
}

/**
 * Refresh YouTube access token
 */
export async function refreshYouTubeToken(
  config: YouTubeOAuthConfig,
  refreshToken: string
): Promise<YouTubeTokenResponse> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(401, 'Failed to refresh YouTube token', 'OAUTH_TOKEN_REFRESH_FAILED');
  }

  return response.json();
}

/**
 * Get user's YouTube channels
 */
export async function getYouTubeChannels(
  accessToken: string
): Promise<YouTubeChannel[]> {
  const params = new URLSearchParams({
    part: 'snippet,statistics,brandingSettings',
    mine: 'true',
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const description = 'Failed to fetch YouTube channels';
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, description, 'YOUTUBE_API_ERROR');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Upload a video to YouTube
 */
export async function uploadYouTubeVideo(
  accessToken: string,
  videoFile: Blob,
  metadata: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
  }
): Promise<YouTubeVideo> {
  // First, insert video metadata
  const metadataResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': videoFile.type,
        'X-Upload-Content-Length': videoFile.size.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags || [],
          categoryId: metadata.categoryId || '22', // Default to People & Blogs
        },
        status: {
          privacyStatus: metadata.privacyStatus || 'private',
        },
      }),
    }
  );

  if (!metadataResponse.ok) {
    const error = await metadataResponse.json();
    throw new Error(error.error?.message || 'Failed to initiate YouTube video upload');
  }

  const uploadUrl = metadataResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from YouTube');
  }

  // Upload the actual video file
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': videoFile.type,
    },
    body: videoFile,
  });

  if (!uploadResponse.ok) {
    let message = 'Failed to upload video file to YouTube';

    try {
      const error = await uploadResponse.json();
      message = error.error?.message || message;
    } catch {
      // If parsing fails, fall back to default message
    }

    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(uploadResponse.status || 400, message, 'YOUTUBE_UPLOAD_FAILED');
  }

  return uploadResponse.json();
}

/**
 * Update video metadata (e.g., for scheduling)
 */
export async function updateYouTubeVideo(
  accessToken: string,
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    privacyStatus?: 'private' | 'public' | 'unlisted';
    publishAt?: string; // ISO 8601 format
  }
): Promise<YouTubeVideo> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: videoId,
        snippet: {
          title: updates.title,
          description: updates.description,
          tags: updates.tags,
        },
        status: {
          privacyStatus: updates.privacyStatus,
          publishAt: updates.publishAt,
        },
      }),
    }
  );

  if (!response.ok) {
    let message = 'Failed to update YouTube video';
    try {
      const error = await response.json();
      message = error.error?.message || message;
    } catch { }
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, message, 'YOUTUBE_API_ERROR');
  }

  return response.json();
}

/**
 * Get channel statistics
 */
export async function getYouTubeChannelStats(
  accessToken: string,
  channelId: string
): Promise<YouTubeChannel> {
  const params = new URLSearchParams({
    part: 'statistics,snippet',
    id: channelId,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, 'Failed to fetch YouTube channel stats', 'YOUTUBE_API_ERROR');
  }

  const data = await response.json();
  return data.items?.[0];
}

/**
 * Get video analytics
 */
export async function getYouTubeVideoStats(
  accessToken: string,
  videoId: string
): Promise<YouTubeVideo> {
  const params = new URLSearchParams({
    part: 'statistics,snippet,contentDetails',
    id: videoId,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, 'Failed to fetch YouTube video stats', 'YOUTUBE_API_ERROR');
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  if (items.length === 0) {
    throw new Error('YouTube video not found');
  }

  return items[0];
}

/**
 * Get channel's recent videos
 */
export async function getYouTubeChannelVideos(
  accessToken: string,
  channelId: string,
  maxResults: number = 25
): Promise<YouTubeVideo[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    maxResults: maxResults.toString(),
    order: 'date',
    type: 'video',
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, 'Failed to fetch YouTube channel videos', 'YOUTUBE_API_ERROR');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Delete a YouTube video
 */
export async function deleteYouTubeVideo(
  accessToken: string,
  videoId: string
): Promise<void> {
  const params = new URLSearchParams({ id: videoId });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, 'Failed to delete YouTube video', 'YOUTUBE_API_ERROR');
  }
}

/**
 * Get video comments
 */
export async function getYouTubeVideoComments(
  accessToken: string,
  videoId: string,
  maxResults: number = 100
): Promise<any[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    maxResults: maxResults.toString(),
    order: 'relevance',
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, 'Failed to fetch YouTube video comments', 'YOUTUBE_API_ERROR');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Set custom thumbnail for a YouTube video
 */
export async function setYouTubeVideoThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailUrl: string
): Promise<void> {
  // Fetch the thumbnail image
  const imageResponse = await fetch(thumbnailUrl);
  if (!imageResponse.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(imageResponse.status || 400, 'Failed to fetch thumbnail image', 'THUMBNAIL_FETCH_FAILED');
  }

  const imageBlob = await imageResponse.blob();

  // Upload thumbnail to YouTube
  const params = new URLSearchParams({ videoId });

  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': imageBlob.type,
      },
      body: imageBlob,
    }
  );

  if (!response.ok) {
    let message = 'Failed to set YouTube video thumbnail';
    try {
      const error = await response.json();
      message = error.error?.message || message;
    } catch { }
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, message, 'YOUTUBE_API_ERROR');
  }
}

/**
 * Reply to a YouTube comment
 */
export async function replyToYouTubeComment(
  accessToken: string,
  commentId: string,
  replyText: string
): Promise<void> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/comments?part=snippet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          parentId: commentId,
          textOriginal: replyText,
        },
      }),
    }
  );

  if (!response.ok) {
    let message = 'Failed to reply to comment';
    try {
      const error = await response.json();
      message = error.error?.message || message;
    } catch { }
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(response.status || 400, message, 'YOUTUBE_API_ERROR');
  }
}

