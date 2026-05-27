export const INSTAGRAM_POST_TYPES = ['feed', 'carousel', 'reel', 'story'] as const;

export type InstagramPostType = (typeof INSTAGRAM_POST_TYPES)[number];

export type InstagramUserTag = {
  username: string;
  x?: number;
  y?: number;
};

export type InstagramProductTag = {
  product_id: string;
  x?: number;
  y?: number;
};

export type InstagramTrialParams = {
  graduation_strategy: 'MANUAL' | 'SS_PERFORMANCE';
};

export type InstagramPublishOptions = {
  altText?: string;
  coverAssetId?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  thumbOffset?: number;
  audioName?: string;
  collaborators?: string[];
  userTags?: InstagramUserTag[];
  locationId?: string;
  productTags?: InstagramProductTag[];
  trialParams?: InstagramTrialParams;
};

export type ReelCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function isInstagramPostType(value: unknown): value is InstagramPostType {
  return typeof value === 'string' && INSTAGRAM_POST_TYPES.includes(value as InstagramPostType);
}

export function normalizeInstagramPostType(input: {
  postType?: unknown;
  mediaType?: unknown;
  mediaCount?: number;
}): InstagramPostType {
  if (isInstagramPostType(input.postType)) {
    return input.postType;
  }

  if (input.mediaType === 'REELS') return 'reel';
  if (input.mediaType === 'STORIES') return 'story';
  if (input.mediaType === 'CAROUSEL_ALBUM' || (input.mediaCount || 0) > 1) return 'carousel';

  return 'feed';
}

export function parseCommaList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseJsonArray<T>(value: unknown): T[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string') return undefined;
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? (parsed as T[]) : undefined;
}

export function nearlyNineSixteen(width?: number | null, height?: number | null): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return Math.abs(ratio - 9 / 16) <= 0.025;
}
