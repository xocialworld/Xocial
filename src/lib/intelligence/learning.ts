import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearningEventType } from '@/types/intelligence';

export const LEARNING_EVENT_SCHEMA_VERSION = 1;

function isMissingIntelligenceTable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    message.includes("Could not find the table 'public.learning_events'") ||
    message.includes("Could not find the table 'public.ai_model_runs'")
  );
}

export async function recordLearningEvent(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    actorUserId?: string | null;
    source?: string;
    eventType: LearningEventType | string;
    entityType?: string | null;
    entityId?: string | null;
    platform?: string | null;
    signalStrength?: number;
    metadata?: Record<string, unknown>;
  }
) {
  const source = input.source || 'system';
  const metadata = {
    schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
    source,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    platform: input.platform || null,
    ...(input.metadata || {}),
  };

  const { error } = await supabase.from('learning_events').insert({
    workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId || null,
    source,
    event_type: input.eventType,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    platform: input.platform || null,
    signal_strength: input.signalStrength ?? 1,
    metadata,
  });

  if (error && !isMissingIntelligenceTable(error)) {
    console.warn('[Learning] Failed to record event:', error.message);
  }
}

export async function recordLearningEvents(
  supabase: SupabaseClient,
  events: Array<Parameters<typeof recordLearningEvent>[1] | null | undefined>
) {
  await Promise.all(events.filter(Boolean).map((event) => recordLearningEvent(supabase, event!)));
}

export async function recordAIModelRun(
  supabase: SupabaseClient,
  input: {
    workspaceId?: string | null;
    userId?: string | null;
    feature: string;
    promptVersion?: string | null;
    model?: string | null;
    inputHash?: string | null;
    inputPayload?: Record<string, unknown>;
    outputPayload?: Record<string, unknown>;
    status?: 'succeeded' | 'failed';
    tokenUsage?: number;
    latencyMs?: number;
    entityType?: string | null;
    entityId?: string | null;
    errorMessage?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('ai_model_runs')
    .insert({
      workspace_id: input.workspaceId || null,
      user_id: input.userId || null,
      feature: input.feature,
      prompt_version: input.promptVersion || null,
      model: input.model || null,
      input_hash: input.inputHash || null,
      input_payload: input.inputPayload || {},
      output_payload: input.outputPayload || {},
      status: input.status || 'succeeded',
      token_usage: input.tokenUsage ?? 0,
      latency_ms: input.latencyMs ?? 0,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      error_message: input.errorMessage || null,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (!isMissingIntelligenceTable(error)) {
      console.warn('[Learning] Failed to record AI model run:', error.message);
    }
    return null;
  }

  return data;
}

export function normalizeTextList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function calculateBrandCompletion(profile: Record<string, any> | null | undefined) {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.voice?.trim()),
    Boolean(profile.audience?.trim()),
    normalizeTextList(profile.products_offers).length > 0,
    normalizeTextList(profile.content_pillars).length > 0,
    normalizeTextList(profile.competitors).length > 0,
    normalizeTextList(profile.do_rules).length > 0,
    normalizeTextList(profile.dont_rules).length > 0,
    normalizeTextList(profile.approved_examples).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
