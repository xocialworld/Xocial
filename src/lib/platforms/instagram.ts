/**
 * Instagram Graph API Integration
 * Handles Instagram Business account posting and media management
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/encryption';
import { getInstagramGraphBaseUrl } from '@/lib/oauth/instagram';
import { mediaUrlLooksLikeVideo } from './publish-utils';
import type { InstagramPublishOptions } from '@/lib/instagram-publishing';

export interface InstagramConfig {
  accessToken: string;
  instagramAccountId: string;
  baseUrl?: string;
}

export interface InstagramPost {
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaUrls?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM' | 'STORIES';
  options?: InstagramPublishOptions;
  location?: {
    id: string;
    name: string;
  };
}

export class InstagramContainerProcessingError extends Error {
  code = 'INSTAGRAM_CONTAINER_PROCESSING';
  retryable = true;

  constructor(
    message: string,
    public containerId: string,
    public statusCode?: string | null
  ) {
    super(message);
    this.name = 'InstagramContainerProcessingError';
  }
}

export class InstagramClient {
  private baseUrl = 'https://graph.facebook.com/v24.0';
  private accessToken: string;
  private instagramAccountId: string;

  constructor(config: InstagramConfig) {
    this.accessToken = config.accessToken;
    this.instagramAccountId = config.instagramAccountId;
    this.baseUrl = config.baseUrl || this.baseUrl;
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
      alt_text: post.options?.altText,
      collaborators: post.options?.collaborators,
      location_id: post.options?.locationId,
      user_tags: post.options?.userTags,
      product_tags: post.options?.productTags,
    });

    // Step 2: Publish the container
    return await this.publishContainer(containerId);
  }

  /**
   * Publish a video post to Instagram
   */
  async publishVideo(post: InstagramPost): Promise<{ id: string }> {
    if (post.mediaType === 'REELS') {
      return await this.publishReelWithResumableUpload(post);
    }

    // Step 1: Create video container
    const containerId = await this.createMediaContainer({
      video_url: post.videoUrl!,
      caption: post.caption,
      media_type: 'VIDEO',
    });
    await this.waitForContainerReady(containerId);

    // Step 2: Publish the container
    return await this.publishContainer(containerId);
  }

  async resumeContainerPublish(containerId: string): Promise<{ id: string }> {
    await this.waitForContainerReady(containerId, {
      maxAttempts: 6,
      intervalMs: 5000,
    });
    return await this.publishContainer(containerId);
  }

  async publishCarousel(post: InstagramPost): Promise<{ id: string }> {
    if (!post.mediaUrls || post.mediaUrls.length < 2) {
      throw new Error('Instagram carousel publishing requires at least two media URLs');
    }

    const children = await Promise.all(
      post.mediaUrls.slice(0, 10).map(async (mediaUrl) => {
        const isVideo = mediaUrlLooksLikeVideo(mediaUrl);
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
      collaborators: post.options?.collaborators,
      location_id: post.options?.locationId,
      product_tags: post.options?.productTags,
    });
    await this.waitForContainerReady(containerId);

    return await this.publishContainer(containerId);
  }

  async publishStory(post: InstagramPost): Promise<{ id: string }> {
    const sourceUrl = post.videoUrl || post.imageUrl || post.mediaUrls?.[0];
    if (!sourceUrl) {
      throw new Error('Instagram Story publishing requires one image or video');
    }

    const isVideo = post.videoUrl || mediaUrlLooksLikeVideo(sourceUrl);

    if (isVideo) {
      const container = await this.createResumableContainer({
        media_type: 'STORIES',
        user_tags: post.options?.userTags,
      });
      await this.uploadVideoToContainer(container.uri, sourceUrl);
      await this.waitForContainerReady(container.id);
      return await this.publishContainer(container.id);
    }

    const containerId = await this.createMediaContainer({
      image_url: sourceUrl,
      media_type: 'STORIES',
      caption: '',
      user_tags: post.options?.userTags,
    });

    return await this.publishContainer(containerId);
  }

  async publishReelWithResumableUpload(post: InstagramPost): Promise<{ id: string }> {
    if (!post.videoUrl) {
      throw new Error('Instagram Reel publishing requires a video');
    }

    const container = await this.createResumableContainer({
      media_type: 'REELS',
      caption: post.caption,
      share_to_feed: post.options?.shareToFeed,
      collaborators: post.options?.collaborators,
      cover_url: post.options?.coverUrl,
      audio_name: post.options?.audioName,
      user_tags: post.options?.userTags,
      location_id: post.options?.locationId,
      thumb_offset: post.options?.thumbOffset,
      trial_params: post.options?.trialParams,
    });

    await this.uploadVideoToContainer(container.uri, post.videoUrl);
    await this.waitForContainerReady(container.id);
    return await this.publishContainer(container.id);
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
    alt_text?: string;
    share_to_feed?: boolean;
    collaborators?: string[];
    cover_url?: string;
    audio_name?: string;
    user_tags?: unknown[];
    location_id?: string;
    product_tags?: unknown[];
    thumb_offset?: number;
    trial_params?: unknown;
  }): Promise<string> {
    const url = `${this.baseUrl}/${this.instagramAccountId}/media`;

    const body: any = {
      access_token: this.accessToken,
    };

    if (params.caption && params.media_type !== 'STORIES') {
      body.caption = params.caption;
    }

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

    this.applyOptionalContainerParams(body, params);

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

  private async createResumableContainer(params: {
    media_type: 'REELS' | 'STORIES' | 'VIDEO';
    caption?: string;
    is_carousel_item?: boolean;
    share_to_feed?: boolean;
    collaborators?: string[];
    cover_url?: string;
    audio_name?: string;
    user_tags?: unknown[];
    location_id?: string;
    thumb_offset?: number;
    trial_params?: unknown;
  }): Promise<{ id: string; uri: string }> {
    const url = `${this.baseUrl}/${this.instagramAccountId}/media`;
    const body: Record<string, unknown> = {
      media_type: params.media_type,
      upload_type: 'resumable',
      access_token: this.accessToken,
    };

    if (params.caption) body.caption = params.caption;
    if (params.is_carousel_item) body.is_carousel_item = true;
    this.applyOptionalContainerParams(body, params);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error?.message || 'Failed to create Instagram resumable container');
    }

    const data = await response.json();
    if (!data.id || !data.uri) {
      throw new Error('Instagram did not return a resumable upload URI');
    }

    return { id: data.id, uri: data.uri };
  }

  private applyOptionalContainerParams(
    body: Record<string, unknown>,
    params: {
      alt_text?: string;
      share_to_feed?: boolean;
      collaborators?: string[];
      cover_url?: string;
      audio_name?: string;
      user_tags?: unknown[];
      location_id?: string;
      product_tags?: unknown[];
      thumb_offset?: number;
      trial_params?: unknown;
    }
  ) {
    if (params.alt_text) body.alt_text = params.alt_text;
    if (typeof params.share_to_feed === 'boolean') body.share_to_feed = params.share_to_feed;
    if (params.collaborators?.length) body.collaborators = params.collaborators.join(',');
    if (params.cover_url) body.cover_url = params.cover_url;
    if (params.audio_name) body.audio_name = params.audio_name;
    if (params.user_tags?.length) body.user_tags = JSON.stringify(params.user_tags);
    if (params.location_id) body.location_id = params.location_id;
    if (params.product_tags?.length) body.product_tags = JSON.stringify(params.product_tags);
    if (typeof params.thumb_offset === 'number') body.thumb_offset = params.thumb_offset;
    if (params.trial_params) body.trial_params = JSON.stringify(params.trial_params);
  }

  private async uploadVideoToContainer(uploadUri: string, videoUrl: string): Promise<void> {
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video asset for Instagram upload');
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const uploadResponse = await fetch(uploadUri, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${this.accessToken}`,
        offset: '0',
        file_size: String(videoBuffer.byteLength),
        'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
      },
      body: videoBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => null);
      throw new Error(
        error?.error?.message || error?.debug_info?.message || 'Failed to upload video to Instagram'
      );
    }
  }

  private async waitForContainerReady(
    containerId: string,
    options: { maxAttempts?: number; intervalMs?: number } = {}
  ): Promise<void> {
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: this.accessToken,
    });
    const maxAttempts = options.maxAttempts ?? 12;
    const intervalMs = options.intervalMs ?? 2000;
    let lastStatus: string | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/${containerId}?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.error?.message || 'Failed to check Instagram media container status'
        );
      }

      const data = await response.json();
      const status = data.status_code;
      lastStatus = status || null;

      if (!status || status === 'FINISHED') {
        return;
      }

      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`Instagram media container is not publishable: ${status}`);
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new InstagramContainerProcessingError(
      'Instagram media container was not ready before the publish timeout',
      containerId,
      lastStatus
    );
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
      fields:
        'username,name,profile_picture_url,followers_count,follows_count,media_count,biography',
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
      fields:
        'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
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
  const supabase = createAdminClient();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('account_id, access_token, is_active, metadata')
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
  let metadata: Record<string, any> = {};
  if (typeof account.metadata === 'string') {
    try {
      metadata = JSON.parse(account.metadata || '{}') || {};
    } catch {
      metadata = {};
    }
  } else if (account.metadata && typeof account.metadata === 'object') {
    metadata = account.metadata as Record<string, any>;
  }

  return new InstagramClient({
    accessToken,
    instagramAccountId: account.account_id,
    baseUrl: getInstagramGraphBaseUrl(metadata.connected_via),
  });
}
