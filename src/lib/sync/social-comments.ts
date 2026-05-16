import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export type SocialCommentRow = {
  workspace_id: string;
  post_id: string;
  social_account_id: string;
  platform: 'facebook' | 'instagram';
  external_post_id: string;
  external_comment_id: string;
  parent_external_comment_id?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  author_avatar?: string | null;
  content: string;
  like_count?: number;
  reply_count?: number;
  is_hidden?: boolean;
  raw?: Record<string, any>;
  created_time?: string | null;
  fetched_at?: string;
};

function isMissingSocialCommentsTable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes("Could not find the table 'public.social_comments'")
  );
}

export async function upsertSocialComment(
  supabase: SupabaseClient,
  row: SocialCommentRow
) {
  const { error } = await supabase
    .from('social_comments')
    .upsert(row, {
      onConflict: 'workspace_id,platform,external_comment_id',
    });

  if (!error) return;

  if (isMissingSocialCommentsTable(error)) {
    logger.warn('[Social Comments] social_comments table is not available yet; skipping comment sync');
    return;
  }

  throw error;
}
