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
import { retryWithBackoff } from '@/lib/errors';
import { refreshMetaToken } from '@/lib/oauth/token-refresh';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { mediaUrlLooksLikeVideo } from './publish-utils';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';

export type PlatformContent = {
  text: string;
  mediaUrls?: string[];
  link?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM';
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
          mediaType: platformSpecific.mediaType ?? request.content.mediaType,
        };

        const result = await retryWithBackoff(
          () =>
            this.publishToPlatform(
              platform,
              accountId,
              contentPayload,
              request.scheduledFor
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
        const supabase = createAdminClient();
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
        mediaUrlLooksLikeVideo(url)
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
      const isVideo =
        content.mediaType === 'VIDEO' ||
        content.mediaType === 'REELS' ||
        mediaUrlLooksLikeVideo(content.mediaUrls[0]);

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

    if (content.mediaUrls.length > 1) {
      return await client.publishCarousel({
        caption: content.text,
        mediaUrls: content.mediaUrls,
        mediaType: 'CAROUSEL_ALBUM',
      });
    }

    const isVideo =
      content.mediaType === 'VIDEO' ||
      content.mediaType === 'REELS' ||
      mediaUrlLooksLikeVideo(content.mediaUrls[0]);

    if (isVideo) {
      return await client.publishVideo({
        caption: content.text,
        videoUrl: content.mediaUrls[0],
        mediaType: 'REELS',
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
      // Note: Twitter's media upload v1.1 API requires OAuth 1.0a, not OAuth 2.0
      // We'll try to upload but fall back to text-only if it fails
      try {
        const uploadPromises = content.mediaUrls.slice(0, 4).map(async (url: string) => {
          const isVideo = mediaUrlLooksLikeVideo(url);
          return client.uploadMedia(url, isVideo ? 'video' : 'image');
        });

        mediaIds = await Promise.all(uploadPromises);
        logger.info('[Twitter] Media upload successful', { mediaIds });
      } catch (mediaError: any) {
        // Media upload failed - Twitter's v2 media API is still rolling out
        // Fall back to text-only posting as agreed with user
        logger.warn('[Twitter] Media upload failed, posting text-only as fallback', {
          error: mediaError.message,
          note: 'Twitter v2 media API rollout in progress. User has been warned in UI.'
        });

        // Continue with text-only tweet (user has been warned in UI)
        mediaIds = [];
      }
    }

    try {
      const result = await client.publishTweet({
        text: content.text,
        media_ids: mediaIds.length > 0 ? mediaIds : undefined,
      });

      logger.info('[Twitter] Tweet published successfully', { tweetId: result.data.id });
      return { id: result.data.id };
    } catch (tweetError: any) {
      logger.error('[Twitter] Failed to publish tweet', tweetError);
      throw tweetError;
    }
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
    // YouTube API only supports video uploads
    // - No image-only posts (YouTube doesn't have this feature)
    // - No text-only posts (Community Posts are not supported via API)
    // - Videos can be regular videos or Shorts (< 60 sec, 9:16 aspect ratio)

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error(
        'YouTube requires a video file. Text-only posts and images are not supported via the YouTube API. ' +
        'Please upload a video to post to YouTube.'
      );
    }

    // Check if the media is a video
    const mediaUrl = content.mediaUrls[0];
    const isVideo =
      content.mediaType === 'VIDEO' ||
      content.mediaType === 'REELS' ||
      mediaUrlLooksLikeVideo(mediaUrl);

    if (!isVideo) {
      throw new Error(
        'YouTube only supports video uploads. The uploaded media appears to be an image. ' +
        'Please upload a video file (.mp4, .mov, .webm) to post to YouTube, or deselect YouTube from the target platforms.'
      );
    }

    // Use the text as both title and description for simplicity
    // In a more complete implementation, we'd have separate title/description fields
    const title = content.text?.substring(0, 100)?.trim() || 'Untitled Video';
    const description = content.text || '';

    // Check if this might be a Short (based on description containing #Shorts)
    const isShort = description.toLowerCase().includes('#shorts');

    const result = await publishToYouTube({
      accountId,
      videoUrl: mediaUrl,
      title,
      description,
      tags: this.extractHashtags(content.text),
      categoryId: isShort ? '10' : '22', // 10 for Shorts, 22 for People & Blogs
      privacyStatus: scheduledFor ? 'private' : 'public',
      publishAt: scheduledFor?.toISOString(),
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
