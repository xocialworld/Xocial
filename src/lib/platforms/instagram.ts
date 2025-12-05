/**
 * Instagram Graph API Integration
 * Handles Instagram Business account posting and media management
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';

export interface InstagramConfig {
  accessToken: string;
  instagramAccountId: string;
}

export interface InstagramPost {
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  location?: {
    id: string;
    name: string;
  };
}

export class InstagramClient {
  private baseUrl = 'https://graph.facebook.com/v24.0';
  private accessToken: string;
  private instagramAccountId: string;

  constructor(config: InstagramConfig) {
    this.accessToken = config.accessToken;
    this.instagramAccountId = config.instagramAccountId;
  }

  /**
   * Publish an image post to Instagram
   * Instagram requires a two-step process: create container, then publish
   */
  async publishImage(post: InstagramPost): Promise<{ id: string }> {
    // Step 1: Create media container
    const containerId = await this.createMediaContainer({
      image_url: post.imageUrl!,
      caption: post.caption,
    });

    // Step 2: Publish the container
    return await this.publishContainer(containerId);
  }

  /**
   * Publish a video post to Instagram
   */
  async publishVideo(post: InstagramPost): Promise<{ id: string }> {
    // Step 1: Create video container
    const containerId = await this.createMediaContainer({
      video_url: post.videoUrl!,
      caption: post.caption,
      media_type: 'VIDEO',
    });

    // Step 2: Publish the container
    return await this.publishContainer(containerId);
  }

  /**
   * Create media container (Step 1 of publishing)
   */
  private async createMediaContainer(params: {
    image_url?: string;
    video_url?: string;
    caption: string;
    media_type?: string;
  }): Promise<string> {
    const url = `${this.baseUrl}/${this.instagramAccountId}/media`;

    const body: any = {
      caption: params.caption,
      access_token: this.accessToken,
    };

    if (params.image_url) {
      body.image_url = params.image_url;
    }

    if (params.video_url) {
      body.video_url = params.video_url;
      body.media_type = 'VIDEO';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create Instagram media container');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Publish media container (Step 2 of publishing)
   */
  private async publishContainer(containerId: string): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${this.instagramAccountId}/media_publish`;

    const body = {
      creation_id: containerId,
      access_token: this.accessToken,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to publish Instagram post');
    }

    return response.json();
  }

  /**
   * Get media insights (engagement metrics)
   */
  async getMediaInsights(mediaId: string): Promise<any> {
    const url = `${this.baseUrl}/${mediaId}/insights`;
    const params = new URLSearchParams({
      metric: 'engagement,impressions,reach,saved',
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch Instagram insights');
    }

    const data = await response.json();

    // Parse insights into simple object
    const insights: any = {};
    data.data?.forEach((item: any) => {
      insights[item.name] = item.values?.[0]?.value || 0;
    });

    return insights;
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    const url = `${this.baseUrl}/${this.instagramAccountId}`;
    const params = new URLSearchParams({
      fields: 'username,name,profile_picture_url,followers_count,follows_count,media_count,biography',
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch Instagram account info');
    }

    return response.json();
  }

  /**
   * Get recent media posts
   */
  async getRecentMedia(limit: number = 25): Promise<any[]> {
    const url = `${this.baseUrl}/${this.instagramAccountId}/media`;
    const params = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
      limit: limit.toString(),
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch Instagram media');
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Delete a media post
   */
  async deleteMedia(mediaId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${mediaId}`;
    const params = new URLSearchParams({
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete Instagram media');
    }

    return response.json();
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comments for a media item
   */
  async getComments(mediaId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${mediaId}/comments`;
    const params = new URLSearchParams({
      fields: 'id,text,username,timestamp,like_count,replies',
      access_token: this.accessToken,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch Instagram comments');
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${commentId}/replies`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: this.accessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to reply to Instagram comment');
    }

    return response.json();
  }
}

/**
 * Helper function to create Instagram client from database
 */
export async function createInstagramClient(accountId: string): Promise<InstagramClient> {
  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('account_id, access_token, is_active')
    .eq('id', accountId)
    .eq('platform', 'instagram')
    .single();

  if (error || !account || !account.is_active) {
    throw new Error('Instagram account not found or inactive');
  }

  if (!account.access_token) {
    throw new Error('Instagram access token missing from account record');
  }

  // Decrypt token
  const accessToken = decryptToken(account.access_token);

  return new InstagramClient({
    accessToken,
    instagramAccountId: account.account_id,
  });
}

