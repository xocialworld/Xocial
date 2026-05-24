import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublishResult, Platform, PlatformContent } from './publisher';

const PLATFORM_NAMES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'youtube',
  'tiktok',
];
const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|m4v|webm|avi)(?:[?#]|$)/i;

interface RecordArtifactsOptions {
  supabase: SupabaseClient;
  postId: string;
  publishResults: PublishResult[];
  publishedAt?: string;
  workspaceId?: string;
  jobRunId?: string | null;
  attemptNo?: number;
}

export async function recordPlatformPosts({
  supabase,
  postId,
  publishResults,
  publishedAt = new Date().toISOString(),
  workspaceId,
  jobRunId,
  attemptNo,
}: RecordArtifactsOptions) {
  const rows = publishResults.map((result) => ({
    post_id: postId,
    workspace_id: workspaceId ?? null,
    platform: result.platform,
    social_account_id: result.accountId ?? null,
    external_id: result.platformPostId ?? null,
    platform_post_id: result.platformPostId ?? null,
    permalink: result.permalink ?? null,
    published_at: result.success ? publishedAt : null,
    status: result.success ? 'published' : 'failed',
    error_message: result.success ? null : result.error || 'Publish failed',
    last_attempt_at: new Date().toISOString(),
    attempt_count: attemptNo ?? 1,
    metadata: {
      jobRunId: jobRunId ?? undefined,
      attemptNo: attemptNo ?? undefined,
    },
  }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('platform_posts')
    .upsert(rows, { onConflict: 'post_id,social_account_id,platform' });

  if (error) {
    throw new Error(`Failed to record platform publish evidence: ${error.message}`);
  }
}

export async function createInitialAnalytics({
  supabase,
  postId,
  publishResults,
}: RecordArtifactsOptions) {
  const fetchedAt = new Date().toISOString();
  const rows = publishResults
    .filter((result) => result.success && result.platformPostId)
    .map((result) => ({
      post_id: postId,
      platform: result.platform,
      social_account_id: result.accountId ?? null,
      external_post_id: result.platformPostId!,
      fetched_at: fetchedAt,
      recorded_at: fetchedAt,
      synced_at: fetchedAt,
      last_synced_at: fetchedAt,
      impressions: 0,
      reach: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      video_views: 0,
      views: 0,
      engagement_rate: 0,
    }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('post_analytics')
    .upsert(rows, { onConflict: 'post_id,platform,fetched_at' });

  if (error) {
    // Publishing already happened before this helper is called. Analytics seeding
    // must not turn a successful external publish into a failed post.
    console.warn('[createInitialAnalytics] Failed to seed analytics', {
      postId,
      error: error.message,
    });
  }
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

export function parseAccountIdsFromMetadata(metadata: unknown): Partial<Record<Platform, string>> {
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

export function mediaUrlLooksLikeVideo(url: string) {
  const normalized = url.toLowerCase();
  return VIDEO_EXTENSION_PATTERN.test(normalized) || normalized.includes('video');
}

function mediaItemLooksLikeVideo(item: any) {
  const declaredType = String(
    item?.type || item?.file_type || item?.mime_type || item?.content_type || ''
  ).toLowerCase();

  if (declaredType.includes('video')) return true;

  const url = typeof item?.url === 'string' ? item.url : '';
  return url ? mediaUrlLooksLikeVideo(url) : false;
}

function mediaItemLooksLikeImage(item: any) {
  const declaredType = String(
    item?.type || item?.file_type || item?.mime_type || item?.content_type || ''
  ).toLowerCase();

  if (declaredType.includes('image')) return true;

  const url = typeof item?.url === 'string' ? item.url.toLowerCase() : '';
  return /\.(jpe?g|png|gif|webp)(?:[?#]|$)/i.test(url);
}

export function extractMediaUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];

  return media
    .map((item: any) => item?.url)
    .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
}

export function inferMediaTypeFromMedia(media: unknown): PlatformContent['mediaType'] | undefined {
  if (!Array.isArray(media) || media.length === 0) return undefined;

  if (media.length > 1) return 'CAROUSEL_ALBUM';

  const [item] = media;
  if (mediaItemLooksLikeVideo(item)) return 'VIDEO';
  if (mediaItemLooksLikeImage(item)) return 'IMAGE';

  return undefined;
}

export function buildPlatformContentPayload(
  rawContent: any,
  platforms: Platform[],
  defaultMediaUrls: string[] = [],
  defaultMediaType?: PlatformContent['mediaType']
): { fallback: PlatformContent; perPlatform: Partial<Record<Platform, PlatformContent>> } {
  const content = (
    typeof rawContent === 'object' && rawContent !== null ? rawContent : {}
  ) as Record<string, PlatformContent>;

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

  const fallbackMediaType =
    defaultEntry.mediaType ||
    platforms
      .map((platform) => content[platform]?.mediaType)
      .find((mediaType): mediaType is PlatformContent['mediaType'] => Boolean(mediaType)) ||
    (fallbackMedia.length > 1 ? 'CAROUSEL_ALBUM' : defaultMediaType);

  const fallback: PlatformContent = {
    text: fallbackText,
    mediaUrls: fallbackMedia,
    link: fallbackLink,
  };
  if (fallbackMediaType) {
    fallback.mediaType = fallbackMediaType;
  }

  const perPlatform = platforms.reduce(
    (acc, platform) => {
      const entry = content[platform] || {};
      const platformContent: PlatformContent = {
        text: entry.text || fallback.text,
        mediaUrls: entry.mediaUrls || fallback.mediaUrls,
        link: entry.link || fallback.link,
      };
      const mediaType = entry.mediaType || fallback.mediaType;
      if (mediaType) {
        platformContent.mediaType = mediaType;
      }
      acc[platform] = platformContent;
      return acc;
    },
    {} as Partial<Record<Platform, PlatformContent>>
  );

  return { fallback, perPlatform };
}
