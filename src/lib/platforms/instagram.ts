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
  mediaUrls?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM';
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
      media_type: post.mediaType === 'REELS' ? 'REELS' : 'VIDEO',
    });
    await this.waitForContainerReady(containerId);

    // Step 2: Publish the container
    return await this.publishContainer(containerId);
  }

  async publishCarousel(post: InstagramPost): Promise<{ id: string }> {
    if (!post.mediaUrls || post.mediaUrls.length < 2) {
      throw new Error('Instagram carousel publishing requires at least two media URLs');
    }

    const children = await Promise.all(
      post.mediaUrls.slice(0, 10).map(async (mediaUrl) => {
        const isVideo = mediaUrl.toLowerCase().includes('.mp4') || mediaUrl.toLowerCase().includes('video');
        const containerId = await this.createMediaContainer({
          ...(isVideo ? { video_url: mediaUrl, media_type: 'VIDEO' } : { image_url: mediaUrl }),
          caption: '',
          is_carousel_item: true,
        });
        if (isVideo) {
          await this.waitForContainerReady(containerId);
        }
        return containerId;
      })
    );

    const containerId = await this.createMediaContainer({
      caption: post.caption,
      media_type: 'CAROUSEL',
      children,
    });
    await this.waitForContainerReady(containerId);

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
    is_carousel_item?: boolean;
    children?: string[];
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
      body.media_type = params.media_type || 'VIDEO';
    }

    if (params.media_type && !body.media_type) {
      body.media_type = params.media_type;
    }

    if (params.is_carousel_item) {
      body.is_carousel_item = true;
    }

    if (params.children?.length) {
      body.children = params.children.join(',');
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

  private async waitForContainerReady(containerId: string): Promise<void> {
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: this.accessToken,
    });

    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await fetch(`${this.baseUrl}/${containerId}?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error?.message || 'Failed to check Instagram media container status');
      }

      const data = await response.json();
      const status = data.status_code;

      if (!status || status === 'FINISHED') {
        return;
      }

      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`Instagram media container is not publishable: ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Instagram media container was not ready before the publish timeout');
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
