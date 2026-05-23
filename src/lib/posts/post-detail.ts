import type { Platform, Post } from '@/types';
import {
  extractTextFromContent,
  getPostText,
  getPostTitle,
  type PostContentShape,
} from './post-content';

const PLATFORM_KEYS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];

export type PostDetailVariant = {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  social_account: {
    id: string;
    platform_username: string | null;
    avatar_url: string | null;
  } | null;
};

function metadataRecord(post: Post): Record<string, any> {
  const metadata = post.metadata as unknown;

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, any>)
    : {};
}

function contentRecord(post: Post): Record<string, any> {
  return post.content && typeof post.content === 'object' && !Array.isArray(post.content)
    ? (post.content as Record<string, any>)
    : {};
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getPostDetailPlatforms(post: Post): string[] {
  const explicitPlatforms = Array.isArray(post.platforms) ? post.platforms : [];

  if (explicitPlatforms.length > 0) {
    return unique(explicitPlatforms);
  }

  const content = contentRecord(post);
  const inferredPlatforms = PLATFORM_KEYS.filter((platform) => content[platform]);

  if (inferredPlatforms.length > 0) {
    return inferredPlatforms;
  }

  return getPostText(post) ? ['generic'] : [];
}

function getContentForPlatform(post: Post, platform: string) {
  const content = contentRecord(post);
  const platformContent = content[platform];

  if (platformContent && typeof platformContent === 'object') {
    return platformContent;
  }

  if (content.default && typeof content.default === 'object') {
    return content.default;
  }

  return {};
}

function accountIdForPlatform(post: Post, platform: string, platformCount: number) {
  const metadata = metadataRecord(post);
  const accountIds = metadata.accountIds;

  if (accountIds && typeof accountIds === 'object' && typeof accountIds[platform] === 'string') {
    return accountIds[platform] as string;
  }

  if (platformCount === 1 && typeof post.social_account_id === 'string') {
    return post.social_account_id;
  }

  return null;
}

export function buildPostDetailVariants(post: Post): PostDetailVariant[] {
  const platforms = getPostDetailPlatforms(post);

  return platforms.map((platform) => {
    const platformContent = getContentForPlatform(post, platform);
    const accountId = accountIdForPlatform(post, platform, platforms.length);
    const caption = extractTextFromContent(post.content as PostContentShape, [platform]);

    return {
      id: `${post.id}:${platform}`,
      platform,
      caption,
      hashtags: Array.isArray(platformContent.hashtags) ? platformContent.hashtags : [],
      mentions: Array.isArray(platformContent.mentions) ? platformContent.mentions : [],
      status: post.status,
      scheduled_at: post.scheduled_at ?? null,
      published_at: post.published_at ?? null,
      social_account: accountId
        ? {
            id: accountId,
            platform_username: null,
            avatar_url: null,
          }
        : null,
    };
  });
}

export function getPostDetailTitle(post: Post | null | undefined) {
  if (!post) return 'Untitled Post';

  const metadata = metadataRecord(post);

  if (typeof metadata.title === 'string' && metadata.title.trim()) {
    return metadata.title.trim();
  }

  return getPostTitle(post);
}

export function getPostDetailDescription(post: Post | null | undefined) {
  if (!post) return 'No description';

  const metadata = metadataRecord(post);

  if (typeof metadata.brief === 'string' && metadata.brief.trim()) {
    return metadata.brief.trim();
  }

  const text = getPostText(post);
  return text ? text.slice(0, 160) : 'No description';
}

export function getPostFromDetailResponse(payload: any): Post | null {
  return payload?.data?.post || payload?.data || payload?.post || null;
}
