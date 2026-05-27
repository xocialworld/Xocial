/**
 * Unified Platform Publisher
 * Orchestrates publishing to multiple social media platforms
 */

import { createFacebookClient } from './facebook';
import { createInstagramClient, InstagramContainerProcessingError } from './instagram';
import { createTwitterClient, refreshTwitterToken } from '@/lib/platforms/twitter';
import { createLinkedInClient } from './linkedin';
import { publishToYouTube } from './youtube';
import { createTikTokClient } from './tiktok';
import { refreshMetaToken } from '@/lib/oauth/token-refresh';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';
import { refreshLinkedInToken } from '@/lib/oauth/linkedin';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { mediaUrlLooksLikeVideo } from './publish-utils';
import { assertDemoPublishAllowed } from '@/lib/demo-guards';
import type { InstagramPostType, InstagramPublishOptions } from '@/lib/instagram-publishing';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';

export type PlatformContent = {
  text: string;
  mediaUrls?: string[];
  assetIds?: string[];
  link?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM' | 'STORIES';
  postType?: InstagramPostType;
  instagramOptions?: InstagramPublishOptions;
};

export interface PublishRequest {
  platforms: Platform[];
  content: PlatformContent;
  platformContent?: Partial<Record<Platform, PlatformContent>>;
  platformStates?: Partial<Record<Platform, Record<string, any>>>;
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
  retryable?: boolean;
  errorCode?: string;
  providerState?: Record<string, unknown>;
}

export class PlatformPublisher {
  /**
   * Publish content to multiple platforms
   */
  async publishToAll(request: PublishRequest): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    const demoMode = process.env.DEMO_PUBLISH === 'true';
    if (demoMode) {
      assertDemoPublishAllowed();
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

        const platformSpecific = request.platformContent?.[platform] ?? request.content;

        const contentPayload: PlatformContent = {
          text: platformSpecific.text ?? request.content.text,
          mediaUrls: platformSpecific.mediaUrls ?? request.content.mediaUrls,
          assetIds: platformSpecific.assetIds ?? request.content.assetIds,
          link: platformSpecific.link ?? request.content.link,
          mediaType: platformSpecific.mediaType ?? request.content.mediaType,
          postType: platformSpecific.postType ?? request.content.postType,
          instagramOptions: platformSpecific.instagramOptions ?? request.content.instagramOptions,
        };

        const result = await this.publishToPlatformWithRetry(
          platform,
          accountId,
          contentPayload,
          request.scheduledFor,
          request.platformStates?.[platform]
        );

        results.push({
          platform,
          accountId,
          success: true,
          platformPostId: result.id,
          permalink: result.permalink,
        });
      } catch (error: any) {
        const platformSpecific = request.platformContent?.[platform] ?? request.content;
        const contentPayload: PlatformContent = {
          text: platformSpecific.text ?? request.content.text,
          mediaUrls: platformSpecific.mediaUrls ?? request.content.mediaUrls,
          assetIds: platformSpecific.assetIds ?? request.content.assetIds,
          link: platformSpecific.link ?? request.content.link,
          mediaType: platformSpecific.mediaType ?? request.content.mediaType,
          postType: platformSpecific.postType ?? request.content.postType,
          instagramOptions: platformSpecific.instagramOptions ?? request.content.instagramOptions,
        };

        results.push({
          platform,
          accountId: request.accountIds[platform],
          success: false,
          error: error.message || 'Unknown error',
          retryable: this.isRetryablePublishError(error),
          errorCode: error.code,
          providerState: this.getProviderStateFromError(error, contentPayload),
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
    scheduledFor?: Date,
    platformState?: Record<string, any>
  ): Promise<{ id: string; permalink?: string }> {
    try {
      return await this._executePublish(platform, accountId, content, scheduledFor, platformState);
    } catch (error: any) {
      // Attempt token refresh on auth errors
      if (this.shouldRefreshToken(error)) {
        logger.info(`[Publisher] Attempting token refresh for ${platform} account ${accountId}`, {
          error: error.message,
        });
        const refreshed = await this.refreshAccountToken(platform, accountId);

        if (refreshed) {
          logger.info(`[Publisher] Token refreshed, retrying publish...`);
          // Retry once
          return await this._executePublish(
            platform,
            accountId,
            content,
            scheduledFor,
            platformState
          );
        }
      }
      throw error;
    }
  }

  private async publishToPlatformWithRetry(
    platform: Platform,
    accountId: string,
    content: PlatformContent,
    scheduledFor?: Date,
    platformState?: Record<string, any>
  ): Promise<{ id: string; permalink?: string }> {
    let lastError: any;

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        return await this.publishToPlatform(
          platform,
          accountId,
          content,
          scheduledFor,
          platformState
        );
      } catch (error: any) {
        lastError = error;

        if (this.isDeferredProcessingError(error) || attempt === 3) {
          break;
        }

        const delay = Math.min(750 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async _executePublish(
    platform: Platform,
    accountId: string,
    content: PlatformContent,
    scheduledFor?: Date,
    platformState?: Record<string, any>
  ): Promise<{ id: string; permalink?: string }> {
    switch (platform) {
      case 'facebook':
        return await this.publishToFacebook(accountId, content, scheduledFor);

      case 'instagram':
        return await this.publishToInstagram(accountId, content, platformState);

      case 'twitter':
        return await this.publishToTwitter(accountId, content);

      case 'linkedin':
        return await this.publishToLinkedIn(accountId, content, platformState);

      case 'youtube':
        return await this.publishToYouTube(accountId, content, scheduledFor);

      case 'tiktok':
        return await this.publishToTikTok(accountId, content);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private isDeferredProcessingError(error: any): boolean {
    return error instanceof InstagramContainerProcessingError;
  }

  private isRetryablePublishError(error: any): boolean {
    if (this.isDeferredProcessingError(error)) return true;
    if (error?.retryable === true) return true;

    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('container was not ready') ||
      message.includes('in_progress') ||
      message.includes('media id is not available') ||
      message.includes('temporarily unavailable') ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }

  private getProviderStateFromError(
    error: any,
    content: PlatformContent
  ): Record<string, unknown> | undefined {
    if (error instanceof InstagramContainerProcessingError) {
      return {
        containerId: error.containerId,
        statusCode: error.statusCode || 'IN_PROGRESS',
        mediaUrl: content.mediaUrls?.[0],
        mediaType: content.mediaType,
        createdAt: new Date().toISOString(),
      };
    }

    return undefined;
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

      if (platform === 'twitter') {
        const supabase = createAdminClient();
        const { data: account } = await supabase
          .from('social_accounts')
          .select('refresh_token')
          .eq('id', accountId)
          .single();

        if (!account?.refresh_token) return false;

        const tokenResponse = await refreshTwitterToken(
          {
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            redirectUri: '',
          },
          decryptToken(account.refresh_token)
        );

        await supabase
          .from('social_accounts')
          .update({
            access_token: encryptToken(tokenResponse.access_token),
            refresh_token: tokenResponse.refresh_token
              ? encryptToken(tokenResponse.refresh_token)
              : account.refresh_token,
            token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);

        return true;
      }

      if (platform === 'linkedin') {
        const supabase = createAdminClient();
        const { data: account } = await supabase
          .from('social_accounts')
          .select('refresh_token')
          .eq('id', accountId)
          .single();

        if (!account?.refresh_token) return false;

        const tokenResponse = await refreshLinkedInToken(
          {
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            redirectUri: '',
          },
          decryptToken(account.refresh_token)
        );

        await supabase
          .from('social_accounts')
          .update({
            access_token: encryptToken(tokenResponse.access_token),
            refresh_token: tokenResponse.refresh_token
              ? encryptToken(tokenResponse.refresh_token)
              : account.refresh_token,
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
      const hasVideo = content.mediaUrls.some((url: string) => mediaUrlLooksLikeVideo(url));

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
    content: any,
    platformState?: Record<string, any>
  ): Promise<{ id: string }> {
    const client = await createInstagramClient(accountId);

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one image or video');
    }

    const postType: InstagramPostType =
      content.postType ||
      (content.mediaType === 'REELS'
        ? 'reel'
        : content.mediaType === 'STORIES'
          ? 'story'
          : content.mediaUrls.length > 1
            ? 'carousel'
            : 'feed');
    const options = content.instagramOptions || {};

    if (postType === 'story') {
      const sourceUrl = content.mediaUrls[0];
      const isVideo =
        content.mediaType === 'VIDEO' ||
        content.mediaType === 'REELS' ||
        mediaUrlLooksLikeVideo(sourceUrl);

      return await client.publishStory({
        caption: '',
        mediaUrls: [sourceUrl],
        imageUrl: isVideo ? undefined : sourceUrl,
        videoUrl: isVideo ? sourceUrl : undefined,
        mediaType: 'STORIES',
        options,
      });
    }

    if (postType === 'carousel' || content.mediaUrls.length > 1) {
      return await client.publishCarousel({
        caption: content.text,
        mediaUrls: content.mediaUrls,
        mediaType: 'CAROUSEL_ALBUM',
        options,
      });
    }

    const isVideo =
      content.mediaType === 'VIDEO' ||
      content.mediaType === 'REELS' ||
      postType === 'reel' ||
      mediaUrlLooksLikeVideo(content.mediaUrls[0]);

    if (isVideo) {
      if (
        platformState?.containerId &&
        (!platformState.accountId || platformState.accountId === accountId) &&
        (!platformState.mediaUrl || platformState.mediaUrl === content.mediaUrls[0])
      ) {
        return await client.resumeContainerPublish(String(platformState.containerId));
      }

      return await client.publishVideo({
        caption: content.text,
        videoUrl: content.mediaUrls[0],
        mediaType: 'REELS',
        options,
      });
    } else {
      return await client.publishImage({
        caption: content.text,
        imageUrl: content.mediaUrls[0],
        mediaType: 'IMAGE',
        options,
      });
    }
  }

  private async publishToTwitter(
    accountId: string,
    content: any
  ): Promise<{ id: string; permalink?: string }> {
    const client = await createTwitterClient(accountId);

    let mediaIds: string[] = [];

    if (content.mediaUrls && content.mediaUrls.length > 0) {
      const mediaUrls = content.mediaUrls as string[];
      const hasVideo = mediaUrls.some((url: string) => mediaUrlLooksLikeVideo(url));

      if (hasVideo && mediaUrls.length > 1) {
        throw new Error(
          'X supports either one video/GIF or up to four images per post, not mixed media.'
        );
      }

      if (!hasVideo && mediaUrls.length > 4) {
        throw new Error('X supports up to four images per post.');
      }

      try {
        const uploadPromises = mediaUrls.map(async (url: string) => {
          const isVideo = mediaUrlLooksLikeVideo(url);
          return client.uploadMedia(url, isVideo ? 'video' : 'image');
        });

        mediaIds = await Promise.all(uploadPromises);
        logger.info('[Twitter] Media upload successful', { mediaIds });
      } catch (mediaError: any) {
        logger.warn('[Twitter] Media upload failed', {
          error: mediaError.message,
        });
        throw mediaError;
      }
    }

    try {
      const result = await client.publishTweet({
        text: content.text,
        media_ids: mediaIds.length > 0 ? mediaIds : undefined,
      });

      logger.info('[Twitter] Tweet published successfully', { tweetId: result.data.id });
      return { id: result.data.id, permalink: `https://x.com/i/web/status/${result.data.id}` };
    } catch (tweetError: any) {
      logger.error('[Twitter] Failed to publish tweet', tweetError);
      throw tweetError;
    }
  }

  private async publishToLinkedIn(
    accountId: string,
    content: any,
    platformState?: Record<string, any>
  ): Promise<{ id: string; permalink?: string }> {
    const client = await createLinkedInClient(accountId);
    const visibility =
      platformState?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';

    const result = await client.createPost({
      text: content.text,
      mediaUrls: content.mediaUrls,
      mediaType: content.mediaType,
      visibility,
      article: content.link
        ? {
            source: content.link,
            title: content.text.substring(0, 100),
          }
        : undefined,
    });

    return { id: result.id, permalink: `https://www.linkedin.com/feed/update/${result.id}` };
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

  private async publishToTikTok(accountId: string, content: any): Promise<{ id: string }> {
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
    return matches ? matches.map((tag) => tag.substring(1)) : [];
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
