import type { SupabaseClient } from '@supabase/supabase-js';

export type UpsertPostInput = {
  workspace_id: string;
  social_account_id: string;
  external_post_id: string;
  platforms: string[];
  content: any;
  status: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  media?: any[] | null;
  metadata?: Record<string, any> | null;
};

/**
 * Upsert a post without relying on a DB UNIQUE constraint.
 *
 * Many of our platform sync flows previously used `upsert(..., { onConflict: 'workspace_id,external_post_id' })`,
 * which fails unless that exact unique constraint exists in the DB.
 *
 * This helper provides a safe fallback: (workspace_id + social_account_id + external_post_id) lookup,
 * then update or insert.
 */
export async function upsertPostByExternalId(
  supabase: SupabaseClient,
  input: UpsertPostInput
): Promise<{ id: string }> {
  const { workspace_id, social_account_id, external_post_id } = input;

  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id')
    .eq('workspace_id', workspace_id)
    .eq('social_account_id', social_account_id)
    .eq('external_post_id', external_post_id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .from('posts')
      .update({
        platforms: input.platforms,
        content: input.content,
        status: input.status,
        published_at: input.published_at ?? null,
        scheduled_at: input.scheduled_at ?? null,
        media: input.media ?? null,
        metadata: input.metadata ?? null,
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError) {
      throw updateError;
    }

    return { id: updated.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('posts')
    .insert({
      workspace_id: input.workspace_id,
      social_account_id: input.social_account_id,
      external_post_id: input.external_post_id,
      platforms: input.platforms,
      content: input.content,
      status: input.status,
      published_at: input.published_at ?? null,
      scheduled_at: input.scheduled_at ?? null,
      media: input.media ?? null,
      metadata: input.metadata ?? null,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return { id: inserted.id };
}


