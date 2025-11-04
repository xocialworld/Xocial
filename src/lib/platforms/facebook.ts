/**
 * Facebook Graph API Integration
 * Handles Facebook Pages posting, media upload, and engagement metrics
 */

import { createClient } from '@/lib/supabase/server';

export interface FacebookConfig {
  accessToken: string;
  pageId: string;
}

export interface FacebookPost {
  message: string;
  link?: string;
  published?: boolean;
  scheduled_publish_time?: number;
}

export interface FacebookMediaPost {
  message: string;
  url?: string; // For photo
  source?: string; // For video
  published?: boolean;
  scheduled_publish_time?: number;
}

export class FacebookClient {
  private baseUrl = 'https://graph.facebook.com/v24.0';
  private accessToken: string;
  private pageId: string;

  constructor(config: FacebookConfig) {
    this.accessToken = config.accessToken;
    this.pageId = config.pageId;
  }

  /**
   * Make API request with automatic retry on rate limits and network errors
   * Implements exponential backoff for rate limiting (429) and network failures
   */
  private async makeRequest(
    url: string,
    options: RequestInit,
    retries = 3
  ): Promise<any> {
    try {
      const response = await fetch(url, options);
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        if (retries > 0) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          console.log(`[Facebook API] Rate limited, retrying after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.makeRequest(url, options, retries - 1);
        }
        throw new Error('Rate limit exceeded after retries');
      }
      
      // Handle other errors
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API request failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      // Retry on network errors
      if (retries > 0 && (error.message.includes('fetch failed') || error.message.includes('ECONNRESET'))) {
        console.log(`[Facebook API] Network error, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest(url, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Publish a text post to Facebook Page
   */
  async publishPost(post: FacebookPost): Promise<{ id: string; post_id?: string }> {
    const url = `${this.baseUrl}/${this.pageId}/feed`;
    
    const body: any = {
      message: post.message,
      access_token: this.accessToken,
    };

    if (post.link) {
      body.link = post.link;
    }

    if (post.scheduled_publish_time) {
      body.published = false;
      body.scheduled_publish_time = post.scheduled_publish_time;
    } else {
      body.published = post.published !== false;
    }

    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Publish a photo to Facebook Page
   */
  async publishPhoto(photo: FacebookMediaPost): Promise<{ id: string; post_id?: string }> {
    const url = `${this.baseUrl}/${this.pageId}/photos`;

    const body: any = {
      message: photo.message,
      url: photo.url,
      access_token: this.accessToken,
    };

    if (photo.scheduled_publish_time) {
      body.published = false;
      body.scheduled_publish_time = photo.scheduled_publish_time;
    } else {
      body.published = photo.published !== false;
    }

    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Publish a video to Facebook Page
   */
  async publishVideo(video: FacebookMediaPost): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${this.pageId}/videos`;

    const body: any = {
      description: video.message,
      file_url: video.source,
      access_token: this.accessToken,
    };

    if (video.scheduled_publish_time) {
      body.published = false;
      body.scheduled_publish_time = video.scheduled_publish_time;
    } else {
      body.published = video.published !== false;
    }

    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get page insights (engagement metrics)
   */
  async getPageInsights(metric: string, period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const url = `${this.baseUrl}/${this.pageId}/insights`;
    const params = new URLSearchParams({
      metric,
      period,
      access_token: this.accessToken,
    });

    return this.makeRequest(`${url}?${params}`, { method: 'GET' });
  }

  /**
   * Get post engagement metrics
   */
  async getPostMetrics(postId: string): Promise<any> {
    const url = `${this.baseUrl}/${postId}`;
    const params = new URLSearchParams({
      fields: 'reactions.summary(true),comments.summary(true),shares,likes.summary(true)',
      access_token: this.accessToken,
    });

    const data = await this.makeRequest(`${url}?${params}`, { method: 'GET' });

    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      reactions: data.reactions?.summary?.total_count || 0,
    };
  }

  /**
   * Get post insights with views metric (v24.0)
   * Fetches impressions, unique impressions (views), engagement, and clicks
   */
  async getPostInsights(postId: string): Promise<any> {
    const metrics = [
      'post_impressions',  // Keep for backward compatibility
      'post_impressions_unique',  // This is the "views" equivalent in v24.0
      'post_engaged_users',
      'post_clicks',
    ];

    const url = `${this.baseUrl}/${postId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(','),
      access_token: this.accessToken,
    });

    const data = await this.makeRequest(`${url}?${params}`, { method: 'GET' });
    const insights: any = {};

    data.data?.forEach((metric: any) => {
      if (metric.name === 'post_impressions_unique') {
        insights.views = metric.values?.[0]?.value || 0;
      } else if (metric.name === 'post_impressions') {
        insights.impressions = metric.values?.[0]?.value || 0;
      } else if (metric.name === 'post_engaged_users') {
        insights.engagement = metric.values?.[0]?.value || 0;
      } else if (metric.name === 'post_clicks') {
        insights.clicks = metric.values?.[0]?.value || 0;
      }
    });

    return insights;
  }

  /**
   * Get page information
   */
  async getPageInfo(): Promise<any> {
    const url = `${this.baseUrl}/${this.pageId}`;
    const params = new URLSearchParams({
      fields: 'name,username,followers_count,fan_count,picture,about',
      access_token: this.accessToken,
    });

    return this.makeRequest(`${url}?${params}`, { method: 'GET' });
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${postId}`;
    const params = new URLSearchParams({
      access_token: this.accessToken,
    });

    return this.makeRequest(`${url}?${params}`, { method: 'DELETE' });
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/me`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
      });

      await this.makeRequest(`${url}?${params}`, { method: 'GET' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload a single photo without publishing (for albums/carousels)
   * @private
   */
  private async uploadUnpublishedPhoto(url: string): Promise<string> {
    const uploadUrl = `${this.baseUrl}/${this.pageId}/photos`;
    
    const response = await this.makeRequest(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        published: false,
        access_token: this.accessToken,
      }),
    });
    
    return response.id;
  }

  /**
   * Publish multiple photos as carousel/album (2-10 photos)
   * This is a v24.0 feature for creating multi-image posts
   */
  async publishPhotoAlbum(album: {
    message: string;
    urls: string[];  // 2-10 photos
    scheduled_publish_time?: number;
  }): Promise<{ id: string; post_id?: string }> {
    if (album.urls.length < 2 || album.urls.length > 10) {
      throw new Error('Album must contain 2-10 photos');
    }
    
    // Step 1: Upload all photos as unpublished
    const photoIds = await Promise.all(
      album.urls.map(url => this.uploadUnpublishedPhoto(url))
    );
    
    // Step 2: Create post with attached photos
    const url = `${this.baseUrl}/${this.pageId}/feed`;
    
    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: album.message,
        attached_media: photoIds.map(id => ({ media_fbid: id })),
        access_token: this.accessToken,
        scheduled_publish_time: album.scheduled_publish_time,
        published: !album.scheduled_publish_time,
      }),
    });
  }

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    limit: number = 50
  ): Promise<any[]> {
    const url = `${this.baseUrl}/${postId}/comments`;
    const params = new URLSearchParams({
      fields: 'id,message,from,created_time,like_count,comment_count',
      limit: limit.toString(),
      access_token: this.accessToken,
    });
    
    const response = await this.makeRequest(`${url}?${params}`, { method: 'GET' });
    return response.data || [];
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    commentId: string,
    message: string
  ): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${commentId}/comments`;
    
    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: this.accessToken,
      }),
    });
  }

  /**
   * Hide a comment (moderation)
   */
  async hideComment(commentId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${commentId}`;
    
    return this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_hidden: true,
        access_token: this.accessToken,
      }),
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${commentId}`;
    
    return this.makeRequest(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.accessToken,
      }),
    });
  }

  /**
   * Get page demographics (age, gender, location)
   * Provides audience insights for the Facebook page
   */
  async getPageDemographics(): Promise<any> {
    const metrics = [
      'page_fans_gender_age',
      'page_fans_city',
      'page_fans_country',
    ];
    
    const url = `${this.baseUrl}/${this.pageId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(','),
      period: 'lifetime',
      access_token: this.accessToken,
    });
    
    const response = await this.makeRequest(`${url}?${params}`, { method: 'GET' });
    
    const demographics: any = {
      ageGender: {},
      cities: {},
      countries: {},
    };
    
    response.data?.forEach((metric: any) => {
      if (metric.name === 'page_fans_gender_age') {
        demographics.ageGender = metric.values?.[0]?.value || {};
      } else if (metric.name === 'page_fans_city') {
        demographics.cities = metric.values?.[0]?.value || {};
      } else if (metric.name === 'page_fans_country') {
        demographics.countries = metric.values?.[0]?.value || {};
      }
    });
    
    return demographics;
  }

  /**
   * Get post reach breakdown (organic vs paid vs viral)
   * Provides detailed reach analytics for a specific post
   */
  async getPostReachBreakdown(postId: string): Promise<any> {
    const metrics = [
      'post_impressions_organic',
      'post_impressions_paid',
      'post_impressions_viral',
      'post_impressions_unique',
    ];
    
    const url = `${this.baseUrl}/${postId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(','),
      access_token: this.accessToken,
    });
    
    const response = await this.makeRequest(`${url}?${params}`, { method: 'GET' });
    
    const breakdown: any = {
      organic: 0,
      paid: 0,
      viral: 0,
      total: 0,
    };
    
    response.data?.forEach((metric: any) => {
      const value = metric.values?.[0]?.value || 0;
      if (metric.name === 'post_impressions_organic') breakdown.organic = value;
      if (metric.name === 'post_impressions_paid') breakdown.paid = value;
      if (metric.name === 'post_impressions_viral') breakdown.viral = value;
      if (metric.name === 'post_impressions_unique') breakdown.total = value;
    });
    
    return breakdown;
  }

  /**
   * Get video-specific metrics
   * Provides watch time, completion rate, and other video analytics
   */
  async getVideoMetrics(videoId: string): Promise<any> {
    const metrics = [
      'post_video_views',
      'post_video_view_time',
      'post_video_complete_views_30s',
    ];
    
    const url = `${this.baseUrl}/${videoId}/video_insights`;
    const params = new URLSearchParams({
      metric: metrics.join(','),
      access_token: this.accessToken,
    });
    
    const response = await this.makeRequest(`${url}?${params}`, { method: 'GET' });
    
    const videoMetrics: any = {
      views: 0,
      watchTime: 0,
      completions: 0,
    };
    
    response.data?.forEach((metric: any) => {
      const value = metric.values?.[0]?.value || 0;
      if (metric.name === 'post_video_views') videoMetrics.views = value;
      if (metric.name === 'post_video_view_time') videoMetrics.watchTime = value;
      if (metric.name === 'post_video_complete_views_30s') videoMetrics.completions = value;
    });
    
    return videoMetrics;
  }
}

/**
 * Helper function to create Facebook client from database
 */
export async function createFacebookClient(accountId: string): Promise<FacebookClient> {
  const supabase = await createClient();
  
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('platform_user_id, metadata')
    .eq('id', accountId)
    .eq('platform', 'facebook')
    .single();

  if (error || !account) {
    throw new Error('Facebook account not found');
  }

  // Get OAuth token
  const { data: token, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('account_id', accountId)
    .single();

  if (tokenError || !token) {
    throw new Error('Facebook access token not found');
  }

  return new FacebookClient({
    accessToken: token.access_token,
    pageId: account.platform_user_id,
  });
}

