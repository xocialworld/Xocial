import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { createServiceRoleClient } from '@/lib/api-middleware';

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
  const { data: existing, error: existingError } = await supabase
    .from('social_comments')
    .select('id')
    .eq('workspace_id', row.workspace_id)
    .eq('platform', row.platform)
    .eq('external_comment_id', row.external_comment_id)
    .maybeSingle();

  if (existingError) {
    if (isMissingSocialCommentsTable(existingError)) {
      logger.warn('[Social Comments] social_comments table is not available yet; skipping comment sync');
      return;
    }

    throw existingError;
  }

  const { error } = await supabase
    .from('social_comments')
    .upsert(row, {
      onConflict: 'workspace_id,platform,external_comment_id',
    });

  if (!error) {
    if (!existing) {
      await recordLearningEvent(createServiceRoleClient(), {
        workspaceId: row.workspace_id,
        source: 'engagement_sync',
        eventType: 'comment_received',
        entityType: 'post',
        entityId: row.post_id,
        platform: row.platform,
        signalStrength: 0.45,
        metadata: {
          postId: row.post_id,
          accountId: row.social_account_id,
          platformPostId: row.external_post_id,
          commentId: row.external_comment_id,
          authorHandle: row.author_handle,
          likeCount: row.like_count || 0,
          replyCount: row.reply_count || 0,
          createdTime: row.created_time,
        },
      });
    }
    return;
  }

  if (isMissingSocialCommentsTable(error)) {
    logger.warn('[Social Comments] social_comments table is not available yet; skipping comment sync');
    return;
  }

  throw error;
}
