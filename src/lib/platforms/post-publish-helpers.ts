import type { SupabaseClient } from '@supabase/supabase-js';
import { APIError } from '@/lib/api-middleware';
import type { Platform } from './publisher';
import { parseAccountIdsFromMetadata } from './publish-utils';

export const SUPPORTED_PLATFORMS: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'youtube',
  'tiktok',
];

export function normalizeMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {};

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) || {};
    } catch {
      return {};
    }
  }

  if (typeof metadata === 'object') {
    return { ...metadata };
  }

  return {};
}

export function normalizePlatforms(raw: any): Platform[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : null))
    .filter(
      (value): value is Platform =>
        Boolean(value) && SUPPORTED_PLATFORMS.includes(value as Platform)
    );
}

export async function resolveAccountIds(
  supabase: SupabaseClient,
  workspaceId: string,
  platforms: Platform[],
  metadata: unknown
): Promise<Partial<Record<Platform, string>>> {
  const accountIds: Partial<Record<Platform, string>> = {
    ...parseAccountIdsFromMetadata(metadata),
  };

  const missingPlatforms = platforms.filter((platform) => !accountIds[platform]);

  if (missingPlatforms.length > 0) {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('id, platform')
      .eq('workspace_id', workspaceId)
      .in('platform', missingPlatforms);

    if (error) {
      throw new APIError(500, error.message, 'DATABASE_ERROR');
    }

    (data || []).forEach((account) => {
      if (!accountIds[account.platform as Platform]) {
        accountIds[account.platform as Platform] = account.id;
      }
    });
  }

  const unresolved = platforms.filter((platform) => !accountIds[platform]);
  if (unresolved.length > 0) {
    throw new APIError(
      400,
      `No connected accounts available for: ${unresolved.join(', ')}`,
      'MISSING_PLATFORM_ACCOUNTS'
    );
  }

  return accountIds;
}

