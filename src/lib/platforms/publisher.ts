/**
 * Unified Platform Publisher
 * Orchestrates publishing to multiple social media platforms
 */

import { FacebookClient, createFacebookClient } from './facebook';
import { InstagramClient, createInstagramClient } from './instagram';
import { TwitterClient, createTwitterClient } from '@/lib/platforms/twitter';
import { LinkedInClient, createLinkedInClient } from './linkedin';
import { YouTubeClient, createYouTubeClient, publishToYouTube } from './youtube';
import { TikTokClient, createTikTokClient } from './tiktok';
import { retryWithBackoff, apiCircuitBreaker } from '@/lib/errors';
import { refreshMetaToken } from '@/lib/oauth/token-refresh';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';

export type PlatformContent = {
  text: string;
  mediaUrls?: string[];
  link?: string;
};

export interface PublishRequest {
  platforms: Platform[];
  content: PlatformContent;
  platformContent?: Partial<Record<Platform, PlatformContent>>;
  accountIds: Partial<Record<Platform, string>>; // Map of platform to account ID
  scheduledFor?: Date;
}

export interface PublishResult {
  platform: Platform;
  accountId?: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
  permalink?: string;
}

export class PlatformPublisher {
  /**
   * Publish content to multiple platforms
   */
  async publishToAll(request: PublishRequest): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    const demoMode = process.env.DEMO_PUBLISH === 'true';
    if (demoMode) {
      return request.platforms.map((platform) => ({
        platform,
        accountId: request.accountIds[platform],
        success: true,
        platformPostId: `demo_${platform}_${Date.now()}`,
        permalink: `https://demo.local/${platform}/${Date.now()}`,
      }));
    }

    // Publish to each platform in parallel
    const publishPromises = request.platforms.map(async (platform) => {
      try {
        const accountId = request.accountIds[platform];
        if (!accountId) {
          throw new Error(`No account ID for ${platform}`);
        }

        const platformSpecific =
          request.platformContent?.[platform] ?? request.content;

        const contentPayload: PlatformContent = {
          text: platformSpecific.text ?? request.content.text,
          mediaUrls: platformSpecific.mediaUrls ?? request.content.mediaUrls,
          link: platformSpecific.link ?? request.content.link,
        };

        const result = await retryWithBackoff(
          () =>
            apiCircuitBreaker.execute(() =>
              this.publishToPlatform(
                platform,
                accountId,
                contentPayload,
                request.scheduledFor
              )
            ),
          {
            maxRetries: 3,
            initialDelay: 750,
            maxDelay: 5000,
            backoffMultiplier: 2,
          }
        );
        
        results.push({
          platform,
          accountId,
          success: true,
          platformPostId: result.id,
          permalink: result.permalink,
        });
      } catch (error: any) {
        results.push({
          platform,
          accountId: request.accountIds[platform],
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    });

    await Promise.allSettled(publishPromises);
    return results;
  }

  /**
   * Publish to a single platform
   */
  private async publishToPlatform(
    platform: Platform,
    accountId: string,
    content: PlatformContent,
    scheduledFor?: Date
  ): Promise<{ id: string; permalink?: string }> {
    try {
      return await this._executePublish(platform, accountId, content, scheduledFor);
    } catch (error: any) {
      // Attempt token refresh on auth errors
      if (this.shouldRefreshToken(error)) {
        logger.info(`[Publisher] Attempting token refresh for ${platform} account ${accountId}`, { error: error.message });
        const refreshed = await this.refreshAccountToken(platform, accountId);
        
        if (refreshed) {
           logger.info(`[Publisher] Token refreshed, retrying publish...`);
           // Retry once
           return await this._executePublish(platform, accountId, content, scheduledFor);
        }
      }
      throw error;
    }
  }

  private async _executePublish(
    platform: Platform,
    accountId: string,
    content: PlatformContent,
    scheduledFor?: Date
  ): Promise<{ id: string; permalink?: string }> {
    switch (platform) {
      case 'facebook':
        return await this.publishToFacebook(accountId, content, scheduledFor);
      
      case 'instagram':
        return await this.publishToInstagram(accountId, content);
      
      case 'twitter':
        return await this.publishToTwitter(accountId, content);
      
      case 'linkedin':
        return await this.publishToLinkedIn(accountId, content);
      
      case 'youtube':
        return await this.publishToYouTube(accountId, content, scheduledFor);
      
      case 'tiktok':
        return await this.publishToTikTok(accountId, content);
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private shouldRefreshToken(error: any): boolean {
    const msg = (error.message || '').toLowerCase();
    // Facebook: code 190
    // YouTube: 401 or "token expired"
    // General: "unauthorized", "authentication failed"
    if (error.code === 190) return true;
    if (error.status === 401) return true;
    if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return true;
    if (msg.includes('unauthorized')) return true;
    if (msg.includes('auth')) return true;
    return false;
  }

  private async refreshAccountToken(platform: Platform, accountId: string): Promise<boolean> {
    try {
      if (platform === 'facebook' || platform === 'instagram') {
        const result = await refreshMetaToken(accountId);
        return result.success;
      }
      
      if (platform === 'youtube') {
        const supabase = await createClient();
        const { data: account } = await supabase
          .from('social_accounts')
          .select('refresh_token')
          .eq('id', accountId)
          .single();
          
        if (!account?.refresh_token) return false;
        
        const decryptedRefreshToken = decryptToken(account.refresh_token);
        const config = {
            clientId: process.env.YOUTUBE_CLIENT_ID!,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
            redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
        };
        
        const tokenResponse = await refreshYouTubeToken(config, decryptedRefreshToken);
        
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : account.refresh_token;

        await supabase
            .from('social_accounts')
            .update({
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);
            
        return true;
      }
      
      return false;
    } catch (e) {
      logger.error(`[Publisher] Token refresh failed for ${platform}`, e as Error);
      return false;
    }
  }

  private async publishToFacebook(
    accountId: string,
    content: any,
    scheduledFor?: Date
  ): Promise<{ id: string; permalink?: string }> {
    const client = await createFacebookClient(accountId);

    const hasMedia = content.mediaUrls && content.mediaUrls.length > 0;
    const scheduledTime = scheduledFor ? Math.floor(scheduledFor.getTime() / 1000) : undefined;

    // Handle multiple photos (carousel/album) - NEW in v24.0
    if (hasMedia && content.mediaUrls.length > 1) {
      // Check if any are videos (can't mix in album)
      const hasVideo = content.mediaUrls.some((url: string) => 
        url.includes('.mp4') || url.includes('video')
      );
      
      if (hasVideo) {
        // If there are videos, just post the first one
        const result = await client.publishVideo({
          message: content.text,
          source: content.mediaUrls[0],
          scheduled_publish_time: scheduledTime,
        });
        return { id: result.id };
      } else {
        // All photos - create album
        const result = await client.publishPhotoAlbum({
          message: content.text,
          urls: content.mediaUrls,
          scheduled_publish_time: scheduledTime,
        });
        return { id: result.id, permalink: result.post_id };
      }
    }

    // Existing single media logic remains unchanged
    if (hasMedia) {
      const isVideo = content.mediaUrls[0].includes('.mp4') || content.mediaUrls[0].includes('video');
      
      if (isVideo) {
        const result = await client.publishVideo({
          message: content.text,
          source: content.mediaUrls[0],
          scheduled_publish_time: scheduledTime,
        });
        return { id: result.id };
      } else {
        const result = await client.publishPhoto({
          message: content.text,
          url: content.mediaUrls[0],
          scheduled_publish_time: scheduledTime,
        });
        return { id: result.id, permalink: result.post_id };
      }
    } else {
      const result = await client.publishPost({
        message: content.text,
        link: content.link,
        scheduled_publish_time: scheduledTime,
      });
      return { id: result.id, permalink: result.post_id };
    }
  }

  private async publishToInstagram(
    accountId: string,
    content: any
  ): Promise<{ id: string }> {
    const client = await createInstagramClient(accountId);

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one image or video');
    }

    const isVideo = content.mediaUrls[0].includes('.mp4') || content.mediaUrls[0].includes('video');

    if (isVideo) {
      return await client.publishVideo({
        caption: content.text,
        videoUrl: content.mediaUrls[0],
        mediaType: 'VIDEO',
      });
    } else {
      return await client.publishImage({
        caption: content.text,
        imageUrl: content.mediaUrls[0],
        mediaType: 'IMAGE',
      });
    }
  }

  private async publishToTwitter(
    accountId: string,
    content: any
  ): Promise<{ id: string }> {
    const client = await createTwitterClient(accountId);

    let mediaIds: string[] = [];

    if (content.mediaUrls && content.mediaUrls.length > 0) {
      // Upload media first (max 4 images or 1 video for Twitter)
      const uploadPromises = content.mediaUrls.slice(0, 4).map((url: string) => {
        const isVideo = url.includes('.mp4') || url.includes('video');
        return client.uploadMedia(url, isVideo ? 'video' : 'image');
      });

      mediaIds = await Promise.all(uploadPromises);
    }

    const result = await client.publishTweet({
      text: content.text,
      media_ids: mediaIds.length > 0 ? mediaIds : undefined,
    });

    return { id: result.data.id };
  }

  private async publishToLinkedIn(
    accountId: string,
    content: any
  ): Promise<{ id: string }> {
    const client = await createLinkedInClient(accountId);

    const result = await client.createPost({
      text: content.text,
      mediaUrls: content.mediaUrls,
      visibility: 'PUBLIC',
      article: content.link ? {
        source: content.link,
        title: content.text.substring(0, 100),
      } : undefined,
    });

    return { id: result.id };
  }

  private async publishToYouTube(
    accountId: string,
    content: any,
    scheduledFor?: Date
  ): Promise<{ id: string }> {
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('YouTube requires a video file');
    }

    const result = await publishToYouTube({
      accountId,
      videoUrl: content.mediaUrls[0],
      title: content.text.substring(0, 100) || 'Untitled Video',
      description: content.text || '',
      tags: this.extractHashtags(content.text),
      privacyStatus: scheduledFor ? 'private' : 'public',
      thumbnailUrl: content.mediaUrls[1], // Second media item as thumbnail if available
    });

    return { id: result.id };
  }

  private async publishToTikTok(
    accountId: string,
    content: any
  ): Promise<{ id: string }> {
    const client = await createTikTokClient(accountId);

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('TikTok requires a video file');
    }

    const result = await client.publishVideo({
      videoUrl: content.mediaUrls[0],
      caption: content.text,
      privacyLevel: 'PUBLIC_TO_EVERYONE',
    });

    return { id: result.publish_id };
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Get engagement metrics from all platforms for a post
   */
  async getEngagementMetrics(
    platformPostIds: Record<Platform, string>
  ): Promise<Record<Platform, any>> {
    const metrics: Record<string, any> = {};

    for (const [platform, postId] of Object.entries(platformPostIds)) {
      try {
        const platformMetrics = await this.getPlatformMetrics(platform as Platform, postId);
        metrics[platform] = platformMetrics;
      } catch (error) {
        console.error(`Failed to get metrics for ${platform}:`, error);
        metrics[platform] = { error: 'Failed to fetch metrics' };
      }
    }

    return metrics;
  }

  /**
   * Get metrics from a specific platform
   */
  private async getPlatformMetrics(platform: Platform, postId: string): Promise<any> {
    // This would use the appropriate client for each platform
    // For now, returning a placeholder structure
    return {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    };
  }
}

/**
 * Singleton instance
 */
export const platformPublisher = new PlatformPublisher();
