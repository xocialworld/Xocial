import type { Platform, PostStatus } from '@/types';

export type ContractRecord = Record<string, unknown>;

export type MediaContract = {
  id?: string;
  url: string;
  type: 'image' | 'video';
  thumbnail?: string | null;
  filename?: string | null;
  size?: number | null;
};

export type PostContract = {
  id: string;
  workspaceId: string;
  content: Record<string, any>;
  platforms: Platform[];
  status: PostStatus;
  media: MediaContract[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  socialAccountId: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
  metadata: ContractRecord;
};

export type PlatformPostContract = {
  id: string;
  postId: string;
  socialAccountId: string | null;
  platform: Platform;
  platformPostId: string | null;
  externalId: string | null;
  permalink: string | null;
  status: string;
  publishedAt: string | null;
  lastAttemptAt: string | null;
  attemptCount: number;
  errorMessage: string | null;
  metadata: ContractRecord;
};

export type PostActivityEventContract = {
  id: string;
  postId: string;
  eventType: string;
  source: string;
  platform: Platform | null;
  statusBefore: string | null;
  statusAfter: string | null;
  message: string | null;
  errorMessage: string | null;
  occurredAt: string;
  metadata: ContractRecord;
};

function asRecord(value: unknown): ContractRecord {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? (value as ContractRecord) : {};
}

export function dbPostToContract(row: any): PostContract {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    content: asRecord(row.content),
    platforms: Array.isArray(row.platforms) ? row.platforms : [],
    status: row.status,
    media: Array.isArray(row.media) ? row.media : [],
    scheduledAt: row.scheduled_at ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    createdBy: row.created_by ?? null,
    socialAccountId: row.social_account_id ?? null,
    externalPostId: row.external_post_id ?? null,
    errorMessage: row.error_message ?? null,
    metadata: asRecord(row.metadata),
  };
}

export function dbPlatformPostToContract(row: any): PlatformPostContract {
  return {
    id: row.id,
    postId: row.post_id,
    socialAccountId: row.social_account_id ?? null,
    platform: row.platform,
    platformPostId: row.platform_post_id ?? null,
    externalId: row.external_id ?? null,
    permalink: row.permalink ?? null,
    status: row.status ?? 'unknown',
    publishedAt: row.published_at ?? null,
    lastAttemptAt: row.last_attempt_at ?? null,
    attemptCount: Number(row.attempt_count || 0),
    errorMessage: row.error_message ?? null,
    metadata: asRecord(row.metadata),
  };
}

export function dbPostActivityToContract(row: any): PostActivityEventContract {
  return {
    id: row.id,
    postId: row.post_id,
    eventType: row.event_type,
    source: row.source ?? 'system',
    platform: row.platform ?? null,
    statusBefore: row.status_before ?? null,
    statusAfter: row.status_after ?? null,
    message: row.message ?? null,
    errorMessage: row.error_message ?? null,
    occurredAt: row.occurred_at,
    metadata: asRecord(row.metadata),
  };
}
