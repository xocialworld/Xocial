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

    const initResponse = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.error?.message || 'Failed to initialize YouTube upload');
    }

    // Get upload URL from location header
    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    // Step 2: Upload video file
    // In production, this would stream the file from video.videoUrl
    const videoResponse = await fetch(video.videoUrl);
    const videoBlob = await videoResponse.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/*',
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error?.message || 'Failed to upload video to YouTube');
    }

    const data = await uploadResponse.json();
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

    const response = await fetch(`${url}?${params}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update YouTube video');
    }

    return response.json();
  }

  /**
   * Get video statistics
   */
  async getVideoStats(videoId: string): Promise<any> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      part: 'statistics,snippet',
      id: videoId,
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch YouTube video stats');
    }

    const data = await response.json();
    const video = data.items?.[0];

    if (!video) {
      throw new Error('Video not found');
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

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch YouTube channel info');
    }

    const data = await response.json();
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

    const response = await fetch(`${url}?${params}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete YouTube video');
    }

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
    throw new Error('YouTube account not found');
  }

  if (!account.is_active) {
    throw new Error('YouTube account is not active. Please reconnect.');
  }

  // Check if token is expired and refresh if possible
  if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
    if (account.refresh_token) {
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
      
      await supabase
        .from('social_accounts')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
      
      // Use the new token
      const accessToken = newTokens.access_token;
      return new YouTubeClient({
        accessToken,
        channelId: account.account_id,
      });
    } else {
      throw new Error('YouTube access token has expired. Please reconnect your account.');
    }
  }

  // Decrypt access token
  const accessToken = decryptToken(account.access_token);

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
  thumbnailUrl?: string;
}): Promise<{ id: string; url: string }> {
  const client = await createYouTubeClient(config.accountId);
  
  // Fetch video file
  const videoResponse = await fetch(config.videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video file from ${config.videoUrl}`);
  }
  
  const videoBlob = await videoResponse.blob();
  
  // Upload video
  const result = await uploadYouTubeVideo(
    client['accessToken'],
    videoBlob,
    {
      title: config.title,
      description: config.description,
      tags: config.tags,
      categoryId: config.categoryId,
      privacyStatus: config.privacyStatus || 'public',
    }
  );
  
  // Upload thumbnail if provided
  if (config.thumbnailUrl && result.id) {
    try {
      await setYouTubeVideoThumbnail(client['accessToken'], result.id, config.thumbnailUrl);
    } catch (error) {
      // Log but don't fail the whole operation
      console.warn('Failed to upload thumbnail:', error);
    }
  }
  
  return {
    id: result.id,
    url: `https://www.youtube.com/watch?v=${result.id}`,
  };
}

