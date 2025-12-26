import type { SupabaseClient } from '@supabase/supabase-js';

export type UpsertExternalPostInput = {
  workspace_id: string;
  social_account_id: string;
  platform: string;
  external_post_id: string;
  permalink?: string | null;
  content?: Record<string, unknown> | null;
  media?: unknown[] | null;
  post_type?: string | null;
  published_at?: string | null;
  metrics?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
};

/**
 * Upsert an external post (imported from a platform) into the external_posts table.
 *
 * Uses the unique constraint (social_account_id, platform, external_post_id) for deduplication.
 */
export async function upsertExternalPost(
  supabase: SupabaseClient,
  input: UpsertExternalPostInput
): Promise<{ id: string }> {
  const {
    workspace_id,
    social_account_id,
    platform,
    external_post_id,
    permalink,
    content,
    media,
    post_type,
    published_at,
    metrics,
    raw,
  } = input;

  // Try to find existing record
  const { data: existing, error: existingError } = await supabase
    .from('external_posts')
    .select('id')
    .eq('social_account_id', social_account_id)
    .eq('platform', platform)
    .eq('external_post_id', external_post_id)
    .maybeSingle();

  if (existingError && !existingError.message?.includes('does not exist')) {
    throw existingError;
  }

  const now = new Date().toISOString();

  if (existing?.id) {
    // Update existing record
    const { data: updated, error: updateError } = await supabase
      .from('external_posts')
      .update({
        permalink: permalink ?? null,
        content: content ?? {},
        media: media ?? [],
        post_type: post_type ?? null,
        published_at: published_at ?? null,
        metrics: metrics ?? {},
        raw: raw ?? {},
        fetched_at: now,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError) {
      throw updateError;
    }

    return { id: updated.id };
  }

  // Insert new record
  const { data: inserted, error: insertError } = await supabase
    .from('external_posts')
    .insert({
      workspace_id,
      social_account_id,
      platform,
      external_post_id,
      permalink: permalink ?? null,
      content: content ?? {},
      media: media ?? [],
      post_type: post_type ?? null,
      published_at: published_at ?? null,
      metrics: metrics ?? {},
      raw: raw ?? {},
      fetched_at: now,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return { id: inserted.id };
}

/**
 * Batch upsert multiple external posts
 */
export async function upsertExternalPosts(
  supabase: SupabaseClient,
  inputs: UpsertExternalPostInput[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const input of inputs) {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('external_posts')
        .select('id')
        .eq('social_account_id', input.social_account_id)
        .eq('platform', input.platform)
        .eq('external_post_id', input.external_post_id)
        .maybeSingle();

      await upsertExternalPost(supabase, input);

      if (existing?.id) {
        updated++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.error('[upsertExternalPosts] Error upserting post:', input.external_post_id, err);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

