import type { SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/types';

type JobStatus = 'running' | 'succeeded' | 'partial' | 'failed';

export async function startJobRun(
  supabase: SupabaseClient,
  input: {
    workspaceId?: string | null;
    jobType: string;
    trigger?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from('job_runs')
    .insert({
      workspace_id: input.workspaceId || null,
      job_type: input.jobType,
      status: 'running',
      trigger: input.trigger || 'system',
      metadata: input.metadata || {},
    })
    .select('id, started_at')
    .maybeSingle();

  if (error) {
    console.warn('[JobRuns] Failed to start job run:', error.message);
    return null;
  }

  return data;
}

export async function finishJobRun(
  supabase: SupabaseClient,
  id: string | null | undefined,
  input: {
    status: JobStatus;
    processedCount?: number;
    succeededCount?: number;
    failedCount?: number;
    retryCount?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  if (!id) return;

  const finishedAt = new Date();
  const { data: existing } = await supabase
    .from('job_runs')
    .select('started_at')
    .eq('id', id)
    .maybeSingle();
  const startedAtMs = existing?.started_at
    ? new Date(existing.started_at).getTime()
    : finishedAt.getTime();

  const { error } = await supabase
    .from('job_runs')
    .update({
      status: input.status,
      finished_at: finishedAt.toISOString(),
      duration_ms: Math.max(0, finishedAt.getTime() - startedAtMs),
      processed_count: input.processedCount ?? 0,
      succeeded_count: input.succeededCount ?? 0,
      failed_count: input.failedCount ?? 0,
      retry_count: input.retryCount ?? 0,
      error_code: input.errorCode || null,
      error_message: input.errorMessage || null,
      metadata: input.metadata || {},
    })
    .eq('id', id);

  if (error) {
    console.warn('[JobRuns] Failed to finish job run:', error.message);
  }
}

export async function recordPostActivity(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    postId: string;
    actorUserId?: string | null;
    source?: string;
    eventType: string;
    platform?: Platform | string | null;
    socialAccountId?: string | null;
    platformPostId?: string | null;
    jobRunId?: string | null;
    statusBefore?: string | null;
    statusAfter?: string | null;
    message?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from('post_activity_events').insert({
    workspace_id: input.workspaceId,
    post_id: input.postId,
    actor_user_id: input.actorUserId || null,
    source: input.source || 'system',
    event_type: input.eventType,
    platform: input.platform || null,
    social_account_id: input.socialAccountId || null,
    platform_post_id: input.platformPostId || null,
    job_run_id: input.jobRunId || null,
    status_before: input.statusBefore || null,
    status_after: input.statusAfter || null,
    message: input.message || null,
    error_code: input.errorCode || null,
    error_message: input.errorMessage || null,
    metadata: input.metadata || {},
  });

  if (error) {
    console.warn('[PostActivity] Failed to record event:', error.message);
  }
}

export async function recordPublishAttempt(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    postId: string;
    platform: Platform | string;
    socialAccountId?: string | null;
    attemptNo: number;
    status: 'pending' | 'published' | 'failed' | 'skipped';
    platformPostId?: string | null;
    permalink?: string | null;
    retryable?: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    jobRunId?: string | null;
    responseMetadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from('post_publish_attempts').upsert(
    {
      workspace_id: input.workspaceId,
      post_id: input.postId,
      platform: input.platform,
      social_account_id: input.socialAccountId || null,
      attempt_no: input.attemptNo,
      status: input.status,
      platform_post_id: input.platformPostId || null,
      permalink: input.permalink || null,
      completed_at: new Date().toISOString(),
      retryable: input.retryable ?? false,
      error_code: input.errorCode || null,
      error_message: input.errorMessage || null,
      job_run_id: input.jobRunId || null,
      response_metadata: input.responseMetadata || {},
    },
    { onConflict: 'post_id,platform,attempt_no' }
  );

  if (error) {
    console.warn('[PublishAttempt] Failed to record attempt:', error.message);
  }
}
