import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { LearningEventType } from '@/types/intelligence';

export const LEARNING_EVENT_SCHEMA_VERSION = 2;

const learningEventMetadataSchema = z.record(z.unknown()).default({});

type LearningEventContract = {
  entityTypes?: string[];
  requiresEntity?: boolean;
  requiresPlatform?: boolean;
  source?: string[];
};

export const LEARNING_EVENT_CONTRACTS: Record<LearningEventType, LearningEventContract> = {
  post_created: { entityTypes: ['post'], requiresEntity: true, source: ['user', 'system'] },
  post_updated: { entityTypes: ['post'], requiresEntity: true, source: ['user', 'system'] },
  post_deleted: { entityTypes: ['post'], requiresEntity: true, source: ['user', 'system'] },
  post_content_edited: { entityTypes: ['post'], requiresEntity: true, source: ['user'] },
  post_scheduled: { entityTypes: ['post'], requiresEntity: true, source: ['user', 'scheduler'] },
  post_published: { entityTypes: ['post'], requiresEntity: true, source: ['system', 'scheduler', 'user'] },
  post_status_changed: { entityTypes: ['post'], requiresEntity: true },
  platform_variant_created: { entityTypes: ['post'], requiresEntity: true, requiresPlatform: true },
  platform_variant_edited: { entityTypes: ['post'], requiresEntity: true, requiresPlatform: true },
  approval_requested: { entityTypes: ['post', 'approval'], requiresEntity: true, source: ['approval', 'user'] },
  ai_generated: { entityTypes: ['post', 'ai_generation', 'workspace'], source: ['xocial_ai', 'user'] },
  ai_regenerated: { entityTypes: ['post', 'ai_generation', 'platform_variant'], source: ['xocial_ai', 'user'] },
  hashtag_generated: { entityTypes: ['hashtag_set', 'workspace'], source: ['xocial_ai'] },
  strategy_generated: { entityTypes: ['strategy', 'workspace'], source: ['xocial_ai'] },
  recommendation_accepted: { entityTypes: ['strategy_recommendation'], requiresEntity: true, source: ['user'] },
  recommendation_dismissed: { entityTypes: ['strategy_recommendation'], requiresEntity: true, source: ['user'] },
  recommendation_completed: { entityTypes: ['strategy_recommendation'], requiresEntity: true, source: ['user'] },
  recommendation_marked_off_brand: { entityTypes: ['strategy_recommendation'], requiresEntity: true, source: ['user'] },
  artifact_accepted: { entityTypes: ['agent_artifact'], requiresEntity: true, source: ['user'] },
  artifact_ignored: { entityTypes: ['agent_artifact'], requiresEntity: true, source: ['user'] },
  artifact_marked_off_brand: { entityTypes: ['agent_artifact'], requiresEntity: true, source: ['user'] },
  ai_feedback_recorded: { source: ['user'] },
  brand_profile_updated: { entityTypes: ['workspace_brand_profile'], requiresEntity: true, source: ['user', 'xocial_ai'] },
  metric_synced: { entityTypes: ['post', 'platform_post'], requiresEntity: true, requiresPlatform: true },
  comment_received: { entityTypes: ['comment', 'post'], requiresEntity: true, requiresPlatform: true },
  comment_replied: { entityTypes: ['comment', 'post'], requiresEntity: true, requiresPlatform: true },
  approval_approved: { entityTypes: ['post', 'approval'], requiresEntity: true, source: ['approval', 'user'] },
  approval_rejected: { entityTypes: ['post', 'approval'], requiresEntity: true, source: ['approval', 'user'] },
  publish_started: { entityTypes: ['post'], requiresEntity: true },
  publish_succeeded: { entityTypes: ['post'], requiresEntity: true, requiresPlatform: true },
  publish_partial: { entityTypes: ['post'], requiresEntity: true },
  publish_failed: { entityTypes: ['post'], requiresEntity: true },
  publish_retry_scheduled: { entityTypes: ['post'], requiresEntity: true, requiresPlatform: true },
  prediction_generated: { entityTypes: ['content_prediction', 'workspace'], source: ['xocial_ai'] },
  calendar_ai_draft_created: { entityTypes: ['post', 'calendar_suggestion'], source: ['xocial_ai'] },
  content_classified: { entityTypes: ['post'], requiresEntity: true },
  agent_task_queued: { entityTypes: ['agent_task'], requiresEntity: true, source: ['xocial_ai', 'user'] },
  agent_task_succeeded: { entityTypes: ['agent_task'], requiresEntity: true, source: ['xocial_ai'] },
  agent_task_failed: { entityTypes: ['agent_task'], requiresEntity: true, source: ['xocial_ai'] },
  agent_task_retry_scheduled: { entityTypes: ['agent_task'], requiresEntity: true, source: ['xocial_ai'] },
  agent_task_recovered: { entityTypes: ['agent_task'], requiresEntity: true, source: ['xocial_ai'] },
  agent_tasks_manual_process: { entityTypes: ['agent_task'], source: ['user', 'xocial_ai'] },
  learning_backfilled: { entityTypes: ['workspace'], source: ['xocial_ai'] },
  analytics_backfilled: { entityTypes: ['workspace', 'post'], source: ['xocial_ai'] },
  knowledge_ingested: { entityTypes: ['knowledge_document', 'workspace'], source: ['xocial_ai', 'user'] },
};

type LearningEventInput = {
  workspaceId: string;
  actorUserId?: string | null;
  source?: string;
  eventType: LearningEventType | string;
  entityType?: string | null;
  entityId?: string | null;
  platform?: string | null;
  signalStrength?: number;
  eventKey?: string | null;
  metadata?: Record<string, unknown>;
};

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

function isMissingEventKeyColumn(error: any) {
  const message = String(error?.message || '');
  return error?.code === '42703' && message.includes('event_key');
}

function isDuplicateEventKey(error: any) {
  return error?.code === '23505' && String(error?.message || '').includes('learning_events_event_key');
}

function clampSignalStrength(value: unknown) {
  const numeric = Number(value ?? 1);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(1, numeric));
}

export function buildLearningEventKey(input: {
  workspaceId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  platform?: string | null;
  discriminator?: string | number | null;
}) {
  return [
    input.workspaceId,
    input.eventType,
    input.entityType || 'workspace',
    input.entityId || 'workspace',
    input.platform || 'all',
    input.discriminator || 'default',
  ]
    .map((part) => String(part).trim().toLowerCase().replace(/\s+/g, '-'))
    .join(':')
    .slice(0, 500);
}

export function validateLearningEventInput(input: LearningEventInput) {
  const metadataResult = learningEventMetadataSchema.safeParse(input.metadata || {});
  const warnings: string[] = [];
  const eventType = String(input.eventType || '').trim();
  const contract = LEARNING_EVENT_CONTRACTS[eventType as LearningEventType];

  if (!eventType) {
    warnings.push('missing_event_type');
  }
  if (!contract) {
    warnings.push('unknown_event_type');
  }
  if (contract?.requiresEntity && (!input.entityType || !input.entityId)) {
    warnings.push('missing_required_entity');
  }
  if (
    contract?.entityTypes?.length &&
    input.entityType &&
    !contract.entityTypes.includes(input.entityType)
  ) {
    warnings.push(`unexpected_entity_type:${input.entityType}`);
  }
  if (contract?.requiresPlatform && !input.platform) {
    warnings.push('missing_required_platform');
  }
  if (contract?.source?.length && input.source && !contract.source.includes(input.source)) {
    warnings.push(`unexpected_source:${input.source}`);
  }
  if (!metadataResult.success) {
    warnings.push('invalid_metadata');
  }

  return {
    eventType,
    warnings,
    metadata: metadataResult.success ? metadataResult.data : {},
    valid: Boolean(eventType) && !warnings.includes('invalid_metadata'),
  };
}

export async function recordLearningEvent(
  supabase: SupabaseClient,
  input: LearningEventInput
) {
  const source = input.source || 'system';
  const validated = validateLearningEventInput({ ...input, source });
  if (!validated.valid) {
    console.warn('[Learning] Invalid learning event skipped:', validated.warnings.join(', '));
    return { recorded: false, skipped: true, warnings: validated.warnings };
  }

  const metadata = {
    schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
    source,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    platform: input.platform || null,
    validationWarnings: validated.warnings,
    ...(validated.metadata || {}),
  };
  const payload = {
    workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId || null,
    source,
    event_type: validated.eventType,
    event_key: input.eventKey || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    platform: input.platform || null,
    signal_strength: clampSignalStrength(input.signalStrength),
    metadata,
  };

  let { error } = await supabase.from('learning_events').insert(payload);

  if (error && isMissingEventKeyColumn(error)) {
    const { event_key: _eventKey, ...legacyPayload } = payload;
    const retry = await supabase.from('learning_events').insert(legacyPayload);
    error = retry.error;
  }

  if (error && !isMissingIntelligenceTable(error)) {
    if (isDuplicateEventKey(error)) {
      return { recorded: false, duplicate: true, warnings: validated.warnings };
    }
    console.warn('[Learning] Failed to record event:', error.message);
    return { recorded: false, error, warnings: validated.warnings };
  }

  return { recorded: !error, warnings: validated.warnings };
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
