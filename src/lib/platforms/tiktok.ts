/**
 * TikTok API Integration
 * Handles video posting and engagement metrics for TikTok
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';

export interface TikTokConfig {
  accessToken: string;
  openId: string;
}

export interface TikTokVideo {
  videoUrl: string;
  caption: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
}

export class TikTokClient {
  private baseUrl = 'https://open.tiktokapis.com/v2';
  private accessToken: string;
  private openId: string;

  constructor(config: TikTokConfig) {
    this.accessToken = config.accessToken;
    this.openId = config.openId;
  }

  /**
   * Publish a video to TikTok
   * Note: TikTok requires special video upload flow
   */
  async publishVideo(video: TikTokVideo): Promise<{ publish_id: string }> {
    // Step 1: Initialize video upload
    const initUrl = `${this.baseUrl}/post/publish/video/init/`;

    const initBody = {
      post_info: {
        title: video.caption,
        privacy_level: video.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_comment: video.disableComment || false,
        disable_duet: video.disableDuet || false,
        disable_stitch: video.disableStitch || false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: 0, // Would be calculated from actual file
      },
    };

    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initBody),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.error?.message || 'Failed to initialize TikTok upload');
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;

    if (!uploadUrl || !publishId) {
      throw new Error('Failed to get upload URL from TikTok');
    }

    // Step 2: Upload video file
    const videoResponse = await fetch(video.videoUrl);
    const videoBlob = await videoResponse.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload video to TikTok');
    }

    return { publish_id: publishId };
  }

  /**
   * Get video information and stats
   */
  async getVideoInfo(videoId: string): Promise<any> {
    const url = `${this.baseUrl}/video/query/`;

    const body = {
      filters: {
        video_ids: [videoId],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch TikTok video info');
    }

    const data = await response.json();
    const video = data.data?.videos?.[0];

    if (!video) {
      throw new Error('Video not found');
    }

    return {
      id: video.id,
      title: video.title,
      views: video.view_count || 0,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0,
    };
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<any> {
    const url = `${this.baseUrl}/user/info/`;
    const params = new URLSearchParams({
      fields: 'open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch TikTok user info');
    }

    const data = await response.json();
    return data.data?.user;
  }

  /**
   * List user's videos
   */
  async listVideos(maxCount: number = 20): Promise<any[]> {
    const url = `${this.baseUrl}/video/list/`;

    const body = {
      max_count: maxCount,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to list TikTok videos');
    }

    const data = await response.json();
    return data.data?.videos || [];
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to create TikTok client from database
 */
export async function createTikTokClient(accountId: string): Promise<TikTokClient> {
  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('account_id, access_token, is_active')
    .eq('id', accountId)
    .eq('platform', 'tiktok')
    .single();

  if (error || !account) {
    throw new Error('TikTok account not found');
  }

  if (!account.is_active) {
    throw new Error('TikTok account is inactive');
  }

  // Decrypt token
  const accessToken = decryptToken(account.access_token);

  return new TikTokClient({
    accessToken,
    openId: account.account_id,
  });
}

