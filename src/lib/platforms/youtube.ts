/**
 * YouTube Data API Integration
 * Handles video uploads, playlist management, and analytics
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { uploadYouTubeVideo, setYouTubeVideoThumbnail, refreshYouTubeToken } from '@/lib/oauth/youtube';

export interface YouTubeConfig {
  accessToken: string;
  channelId: string;
}

export interface YouTubeVideo {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  categoryId?: string;
  tags?: string[];
  publishAt?: string; // ISO 8601 timestamp for scheduled publishing
}

/**
 * YouTube-specific error types for better error categorization
 */
export type YouTubeErrorType = 
  | 'AUTH_ERROR'           // 401 - Token invalid/expired, needs reconnection
  | 'QUOTA_EXCEEDED'       // 403 with quotaExceeded - Daily quota reached
  | 'FORBIDDEN'            // 403 - Missing permissions or channel issues
  | 'CONTENT_ERROR'        // 400 - Content rejected (policy violation, etc.)
  | 'UPLOAD_ERROR'         // Upload specific failures
  | 'RATE_LIMIT'           // Too many requests
  | 'SERVER_ERROR'         // 5xx - YouTube server error
  | 'NOT_FOUND'            // 404 - Video/channel not found
  | 'UNKNOWN';

export interface YouTubeError extends Error {
  type: YouTubeErrorType;
  reason?: string;
  canRetry: boolean;
  quotaInfo?: {
    dailyLimit?: number;
    remaining?: number;
  };
}

/**
 * Create a typed YouTube error
 */
function createYouTubeError(
  message: string, 
  type: YouTubeErrorType, 
  options?: { 
    reason?: string;
    quotaInfo?: { dailyLimit?: number; remaining?: number };
  }
): YouTubeError {
  const error = new Error(message) as YouTubeError;
  error.type = type;
  error.reason = options?.reason;
  error.quotaInfo = options?.quotaInfo;
  error.canRetry = ['SERVER_ERROR', 'RATE_LIMIT'].includes(type);
  return error;
}

/**
 * Categorize YouTube API errors
 */
function categorizeYouTubeError(status: number, errorData: any): { type: YouTubeErrorType; message: string; reason?: string } {
  const errorReason = errorData.error?.errors?.[0]?.reason || '';
  const errorMessage = errorData.error?.message || errorData.message || `YouTube API error: ${status}`;
  
  switch (status) {
    case 401:
      return {
        type: 'AUTH_ERROR',
        message: `YouTube authentication failed: ${errorMessage}. Please reconnect your account.`,
        reason: errorReason,
      };
    case 403:
      // Check for quota exceeded
      if (errorReason === 'quotaExceeded' || errorMessage.includes('quota')) {
        return {
          type: 'QUOTA_EXCEEDED',
          message: 'YouTube API daily quota exceeded. Please try again tomorrow.',
          reason: errorReason,
        };
      }
      // Check for channel-related issues
      if (errorReason === 'channelNotFound' || errorReason === 'channelClosed') {
        return {
          type: 'FORBIDDEN',
          message: 'YouTube channel not found or is closed. Please verify your channel.',
          reason: errorReason,
        };
      }
      return {
        type: 'FORBIDDEN',
        message: `YouTube access denied: ${errorMessage}. Verify your channel has the required permissions.`,
        reason: errorReason,
      };
    case 404:
      return {
        type: 'NOT_FOUND',
        message: `YouTube resource not found: ${errorMessage}`,
        reason: errorReason,
      };
    case 400:
      return {
        type: 'CONTENT_ERROR',
        message: `YouTube rejected the request: ${errorMessage}`,
        reason: errorReason,
      };
    case 429:
      return {
        type: 'RATE_LIMIT',
        message: 'Too many requests to YouTube API. Please wait and try again.',
        reason: errorReason,
      };
    default:
      if (status >= 500) {
        return {
          type: 'SERVER_ERROR',
          message: `YouTube server error: ${errorMessage}`,
          reason: errorReason,
        };
      }
      return {
        type: 'UNKNOWN',
        message: errorMessage,
        reason: errorReason,
      };
  }
}

export class YouTubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/youtube/v3';
  private accessToken: string;
  private channelId: string;

  constructor(config: YouTubeConfig) {
    this.accessToken = config.accessToken;
    this.channelId = config.channelId;
  }

  /**
   * Internal method to make API requests with error handling
   */
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const categorized = categorizeYouTubeError(response.status, errorData);
      throw createYouTubeError(categorized.message, categorized.type, { reason: categorized.reason });
    }

    // Handle empty responses (like DELETE)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    return {} as T;
  }

  /**
   * Upload a video to YouTube
   * Note: This is a simplified version. Real implementation requires resumable upload
   */
  async uploadVideo(video: YouTubeVideo): Promise<{ id: string }> {
    const url = `${this.uploadUrl}/videos`;
    const params = new URLSearchParams({
      part: 'snippet,status',
      uploadType: 'resumable',
    });

    // Step 1: Initialize upload session
    const metadata = {
      snippet: {
        title: video.title,
        description: video.description,
        tags: video.tags || [],
        categoryId: video.categoryId || '22', // People & Blogs default
      },
      status: {
        privacyStatus: video.privacyStatus || 'public',
        publishAt: video.publishAt,
      },
    };

    console.log('[YouTube] Initializing video upload:', { title: video.title, privacy: video.privacyStatus });

    const initResponse = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!initResponse.ok) {
      let errorData: any = {};
      try {
        errorData = await initResponse.json();
      } catch {
        errorData = { message: 'Failed to initialize upload' };
      }
      
      const categorized = categorizeYouTubeError(initResponse.status, errorData);
      console.error('[YouTube] Upload initialization failed:', categorized);
      throw createYouTubeError(categorized.message, categorized.type, { reason: categorized.reason });
    }

    // Get upload URL from location header
    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw createYouTubeError('No upload URL received from YouTube', 'UPLOAD_ERROR');
    }

    console.log('[YouTube] Upload session initialized, fetching video file...');

    // Step 2: Upload video file
    const videoResponse = await fetch(video.videoUrl);
    if (!videoResponse.ok) {
      throw createYouTubeError(
        `Failed to fetch video file from source: ${video.videoUrl}`,
        'UPLOAD_ERROR'
      );
    }

    const videoBlob = await videoResponse.blob();
    console.log('[YouTube] Video file fetched, size:', videoBlob.size, 'bytes');

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/*',
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      let errorData: any = {};
      try {
        errorData = await uploadResponse.json();
      } catch {
        errorData = { message: 'Upload failed' };
      }
      
      const categorized = categorizeYouTubeError(uploadResponse.status, errorData);
      console.error('[YouTube] Video upload failed:', categorized);
      throw createYouTubeError(categorized.message, categorized.type, { reason: categorized.reason });
    }

    const data = await uploadResponse.json();
    console.log('[YouTube] Video uploaded successfully:', data.id);
    return { id: data.id };
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, updates: Partial<YouTubeVideo>): Promise<any> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      part: 'snippet,status',
    });

    const body: any = {
      id: videoId,
    };

    if (updates.title || updates.description || updates.tags) {
      body.snippet = {};
      if (updates.title) body.snippet.title = updates.title;
      if (updates.description) body.snippet.description = updates.description;
      if (updates.tags) body.snippet.tags = updates.tags;
    }

    if (updates.privacyStatus || updates.publishAt) {
      body.status = {};
      if (updates.privacyStatus) body.status.privacyStatus = updates.privacyStatus;
      if (updates.publishAt) body.status.publishAt = updates.publishAt;
    }

    return this.makeRequest(`${url}?${params}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get video statistics
   */
  async getVideoStats(videoId: string): Promise<{
    views: number;
    likes: number;
    comments: number;
    favorites: number;
  }> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      part: 'statistics,snippet',
      id: videoId,
    });

    const data = await this.makeRequest<any>(`${url}?${params}`);
    const video = data.items?.[0];

    if (!video) {
      throw createYouTubeError('Video not found', 'NOT_FOUND');
    }

    return {
      views: parseInt(video.statistics.viewCount || '0'),
      likes: parseInt(video.statistics.likeCount || '0'),
      comments: parseInt(video.statistics.commentCount || '0'),
      favorites: parseInt(video.statistics.favoriteCount || '0'),
    };
  }

  /**
   * Get channel information
   */
  async getChannelInfo(): Promise<any> {
    const url = `${this.baseUrl}/channels`;
    const params = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings',
      id: this.channelId,
    });

    const data = await this.makeRequest<any>(`${url}?${params}`);
    return data.items?.[0];
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      id: videoId,
    });

    await this.makeRequest(`${url}?${params}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getChannelInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to create YouTube client from database
 */
export async function createYouTubeClient(accountId: string): Promise<YouTubeClient> {
  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('account_id, access_token, refresh_token, is_active, token_expires_at')
    .eq('id', accountId)
    .eq('platform', 'youtube')
    .single();

  if (error || !account) {
    throw createYouTubeError(
      `YouTube account not found: ${accountId}`,
      'AUTH_ERROR'
    );
  }

  if (!account.is_active) {
    throw createYouTubeError(
      'YouTube account is not active. Please reconnect.',
      'AUTH_ERROR'
    );
  }

  let accessToken: string;

  // Check if token is expired and refresh if possible
  const tokenExpired = account.token_expires_at && new Date(account.token_expires_at) < new Date();
  
  if (tokenExpired) {
    console.log('[YouTube] Token expired, attempting refresh...');
    
    if (!account.refresh_token) {
      // Mark account as needing reconnection
      await supabase
        .from('social_accounts')
        .update({
          status: 'needs_reconnection',
          error_message: 'Access token expired and no refresh token available.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      throw createYouTubeError(
        'YouTube access token has expired. Please reconnect your account.',
        'AUTH_ERROR'
      );
    }

    try {
      // Attempt to refresh the token
      const config = {
        clientId: process.env.YOUTUBE_CLIENT_ID!,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
      };

      const decryptedRefreshToken = decryptToken(account.refresh_token);
      const newTokens = await refreshYouTubeToken(config, decryptedRefreshToken);

      // Encrypt and update tokens in database
      const encryptedAccessToken = encryptToken(newTokens.access_token);
      const encryptedRefreshToken = newTokens.refresh_token
        ? encryptToken(newTokens.refresh_token)
        : account.refresh_token;

      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      await supabase
        .from('social_accounts')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: newExpiresAt,
          status: 'active',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      console.log('[YouTube] Token refreshed successfully, new expiry:', newExpiresAt);
      accessToken = newTokens.access_token;
    } catch (refreshError: any) {
      console.error('[YouTube] Token refresh failed:', refreshError);

      // Mark account as needing reconnection
      await supabase
        .from('social_accounts')
        .update({
          status: 'needs_reconnection',
          error_message: 'Token refresh failed. Please reconnect your account.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      throw createYouTubeError(
        'Failed to refresh YouTube token. Please reconnect your account.',
        'AUTH_ERROR'
      );
    }
  } else {
    // Decrypt access token
    try {
      accessToken = decryptToken(account.access_token);
    } catch (decryptError) {
      console.error('[YouTube] Failed to decrypt access token:', decryptError);
      throw createYouTubeError(
        'Failed to decrypt YouTube access token. Please reconnect your account.',
        'AUTH_ERROR'
      );
    }
  }

  return new YouTubeClient({
    accessToken,
    channelId: account.account_id,
  });
}

/**
 * Publish video to YouTube (used by unified publisher)
 */
export async function publishToYouTube(config: {
  accountId: string;
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
  publishAt?: string;
  thumbnailUrl?: string;
}): Promise<{ id: string; url: string }> {
  console.log('[YouTube] Publishing video:', { 
    accountId: config.accountId, 
    title: config.title,
    privacy: config.privacyStatus 
  });

  const client = await createYouTubeClient(config.accountId);

  // Upload video
  const result = await client.uploadVideo({
    title: config.title,
    description: config.description,
    videoUrl: config.videoUrl,
    tags: config.tags,
    categoryId: config.categoryId,
    privacyStatus: config.privacyStatus || 'public',
    publishAt: config.publishAt,
  });

  // Upload thumbnail if provided
  if (config.thumbnailUrl && result.id) {
    try {
      await setYouTubeVideoThumbnail(client['accessToken'], result.id, config.thumbnailUrl);
      console.log('[YouTube] Thumbnail uploaded for video:', result.id);
    } catch (error) {
      // Log but don't fail the whole operation
      console.warn('[YouTube] Failed to upload thumbnail:', error);
    }
  }

  return {
    id: result.id,
    url: `https://www.youtube.com/watch?v=${result.id}`,
  };
}

// Export error utilities
export { createYouTubeError, categorizeYouTubeError };
