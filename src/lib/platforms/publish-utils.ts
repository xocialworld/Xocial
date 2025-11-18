import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublishResult, Platform, PlatformContent } from './publisher';

const PLATFORM_NAMES: Platform[] = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

interface RecordArtifactsOptions {
  supabase: SupabaseClient;
  postId: string;
  publishResults: PublishResult[];
  publishedAt?: string;
}

export async function recordPlatformPosts({
  supabase,
  postId,
  publishResults,
  publishedAt = new Date().toISOString(),
}: RecordArtifactsOptions) {
  const rows = publishResults
    .filter((result) => result.success && result.platformPostId)
    .map((result) => ({
      post_id: postId,
      platform: result.platform,
      social_account_id: result.accountId ?? null,
      platform_post_id: result.platformPostId!,
      permalink: result.permalink ?? null,
      published_at: publishedAt,
      status: 'published',
      metadata: {},
    }));

  if (!rows.length) return;

  await supabase.from('platform_posts').insert(rows);
}

export async function createInitialAnalytics({
  supabase,
  postId,
  publishResults,
}: RecordArtifactsOptions) {
  const rows = publishResults
    .filter((result) => result.success && result.platformPostId)
    .map((result) => ({
      post_id: postId,
      platform: result.platform,
      external_post_id: result.platformPostId!,
      impressions: 0,
      reach: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      video_views: 0,
      engagement_rate: 0,
    }));

  if (!rows.length) return;

  await supabase.from('post_analytics').insert(rows);
}

export function extractExternalIds(publishResults: PublishResult[]) {
  const externalIds: Record<Platform, string> = {} as Record<Platform, string>;
  publishResults.forEach((result) => {
    if (result.success && result.platformPostId) {
      externalIds[result.platform] = result.platformPostId;
    }
  });
  return externalIds;
}

function parseMetadataObject(metadata: unknown): Record<string, any> | null {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object') {
    return metadata as Record<string, any>;
  }

  return null;
}

export function parseAccountIdsFromMetadata(
  metadata: unknown
): Partial<Record<Platform, string>> {
  const resolved = parseMetadataObject(metadata);
  if (!resolved || typeof resolved.accountIds !== 'object' || resolved.accountIds === null) {
    return {};
  }

  const normalized: Partial<Record<Platform, string>> = {};

  Object.entries(resolved.accountIds).forEach(([platform, accountId]) => {
    if (
      typeof accountId === 'string' &&
      accountId.trim().length > 0 &&
      PLATFORM_NAMES.includes(platform as Platform)
    ) {
      normalized[platform as Platform] = accountId;
    }
  });

  return normalized;
}

export function buildPlatformContentPayload(
  rawContent: any,
  platforms: Platform[],
  defaultMediaUrls: string[] = []
): { fallback: PlatformContent; perPlatform: Partial<Record<Platform, PlatformContent>> } {
  const content = (typeof rawContent === 'object' && rawContent !== null ? rawContent : {}) as Record<
    string,
    PlatformContent
  >;

  const defaultEntry = content.default || {};

  const fallbackText =
    defaultEntry.text ||
    platforms
      .map((platform) => content[platform]?.text)
      .find((text): text is string => typeof text === 'string' && text.length > 0) ||
    '';

  const fallbackMedia =
    defaultEntry.mediaUrls ||
    platforms
      .map((platform) => content[platform]?.mediaUrls)
      .find((urls): urls is string[] => Array.isArray(urls) && urls.length > 0) ||
    defaultMediaUrls;

  const fallbackLink =
    defaultEntry.link ||
    platforms
      .map((platform) => content[platform]?.link)
      .find((link): link is string => typeof link === 'string' && link.length > 0);

  const fallback: PlatformContent = {
    text: fallbackText,
    mediaUrls: fallbackMedia,
    link: fallbackLink,
  };

  const perPlatform = platforms.reduce((acc, platform) => {
    const entry = content[platform] || {};
    acc[platform] = {
      text: entry.text || fallback.text,
      mediaUrls: entry.mediaUrls || fallback.mediaUrls,
      link: entry.link || fallback.link,
    };
    return acc;
  }, {} as Partial<Record<Platform, PlatformContent>>);

  return { fallback, perPlatform };
}

