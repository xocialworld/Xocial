/**
 * Twitter API v2 Integration
 * Handles tweet posting, media upload, and engagement metrics
 */

import { createClient } from '@/lib/supabase/server';

export interface TwitterConfig {
  accessToken: string;
  accessTokenSecret: string;
}

export interface Tweet {
  text: string;
  media_ids?: string[];
  poll_options?: string[];
  poll_duration_minutes?: number;
  reply_settings?: 'everyone' | 'mentionedUsers' | 'followers';
}

export class TwitterClient {
  private baseUrl = 'https://api.twitter.com/2';
  private uploadUrl = 'https://upload.twitter.com/1.1';
  private accessToken: string;
  private accessTokenSecret: string;

  constructor(config: TwitterConfig) {
    this.accessToken = config.accessToken;
    this.accessTokenSecret = config.accessTokenSecret;
  }

  /**
   * Post a tweet
   */
  async publishTweet(tweet: Tweet): Promise<{ data: { id: string; text: string } }> {
    const url = `${this.baseUrl}/tweets`;

    const body: any = {
      text: tweet.text,
    };

    if (tweet.media_ids && tweet.media_ids.length > 0) {
      body.media = { media_ids: tweet.media_ids };
    }

    if (tweet.poll_options && tweet.poll_options.length > 0) {
      body.poll = {
        options: tweet.poll_options,
        duration_minutes: tweet.poll_duration_minutes || 1440, // 24 hours default
      };
    }

    if (tweet.reply_settings) {
      body.reply_settings = tweet.reply_settings;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || 'Failed to publish tweet');
    }

    return response.json();
  }

  /**
   * Upload media for tweet (returns media_id)
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video' = 'image'): Promise<string> {
    // Download media from URL
    const mediaResponse = await fetch(mediaUrl);
    const mediaBlob = await mediaResponse.blob();
    const mediaBuffer = await mediaBlob.arrayBuffer();

    // Upload to Twitter
    const url = `${this.uploadUrl}/media/upload.json`;
    
    const formData = new FormData();
    formData.append('media', new Blob([mediaBuffer]));
    formData.append('media_category', mediaType === 'video' ? 'tweet_video' : 'tweet_image');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to upload media to Twitter');
    }

    const data = await response.json();
    return data.media_id_string;
  }

  /**
   * Get tweet metrics
   */
  async getTweetMetrics(tweetId: string): Promise<any> {
    const url = `${this.baseUrl}/tweets/${tweetId}`;
    const params = new URLSearchParams({
      'tweet.fields': 'public_metrics,created_at',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch tweet metrics');
    }

    const data = await response.json();
    const metrics = data.data?.public_metrics || {};

    return {
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      impressions: metrics.impression_count || 0,
    };
  }

  /**
   * Get user information
   */
  async getUserInfo(username?: string): Promise<any> {
    const url = username 
      ? `${this.baseUrl}/users/by/username/${username}`
      : `${this.baseUrl}/users/me`;
    
    const params = new URLSearchParams({
      'user.fields': 'id,name,username,profile_image_url,public_metrics,description,created_at,verified',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch Twitter user info');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<{ deleted: boolean }> {
    const url = `${this.baseUrl}/tweets/${tweetId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete tweet');
    }

    const data = await response.json();
    return data.data;
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
 * Helper function to create Twitter client from database
 */
export async function createTwitterClient(accountId: string): Promise<TwitterClient> {
  const supabase = await createClient();
  
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('platform_user_id')
    .eq('id', accountId)
    .eq('platform', 'twitter')
    .single();

  if (error || !account) {
    throw new Error('Twitter account not found');
  }

  // Get OAuth token
  const { data: token, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('access_token, token_secret')
    .eq('account_id', accountId)
    .single();

  if (tokenError || !token) {
    throw new Error('Twitter access token not found');
  }

  return new TwitterClient({
    accessToken: token.access_token,
    accessTokenSecret: token.token_secret,
  });
}

