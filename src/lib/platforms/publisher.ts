/**
 * Unified Platform Publisher
 * Orchestrates publishing to multiple social media platforms
 */

import { FacebookClient, createFacebookClient } from './facebook';
import { InstagramClient, createInstagramClient } from './instagram';
import { TwitterClient, createTwitterClient } from './twitter';
import { LinkedInClient, createLinkedInClient } from './linkedin';
import { YouTubeClient, createYouTubeClient } from './youtube';
import { TikTokClient, createTikTokClient } from './tiktok';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';

export interface PublishRequest {
  platforms: Platform[];
  content: {
    text: string;
    mediaUrls?: string[];
    link?: string;
  };
  accountIds: Partial<Record<Platform, string>>; // Map of platform to account ID
  scheduledFor?: Date;
}

export interface PublishResult {
  platform: Platform;
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

    // Publish to each platform in parallel
    const publishPromises = request.platforms.map(async (platform) => {
      try {
        const accountId = request.accountIds[platform];
        if (!accountId) {
          throw new Error(`No account ID for ${platform}`);
        }

        const result = await this.publishToPlatform(platform, accountId, request.content, request.scheduledFor);
        
        results.push({
          platform,
          success: true,
          platformPostId: result.id,
          permalink: result.permalink,
        });
      } catch (error: any) {
        results.push({
          platform,
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
    content: { text: string; mediaUrls?: string[]; link?: string },
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
    const client = await createYouTubeClient(accountId);

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('YouTube requires a video file');
    }

    const result = await client.uploadVideo({
      title: content.text.substring(0, 100),
      description: content.text,
      videoUrl: content.mediaUrls[0],
      privacyStatus: scheduledFor ? 'private' : 'public',
      publishAt: scheduledFor?.toISOString(),
      tags: this.extractHashtags(content.text),
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

