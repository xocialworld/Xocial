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
    publishedAt?: string;
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
    include_granted_scopes: 'true', // Enable incremental auth
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
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (e: any) {
      lastError = e;
    }
    if (response && response.ok) {
      return response.json();
    }
    let status = response ? response.status : 0;
    let description = 'Failed to exchange YouTube authorization code';
    if (response) {
      try {
        const errorText = await response.text();
        console.error('[YouTube Token Exchange Error]', { status, body: errorText });
        const error = JSON.parse(errorText);
        description = error.error_description || error.error || description;
      } catch {
        console.error('[YouTube Token Exchange Error] Failed to parse error response');
      }
    } else if (lastError) {
      description = lastError.message || description;
    }
    if (status === 429 || status >= 500 || !response) {
      const delay = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(400, description, 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }
  const { APIError } = await import('@/lib/api-middleware');
  throw new APIError(400, 'Failed to exchange YouTube authorization code', 'OAUTH_TOKEN_EXCHANGE_FAILED');
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
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (e: any) {
      lastError = e;
    }
    if (response && response.ok) {
      const data = await response.json();
      return data.items || [];
    }
    let status = response ? response.status : 0;
    if (status === 429 || status >= 500 || !response) {
      const delay = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(status || 400, 'Failed to fetch YouTube channels', 'YOUTUBE_API_ERROR');
  }
  const { APIError } = await import('@/lib/api-middleware');
  throw new APIError(400, 'Failed to fetch YouTube channels', 'YOUTUBE_API_ERROR');
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
    publishAt?: string;
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
          ...(metadata.publishAt ? { publishAt: metadata.publishAt } : {}),
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
  // Primary approach: Search API (fast, but can return empty for some channels/content visibility)
  const searchParams = new URLSearchParams({
    part: 'snippet',
    channelId,
    maxResults: maxResults.toString(),
    order: 'date',
    type: 'video',
  });

  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    const { APIError } = await import('@/lib/api-middleware');
    throw new APIError(
      searchResponse.status || 400,
      'Failed to fetch YouTube channel videos',
      'YOUTUBE_API_ERROR'
    );
  }

  const searchData = await searchResponse.json();
  const searchItems = Array.isArray(searchData?.items) ? searchData.items : [];

  if (searchItems.length > 0) {
    return searchItems;
  }

  // Fallback approach (more reliable for connected accounts):
  // Use the channel's "Uploads" playlist and list videos via playlistItems.
  try {
    const uploadsPlaylistId = await getYouTubeUploadsPlaylistId(accessToken, channelId);
    const playlistItems = await getYouTubePlaylistVideos(accessToken, uploadsPlaylistId, maxResults);
    return playlistItems;
  } catch (e) {
    // If fallback fails, return empty list rather than throwing (sync callers will handle 0 items).
    return [];
  }
}

async function getYouTubeUploadsPlaylistId(accessToken: string, channelId: string): Promise<string> {
  const params = new URLSearchParams({
    part: 'contentDetails',
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
    throw new Error(`Failed to fetch YouTube channel contentDetails: ${response.status}`);
  }

  const data = await response.json();
  const item = Array.isArray(data?.items) ? data.items[0] : null;
  const uploads = item?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    throw new Error('YouTube uploads playlist not found for channel');
  }
  return uploads as string;
}

async function getYouTubePlaylistVideos(
  accessToken: string,
  playlistId: string,
  maxResults: number
): Promise<any[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: maxResults.toString(),
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube uploads playlist items: ${response.status}`);
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  // Normalize to the same shape our code expects from /search:
  // item.id.videoId + item.snippet
  return items
    .map((it: any) => {
      const videoId = it?.snippet?.resourceId?.videoId;
      if (!videoId) return null;
      return {
        id: { videoId },
        snippet: it.snippet,
      };
    })
    .filter(Boolean);
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
