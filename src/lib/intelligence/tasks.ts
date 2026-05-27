import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Platform } from '@/types';
import { APPROVAL_REASONS } from './approval-reasons';
import { buildIntelligenceContext, getBrandProfile } from './context';
import { recordLearningEvent } from './learning';
import { generateWorkerJson } from './llm';

export type AgentType =
  | 'signal_ingestion'
  | 'content_classifier'
  | 'brand_learner'
  | 'performance_analyst'
  | 'best_time'
  | 'strategy_planner'
  | 'content_adaptation'
  | 'safety'
  | 'reporting';

type AgentTaskRow = {
  id: string;
  workspace_id: string;
  agent_type: AgentType | string;
  status: string;
  priority?: number | null;
  entity_type?: string | null;
  entity_id?: string | null;
  input_payload?: Record<string, any> | null;
  retry_count?: number | null;
  scheduled_for?: string | null;
  started_at?: string | null;
};

type ProcessorResult = {
  message: string;
  artifactsCreated?: number;
  rowsWritten?: number;
  recommendationsCreated?: number;
  skipped?: boolean;
  [key: string]: unknown;
};

const MAX_AGENT_RETRIES = 2;
const AGENT_RETRY_BACKOFF_MINUTES = [2, 10, 30];
const STALE_TASK_MINUTES = 20;
const PLATFORM_VALUES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
];

const performanceInsightSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  narrative: z.string().min(1),
  winner_patterns: z.array(z.string()).default([]),
  weak_patterns: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});

const brandLearnerSchema = z.object({
  suggestions: z.array(
    z.object({
      field: z.enum([
        'voice',
        'audience',
        'products_offers',
        'content_pillars',
        'competitors',
        'do_rules',
        'dont_rules',
        'approved_examples',
        'rejected_examples',
        'platform_preferences',
      ]),
      operation: z.enum(['append', 'append_many', 'replace', 'set']).default('append'),
      suggestedValue: z.union([
        z.string(),
        z.array(z.string()),
        z.record(z.string()),
      ]),
      reason: z.string().min(1),
      evidence: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).default(0.65),
    })
  ).default([]),
});

const strategyPlannerSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z.enum(['content', 'timing', 'platform', 'growth', 'risk', 'campaign']).default('content'),
      title: z.string().min(1),
      description: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      confidence_score: z.number().min(0).max(1).default(0.65),
      action_items: z.array(z.string()).default([]),
      metrics: z.record(z.unknown()).default({}),
    })
  ).default([]),
});

const reportingSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  executive_summary: z.string().min(1),
  wins: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
  client_notes: z.array(z.string()).default([]),
});

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function normalizePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Platform => PLATFORM_VALUES.includes(item));
}

function extractText(content: unknown, platform?: string): string {
  const record = asRecord(content);
  const platformEntry = platform ? asRecord(record[platform]) : {};
  const defaultEntry = asRecord(record.default);
  const firstEntry = Object.values(record).find((entry) => typeof asRecord(entry).text === 'string');

  return (
    platformEntry.text ||
    platformEntry.caption ||
    defaultEntry.text ||
    defaultEntry.caption ||
    record.text ||
    asRecord(firstEntry).text ||
    ''
  ).toString();
}

function hashInput(input: unknown) {
  return JSON.stringify(input || {})
    .slice(0, 500)
    .replace(/\s+/g, ' ');
}

function compactJson(value: unknown, maxLength = 7000) {
  return JSON.stringify(value, null, 2).slice(0, maxLength);
}

function truncateText(value: unknown, maxLength = 700) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function stripLargePost(post: any) {
  return {
    id: post.id,
    status: post.status,
    platforms: post.platforms,
    scheduled_at: post.scheduled_at,
    published_at: post.published_at,
    content: Object.fromEntries(
      Object.entries(asRecord(post.content)).map(([key, value]) => [
        key,
        {
          text: truncateText(asRecord(value).text || asRecord(value).caption || value, 500),
        },
      ])
    ),
  };
}

function approvalReasonEntries(approvals: any[], signalType: 'approved' | 'rejected') {
  const definitions = new Map(APPROVAL_REASONS.map((reason) => [reason.id, reason]));
  return approvals
    .filter((signal: any) => signal.signal_type === signalType)
    .flatMap((signal: any) => {
      const metadata = asRecord(signal.metadata);
      const reasonIds = Array.isArray(metadata.reasonIds) ? metadata.reasonIds : [];
      return reasonIds
        .map((reasonId: unknown) => definitions.get(String(reasonId)))
        .filter(Boolean)
        .map((reason) => ({
          ...reason!,
          comment: signal.comment ? String(signal.comment) : '',
          postId: signal.post_id,
        }));
    });
}

function approvalReasonEvidence(entries: Array<Record<string, any>>) {
  return entries
    .slice(0, 6)
    .map((entry) => {
      const comment = entry.comment ? `: ${entry.comment}` : '';
      return `${entry.label}${comment}`;
    });
}

function approvalReasonSuggestion(entries: Array<Record<string, any>>, fallback: string) {
  const hints = modeList(entries.map((entry) => String(entry.brandLearningHint || '')).filter(Boolean));
  return hints[0] || fallback;
}

function workerSystemPrompt(agentName: string) {
  return [
    `You are ${agentName}, a specialist worker inside Xocial AI.`,
    'Use only the provided workspace data.',
    'Return one valid JSON object matching the requested schema.',
    'Do not invent metrics. If evidence is weak, say confidence is low and recommend a next measurement step.',
    'Keep language clear for social media managers and agencies.',
  ].join('\n');
}

export async function enqueueAgentTask(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    agentType: AgentType;
    entityType?: string | null;
    entityId?: string | null;
    priority?: number;
    scheduledFor?: string;
    inputPayload?: Record<string, unknown>;
    dedupe?: boolean;
  }
) {
  const dedupe = input.dedupe ?? true;
  const inputHash = hashInput(input.inputPayload);

  if (dedupe) {
    let existingQuery = supabase
      .from('agent_tasks')
      .select('id, status')
      .eq('workspace_id', input.workspaceId)
      .eq('agent_type', input.agentType)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (input.entityType && input.entityId) {
      existingQuery = existingQuery
        .eq('entity_type', input.entityType)
        .eq('entity_id', input.entityId);
    } else {
      existingQuery = existingQuery.eq('input_hash', inputHash);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      workspace_id: input.workspaceId,
      agent_type: input.agentType,
      status: 'queued',
      priority: input.priority ?? 5,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      input_hash: inputHash,
      input_payload: input.inputPayload || {},
      scheduled_for: input.scheduledFor || new Date().toISOString(),
    })
    .select('id, status')
    .single();

  if (error) {
    console.warn('[AgentTasks] Failed to queue task:', error.message);
    return null;
  }

  return data;
}

export async function queuePostIntelligenceTasks(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    postId: string;
    platforms?: Platform[];
    reason: string;
    priority?: number;
  }
) {
  await Promise.all([
    enqueueAgentTask(supabase, {
      workspaceId: input.workspaceId,
      agentType: 'content_classifier',
      entityType: 'post',
      entityId: input.postId,
      priority: input.priority ?? 6,
      inputPayload: { reason: input.reason, platforms: input.platforms || [] },
    }),
    enqueueAgentTask(supabase, {
      workspaceId: input.workspaceId,
      agentType: 'safety',
      entityType: 'post',
      entityId: input.postId,
      priority: 4,
      inputPayload: { reason: input.reason, platforms: input.platforms || [] },
    }),
  ]);
}

export async function processDueAgentTasks(
  supabase: SupabaseClient,
  options: { limit?: number; now?: Date; workspaceId?: string; staleAfterMinutes?: number } = {}
) {
  const limit = options.limit ?? 10;
  const now = options.now || new Date();
  const staleRecovery = await recoverStaleRunningTasks(supabase, {
    now,
    workspaceId: options.workspaceId,
    staleAfterMinutes: options.staleAfterMinutes ?? STALE_TASK_MINUTES,
  });

  let queuedQuery = supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', now.toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (options.workspaceId) {
    queuedQuery = queuedQuery.eq('workspace_id', options.workspaceId);
  }

  const { data: queuedTasks, error } = await queuedQuery;

  if (error) {
    throw new Error(error.message);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const task of (queuedTasks || []) as AgentTaskRow[]) {
    const claimed = await claimTask(supabase, task.id);
    if (!claimed) continue;

    const startedAt = Date.now();
    try {
      const output = await runAgentProcessor(supabase, claimed);

      await supabase
        .from('agent_tasks')
        .update({
          status: 'succeeded',
          output_payload: output,
          error_message: null,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimed.id);

      await recordLearningEvent(supabase, {
        workspaceId: claimed.workspace_id,
        source: 'xocial_ai',
        eventType: 'agent_task_succeeded',
        entityType: 'agent_task',
        entityId: claimed.id,
        signalStrength: 0.5,
        metadata: {
          agentType: claimed.agent_type,
          targetEntityType: claimed.entity_type,
          targetEntityId: claimed.entity_id,
          durationMs: Date.now() - startedAt,
          output,
        },
      });

      results.push({ taskId: claimed.id, agentType: claimed.agent_type, success: true, output });
    } catch (processorError) {
      const message =
        processorError instanceof Error ? processorError.message : 'Agent task failed';
      const retryCount = Number(claimed.retry_count || 0) + 1;
      const shouldRetry = retryCount <= MAX_AGENT_RETRIES;
      const nextRetry = new Date(
        Date.now() + (AGENT_RETRY_BACKOFF_MINUTES[retryCount - 1] || 30) * 60_000
      );

      await supabase
        .from('agent_tasks')
        .update({
          status: shouldRetry ? 'queued' : 'failed',
          retry_count: retryCount,
          error_message: message,
          scheduled_for: shouldRetry ? nextRetry.toISOString() : claimed.input_payload?.scheduled_for,
          finished_at: shouldRetry ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimed.id);

      await recordLearningEvent(supabase, {
        workspaceId: claimed.workspace_id,
        source: 'xocial_ai',
        eventType: shouldRetry ? 'agent_task_retry_scheduled' : 'agent_task_failed',
        entityType: 'agent_task',
        entityId: claimed.id,
        signalStrength: 0.2,
        metadata: {
          agentType: claimed.agent_type,
          targetEntityType: claimed.entity_type,
          targetEntityId: claimed.entity_id,
          retryCount,
          errorMessage: message,
        },
      });

      results.push({
        taskId: claimed.id,
        agentType: claimed.agent_type,
        success: false,
        retryScheduled: shouldRetry,
        error: message,
      });
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success && !result.retryScheduled).length,
    retryScheduled: results.filter((result) => result.retryScheduled).length,
    recoveredStale: staleRecovery.recovered,
    failedStale: staleRecovery.failed,
    results,
  };
}

async function recoverStaleRunningTasks(
  supabase: SupabaseClient,
  options: { now: Date; workspaceId?: string; staleAfterMinutes: number }
) {
  const staleBefore = new Date(
    options.now.getTime() - options.staleAfterMinutes * 60_000
  ).toISOString();

  let staleQuery = supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'running')
    .lt('started_at', staleBefore)
    .order('started_at', { ascending: true })
    .limit(25);

  if (options.workspaceId) {
    staleQuery = staleQuery.eq('workspace_id', options.workspaceId);
  }

  const { data: staleTasks, error } = await staleQuery;
  if (error) {
    console.warn('[AgentTasks] Failed to inspect stale tasks:', error.message);
    return { recovered: 0, failed: 0 };
  }

  let recovered = 0;
  let failed = 0;

  for (const task of (staleTasks || []) as AgentTaskRow[]) {
    const retryCount = Number(task.retry_count || 0) + 1;
    const shouldRetry = retryCount <= MAX_AGENT_RETRIES;
    const updatePayload = shouldRetry
      ? {
          status: 'queued',
          retry_count: retryCount,
          error_message: `Recovered stale running worker after ${options.staleAfterMinutes} minutes`,
          scheduled_for: options.now.toISOString(),
          started_at: null,
          updated_at: options.now.toISOString(),
        }
      : {
          status: 'failed',
          retry_count: retryCount,
          error_message: `Worker exceeded stale recovery limit after ${options.staleAfterMinutes} minutes`,
          finished_at: options.now.toISOString(),
          updated_at: options.now.toISOString(),
        };

    const { error: updateError } = await supabase
      .from('agent_tasks')
      .update(updatePayload)
      .eq('id', task.id)
      .eq('status', 'running');

    if (updateError) {
      console.warn('[AgentTasks] Failed to recover stale task:', updateError.message);
      continue;
    }

    if (shouldRetry) recovered += 1;
    else failed += 1;

    await recordLearningEvent(supabase, {
      workspaceId: task.workspace_id,
      source: 'xocial_ai',
      eventType: shouldRetry ? 'agent_task_recovered' : 'agent_task_failed',
      entityType: 'agent_task',
      entityId: task.id,
      signalStrength: shouldRetry ? 0.35 : 0.2,
      metadata: {
        agentType: task.agent_type,
        retryCount,
        staleAfterMinutes: options.staleAfterMinutes,
      },
    });
  }

  return { recovered, failed };
}

async function claimTask(supabase: SupabaseClient, taskId: string): Promise<AgentTaskRow | null> {
  const { data, error } = await supabase
    .from('agent_tasks')
    .update({
      status: 'running',
      error_message: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[AgentTasks] Failed to claim task:', error.message);
    return null;
  }

  return (data as AgentTaskRow | null) || null;
}

type AgentArtifactInput = {
  workspace_id: string;
  task_id?: string | null;
  artifact_type: string;
  title: string;
  summary?: string | null;
  payload?: Record<string, any>;
  confidence?: number;
  status?: string;
  source_data?: Record<string, any>;
};

async function upsertAgentArtifact(
  supabase: SupabaseClient,
  artifact: AgentArtifactInput
) {
  const sourceData = asRecord(artifact.source_data);
  const dedupeKey = String(
    sourceData.dedupeKey ||
      `${artifact.workspace_id}:${artifact.artifact_type}:${hashInput({
        title: artifact.title,
        summary: artifact.summary,
        payload: artifact.payload,
      })}`
  );
  const source_data = { ...sourceData, dedupeKey };

  const { data: existing, error: existingError } = await supabase
    .from('agent_artifacts')
    .select('id, status')
    .eq('workspace_id', artifact.workspace_id)
    .eq('artifact_type', artifact.artifact_type)
    .contains('source_data', { dedupeKey })
    .in('status', ['active', 'accepted', 'ignored'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    if (existing.status === 'active') {
      const { error: updateError } = await supabase
        .from('agent_artifacts')
        .update({
          task_id: artifact.task_id || null,
          title: artifact.title,
          summary: artifact.summary || null,
          payload: artifact.payload || {},
          confidence: artifact.confidence ?? 0,
          source_data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateError) throw new Error(updateError.message);
    }

    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from('agent_artifacts')
    .insert({
      ...artifact,
      status: artifact.status || 'active',
      source_data,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { id: data?.id, created: true };
}

async function upsertAgentArtifacts(
  supabase: SupabaseClient,
  artifacts: AgentArtifactInput[]
) {
  let created = 0;
  let reused = 0;

  for (const artifact of artifacts) {
    const result = await upsertAgentArtifact(supabase, artifact);
    if (result.created) created += 1;
    else reused += 1;
  }

  return { created, reused };
}

async function insertUniqueStrategyRecommendations(
  supabase: SupabaseClient,
  recommendations: Array<Record<string, any>>
) {
  let created = 0;
  let reused = 0;

  for (const recommendation of recommendations) {
    const { data: existing, error: existingError } = await supabase
      .from('strategy_recommendations')
      .select('id')
      .eq('workspace_id', recommendation.workspace_id)
      .eq('title', recommendation.title)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) {
      reused += 1;
      continue;
    }

    const { error } = await supabase
      .from('strategy_recommendations')
      .insert({
        ...recommendation,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    created += 1;
  }

  return { created, reused };
}

async function runAgentProcessor(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  switch (task.agent_type) {
    case 'signal_ingestion':
      return processSignalIngestion(supabase, task);
    case 'content_classifier':
      return processContentClassifier(supabase, task);
    case 'performance_analyst':
      return processPerformanceAnalyst(supabase, task);
    case 'brand_learner':
      return processBrandLearner(supabase, task);
    case 'best_time':
      return processBestTime(supabase, task);
    case 'strategy_planner':
      return processStrategyPlanner(supabase, task);
    case 'safety':
      return processSafety(supabase, task);
    case 'reporting':
      return processReporting(supabase, task);
    case 'content_adaptation':
      return processContentAdaptation(supabase, task);
    default:
      throw new Error(`Unsupported agent type: ${task.agent_type}`);
  }
}

async function fetchPost(supabase: SupabaseClient, task: AgentTaskRow) {
  const postId = task.entity_type === 'post' ? task.entity_id : task.input_payload?.postId;
  if (!postId) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('workspace_id', task.workspace_id)
    .eq('id', postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

function classifyText(
  text: string,
  brandProfile: Awaited<ReturnType<typeof getBrandProfile>>,
  media: unknown[],
  metadata: Record<string, any>
) {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const hashtagCount = (text.match(/#[a-z0-9_]+/gi) || []).length;
  const firstLine = text.trim().split('\n').find(Boolean) || '';
  const ctaRules: Array<[string, string]> = [
    ['comment', 'comment'],
    ['reply', 'comment'],
    ['save', 'save'],
    ['share', 'share'],
    ['subscribe', 'subscribe'],
    ['follow', 'follow'],
    ['book', 'book'],
    ['dm', 'dm'],
    ['download', 'download'],
    ['learn more', 'learn_more'],
  ];

  const pillar = brandProfile.content_pillars.find((item) =>
    lower.includes(item.toLowerCase())
  );
  const product = brandProfile.products_offers.find((item) =>
    lower.includes(item.toLowerCase())
  );
  const hasVideo = media.some((item) => asRecord(item).type === 'video');
  const hasImage = media.some((item) => asRecord(item).type === 'image');
  const cta = ctaRules.find(([term]) => lower.includes(term))?.[1] || 'none';

  let hookType = 'direct';
  if (firstLine.includes('?')) hookType = 'question';
  else if (/^\d+\s/.test(firstLine) || /\b\d+\s+(ways|tips|ideas|steps)\b/i.test(firstLine)) hookType = 'list';
  else if (/\bhow to\b/i.test(firstLine)) hookType = 'how_to';
  else if (/\bnew|launch|introducing|update\b/i.test(firstLine)) hookType = 'announcement';
  else if (/\bi\b|\bwe\b|\bwhen\b/i.test(firstLine)) hookType = 'story';

  let tone = 'neutral';
  if (/\bhow to|guide|tips|learn|framework|step\b/i.test(text)) tone = 'educational';
  if (/\bexcited|amazing|love|win|growth|best\b/i.test(text)) tone = 'enthusiastic';
  if (/\bdeal|offer|buy|limited|book|sale|pricing\b/i.test(text)) tone = 'promotional';
  if (/\bteam|business|client|strategy|results\b/i.test(text)) tone = 'professional';
  if (/\bbehind the scenes|story|journey|today\b/i.test(text)) tone = 'casual';

  let sentiment = 'neutral';
  if (/\bexcellent|great|growth|win|better|success|love|best\b/i.test(text)) sentiment = 'positive';
  if (/\bfail|problem|risk|bad|wrong|blocked|issue\b/i.test(text)) sentiment = 'negative';

  let format = 'caption';
  if (hookType === 'list') format = 'list';
  else if (hookType === 'question') format = 'question';
  else if (hasVideo) format = 'video_caption';
  else if (hasImage) format = 'visual_caption';
  else if (tone === 'promotional') format = 'promotion';

  return {
    topic: pillar || product || words.slice(0, 5).join(' ') || 'general',
    hook_type: hookType,
    cta_type: cta,
    tone,
    sentiment,
    format,
    pillar: pillar || null,
    media_type: hasVideo ? 'video' : hasImage ? 'image' : 'none',
    caption_length: text.length,
    hashtag_count: hashtagCount,
    source: metadata?.ai || metadata?.aiGenerationId ? 'ai' : metadata?.external ? 'imported' : 'manual',
    features: {
      firstLine,
      wordCount: words.length,
      hasQuestion: text.includes('?'),
      lineCount: text.split('\n').filter(Boolean).length,
    },
  };
}

async function processSignalIngestion(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const eventType = task.input_payload?.eventType || 'signal_ingested';
  await recordLearningEvent(supabase, {
    workspaceId: task.workspace_id,
    source: 'xocial_ai',
    eventType,
    entityType: task.entity_type || task.input_payload?.entityType || null,
    entityId: task.entity_id || task.input_payload?.entityId || null,
    platform: task.input_payload?.platform || null,
    signalStrength: Number(task.input_payload?.signalStrength || 0.5),
    metadata: task.input_payload || {},
  });

  return { message: 'Signal ingested', rowsWritten: 1 };
}

async function processContentClassifier(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const post = await fetchPost(supabase, task);
  if (!post) return { message: 'Post not found; classifier skipped', skipped: true };

  const brandProfile = await getBrandProfile(supabase, task.workspace_id);
  const selectedPlatforms =
    normalizePlatforms(task.input_payload?.platforms).length > 0
      ? normalizePlatforms(task.input_payload?.platforms)
      : normalizePlatforms(post.platforms);
  const platforms = selectedPlatforms.length ? selectedPlatforms : ['instagram'];
  const media = Array.isArray(post.media) ? post.media : [];
  const metadata = asRecord(post.metadata);

  const rows = platforms.map((platform) => {
    const text = extractText(post.content, platform);
    const features = classifyText(text, brandProfile, media, metadata);
    return {
      workspace_id: task.workspace_id,
      post_id: post.id,
      platform,
      ...features,
    };
  });

  const { error } = await supabase.from('content_feature_snapshots').insert(rows);
  if (error) throw new Error(error.message);

  await recordLearningEvent(supabase, {
    workspaceId: task.workspace_id,
    source: 'xocial_ai',
    eventType: 'content_classified',
    entityType: 'post',
    entityId: post.id,
    signalStrength: 0.55,
    metadata: { platforms, rowsWritten: rows.length },
  });

  return { message: 'Content classified', rowsWritten: rows.length, platforms };
}

async function processPerformanceAnalyst(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const { data: outcomes, error } = await supabase
    .from('post_outcome_summaries')
    .select('*')
    .eq('workspace_id', task.workspace_id)
    .order('generated_at', { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  const rows = outcomes || [];
  if (rows.length === 0) {
    return { message: 'No outcome summaries available yet', skipped: true };
  }

  const sorted = [...rows].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
  const top = sorted.slice(0, 3);
  const weak = sorted.slice(-3).reverse();
  const avgScore =
    rows.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / rows.length;
  const bestPlatform = mode(rows.map((row: any) => row.platform));
  const summary =
    top.length > 0
      ? `${bestPlatform || 'Recent content'} is providing the clearest signal. Average normalized score is ${Math.round(avgScore)} across ${rows.length} platform outcomes.`
      : 'Xocial has enough metric snapshots to start comparing content outcomes.';
  const postIds = Array.from(
    new Set([...top, ...weak].map((row: any) => row.post_id).filter(Boolean))
  );
  const { data: postsForContext } = postIds.length
    ? await supabase
        .from('posts')
        .select('id, status, platforms, content, scheduled_at, published_at')
        .eq('workspace_id', task.workspace_id)
        .in('id', postIds)
    : { data: [] };

  let aiInsight: z.output<typeof performanceInsightSchema> | null = null;
  let modelRunId: string | undefined;
  try {
    const generated = await generateWorkerJson(supabase, {
      workspaceId: task.workspace_id,
      taskId: task.id,
      agentType: 'performance_analyst',
      promptVersion: 'performance-analyst-v1',
      system: workerSystemPrompt('Performance Analyst'),
      user: [
        'Analyze these normalized post outcomes and explain what is winning, what is weak, and what the team should do next.',
        'Return JSON with: title, summary, narrative, winner_patterns, weak_patterns, recommended_actions, risks.',
        '',
        `Brand/account context: ${compactJson(task.input_payload || {}, 1200)}`,
        `Outcomes: ${compactJson(rows.slice(0, 30), 7000)}`,
        `Related posts: ${compactJson((postsForContext || []).map(stripLargePost), 5000)}`,
      ].join('\n'),
      schema: performanceInsightSchema,
      maxTokens: 1200,
      temperature: 0.25,
      inputPayload: {
        outcomeCount: rows.length,
        postIds,
      },
      entityType: 'agent_task',
      entityId: task.id,
    });
    aiInsight = performanceInsightSchema.parse(generated.data);
    modelRunId = generated.modelRunId;
  } catch (aiError) {
    console.warn('[AgentTasks] Performance analyst AI fallback:', aiError);
  }

  const artifact = {
    workspace_id: task.workspace_id,
    task_id: task.id,
    artifact_type: 'performance_insight',
    title: aiInsight?.title || 'Performance pattern detected',
    summary: aiInsight?.summary || summary,
    confidence: Math.min(0.9, 0.45 + rows.length * 0.02),
    status: 'active',
    payload: {
      aiGenerated: Boolean(aiInsight),
      modelRunId: modelRunId || null,
      averageScore: Math.round(avgScore),
      bestPlatform,
      narrative: aiInsight?.narrative || summary,
      winnerPatterns: aiInsight?.winner_patterns || [],
      weakPatterns: aiInsight?.weak_patterns || [],
      risks: aiInsight?.risks || [],
      topPosts: top.map((row: any) => ({
        postId: row.post_id,
        platform: row.platform,
        score: Number(row.score || 0),
        reason: row.reason_summary,
      })),
      weakPosts: weak.map((row: any) => ({
        postId: row.post_id,
        platform: row.platform,
        score: Number(row.score || 0),
        reason: row.reason_summary,
      })),
      recommendedActions: [
        ...(aiInsight?.recommended_actions || []),
        ...(aiInsight?.recommended_actions?.length
          ? []
          : [
              'Reuse the hook and CTA patterns from the highest-scoring posts.',
              'Review weak posts for missing CTA, long captions, or platform mismatch.',
              'Use the Calendar strategy tools to schedule more content in winning windows.',
            ]),
      ],
    },
    source_data: {
      dedupeKey: `performance:${hashInput({
        outcomeCount: rows.length,
        top: top.map((row: any) => `${row.post_id}:${row.platform}:${row.score}`),
        weak: weak.map((row: any) => `${row.post_id}:${row.platform}:${row.score}`),
      })}`,
      outcomeCount: rows.length,
    },
  };

  const result = await upsertAgentArtifact(supabase, artifact);

  return {
    message: result.created ? 'Performance insight created' : 'Performance insight refreshed',
    artifactsCreated: result.created ? 1 : 0,
  };
}

async function processBrandLearner(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const [brandProfile, approvals, features, outcomes] = await Promise.all([
    getBrandProfile(supabase, task.workspace_id),
    supabase
      .from('approval_learning_signals')
      .select('*')
      .eq('workspace_id', task.workspace_id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('content_feature_snapshots')
      .select('*')
      .eq('workspace_id', task.workspace_id)
      .order('created_at', { ascending: false })
      .limit(80)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('post_outcome_summaries')
      .select('*')
      .eq('workspace_id', task.workspace_id)
      .order('score', { ascending: false })
      .limit(20)
      .then(({ data, error }) => (error ? [] : data || [])),
  ]);

  const suggestions: Array<Record<string, any>> = [];
  const rejectedComments = approvals
    .filter((signal: any) => signal.signal_type === 'rejected' && signal.comment)
    .map((signal: any) => String(signal.comment));
  const approvedComments = approvals
    .filter((signal: any) => signal.signal_type === 'approved' && signal.comment)
    .map((signal: any) => String(signal.comment));
  const rejectedReasons = approvalReasonEntries(approvals, 'rejected');
  const approvedReasons = approvalReasonEntries(approvals, 'approved');
  const rejectionCategories = new Set(rejectedReasons.map((reason) => reason.category));
  const approvalCategories = new Set(approvedReasons.map((reason) => reason.category));
  const topPillars = modeList(
    features
      .filter((feature: any) =>
        outcomes.some((outcome: any) => outcome.post_id === feature.post_id && Number(outcome.score || 0) >= 60)
      )
      .map((feature: any) => feature.pillar || feature.topic)
      .filter(Boolean)
  );

  if (rejectedComments.length > 0) {
    suggestions.push({
      field: 'dont_rules',
      operation: 'append',
      suggestedValue: summarizePreference(rejectedComments, 'Avoid content patterns repeatedly rejected in approvals.'),
      reason: 'Based on recent rejection comments.',
      evidence: rejectedComments.slice(0, 5),
    });
  }

  if (rejectedReasons.length > 0) {
    if (rejectionCategories.has('tone') || rejectionCategories.has('brand')) {
      suggestions.push({
        field: 'dont_rules',
        operation: 'append',
        suggestedValue: approvalReasonSuggestion(
          rejectedReasons.filter((reason) => ['tone', 'brand'].includes(String(reason.category))),
          'Avoid content that reviewers mark as too formal or off-brand.'
        ),
        reason: 'Based on structured rejection reasons from approvals.',
        evidence: approvalReasonEvidence(rejectedReasons),
        confidence: 0.72,
      });
    }
    if (rejectionCategories.has('cta')) {
      suggestions.push({
        field: 'do_rules',
        operation: 'append',
        suggestedValue: 'Use a clear, specific CTA before sending content for approval.',
        reason: 'Reviewers rejected recent content for weak calls to action.',
        evidence: approvalReasonEvidence(rejectedReasons.filter((reason) => reason.category === 'cta')),
        confidence: 0.72,
      });
    }
    if (rejectionCategories.has('audience')) {
      suggestions.push({
        field: 'audience',
        operation: 'append',
        suggestedValue: approvalReasonSuggestion(
          rejectedReasons.filter((reason) => reason.category === 'audience'),
          'Re-align drafts with the intended audience before approval.'
        ),
        reason: 'Reviewers flagged audience mismatch during approval.',
        evidence: approvalReasonEvidence(rejectedReasons.filter((reason) => reason.category === 'audience')),
        confidence: 0.68,
      });
    }
    if (rejectionCategories.has('length') || rejectionCategories.has('offer')) {
      suggestions.push({
        field: 'do_rules',
        operation: 'append',
        suggestedValue: approvalReasonSuggestion(
          rejectedReasons.filter((reason) => ['length', 'offer'].includes(String(reason.category))),
          'Keep captions concise and connect the post clearly to the product or offer.'
        ),
        reason: 'Reviewers flagged length or product focus in recent approvals.',
        evidence: approvalReasonEvidence(rejectedReasons),
        confidence: 0.7,
      });
    }
    if (rejectionCategories.has('platform') || rejectionCategories.has('media') || rejectionCategories.has('safety')) {
      suggestions.push({
        field: 'platform_preferences',
        operation: 'append',
        suggestedValue: {
          approval_review:
            'Before approval, check platform fit, media requirements, and risky claims for each selected channel.',
        },
        reason: 'Structured approval reasons show platform, media, or safety review issues.',
        evidence: approvalReasonEvidence(rejectedReasons),
        confidence: 0.66,
      });
    }
  }

  if (approvedComments.length > 0) {
    suggestions.push({
      field: 'do_rules',
      operation: 'append',
      suggestedValue: summarizePreference(approvedComments, 'Preserve patterns repeatedly approved by reviewers.'),
      reason: 'Based on recent approval comments.',
      evidence: approvedComments.slice(0, 5),
    });
  }

  if (approvedReasons.length > 0) {
    suggestions.push({
      field: 'do_rules',
      operation: 'append',
      suggestedValue: approvalReasonSuggestion(
        approvedReasons,
        'Preserve patterns reviewers approve, especially brand fit, hook quality, CTA clarity, and audience match.'
      ),
      reason: 'Based on structured approval reasons from accepted content.',
      evidence: approvalReasonEvidence(approvedReasons),
      confidence: approvalCategories.size > 1 ? 0.74 : 0.66,
    });
  }

  if (brandProfile.content_pillars.length < 3 && topPillars.length > 0) {
    suggestions.push({
      field: 'content_pillars',
      operation: 'append_many',
      suggestedValue: topPillars.slice(0, 3),
      reason: 'High-performing posts are forming repeatable content themes.',
      evidence: topPillars.slice(0, 5),
    });
  }

  let brandLearnerModelRunId: string | undefined;
  try {
    const generated = await generateWorkerJson(supabase, {
      workspaceId: task.workspace_id,
      taskId: task.id,
      agentType: 'brand_learner',
      promptVersion: 'brand-learner-v1',
      system: workerSystemPrompt('Brand Learner'),
      user: [
        'Infer Brand Brain update suggestions from approvals, rejections, content classifications, and outcomes.',
        'Only suggest updates that are useful to a social media manager and supported by evidence.',
        'Return JSON with a suggestions array. Each suggestion must include field, operation, suggestedValue, reason, evidence, confidence.',
        'Allowed fields: voice, audience, products_offers, content_pillars, competitors, do_rules, dont_rules, approved_examples, rejected_examples, platform_preferences.',
        '',
        `Current Brand Brain: ${compactJson(brandProfile, 3000)}`,
        `Approval signals: ${compactJson(approvals.slice(0, 25), 5000)}`,
        `Structured approval reasons: ${compactJson({
          approvedReasons: approvedReasons.slice(0, 20),
          rejectedReasons: rejectedReasons.slice(0, 20),
        }, 5000)}`,
        `Content features: ${compactJson(features.slice(0, 50), 5000)}`,
        `Post outcomes: ${compactJson(outcomes.slice(0, 20), 4000)}`,
      ].join('\n'),
      schema: brandLearnerSchema,
      maxTokens: 1500,
      temperature: 0.25,
      inputPayload: {
        approvalSignals: approvals.length,
        structuredApprovalReasons: approvedReasons.length + rejectedReasons.length,
        featureSnapshots: features.length,
        outcomeSummaries: outcomes.length,
      },
      entityType: 'agent_task',
      entityId: task.id,
    });
    brandLearnerModelRunId = generated.modelRunId;
    brandLearnerSchema.parse(generated.data).suggestions.forEach((suggestion) => {
      suggestions.push({
        ...suggestion,
        aiGenerated: true,
        modelRunId: generated.modelRunId || null,
      });
    });
  } catch (aiError) {
    console.warn('[AgentTasks] Brand learner AI fallback:', aiError);
  }

  if (suggestions.length === 0) {
    return { message: 'No strong Brand Brain suggestions yet', skipped: true };
  }

  const rows = suggestions.map((suggestion) => ({
    workspace_id: task.workspace_id,
    task_id: task.id,
    artifact_type: 'brand_suggestion',
    title: `Brand Brain suggestion: ${humanize(String(suggestion.field))}`,
    summary: suggestion.reason,
    confidence: Number(suggestion.confidence || 0.68),
    status: 'active',
    payload: {
      ...suggestion,
      modelRunId: suggestion.modelRunId || brandLearnerModelRunId || null,
    },
    source_data: {
      dedupeKey: `brand:${String(suggestion.field)}:${hashInput({
        value: suggestion.suggestedValue,
        reason: suggestion.reason,
      })}`,
      approvals: approvals.length,
      structuredReasons: approvedReasons.length + rejectedReasons.length,
      features: features.length,
      outcomes: outcomes.length,
    },
  }));

  const result = await upsertAgentArtifacts(supabase, rows);

  return {
    message: result.created ? 'Brand suggestions created' : 'Brand suggestions refreshed',
    artifactsCreated: result.created,
    artifactsReused: result.reused,
  };
}

async function processBestTime(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const { data: outcomes, error: outcomesError } = await supabase
    .from('post_outcome_summaries')
    .select('post_id, platform, score')
    .eq('workspace_id', task.workspace_id)
    .order('generated_at', { ascending: false })
    .limit(100);
  if (outcomesError) throw new Error(outcomesError.message);

  const postIds = Array.from(new Set((outcomes || []).map((row: any) => row.post_id).filter(Boolean)));
  if (postIds.length === 0) {
    return { message: 'No published outcome data available for best-time analysis', skipped: true };
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, published_at, scheduled_at, created_at')
    .eq('workspace_id', task.workspace_id)
    .in('id', postIds);
  if (postsError) throw new Error(postsError.message);

  const postsById = new Map((posts || []).map((post: any) => [post.id, post]));
  const platformHours = new Map<string, Array<{ hour: number; score: number }>>();

  (outcomes || []).forEach((outcome: any) => {
    const post = postsById.get(outcome.post_id);
    const date = new Date(post?.published_at || post?.scheduled_at || post?.created_at || '');
    if (Number.isNaN(date.getTime())) return;
    const list = platformHours.get(outcome.platform) || [];
    list.push({ hour: date.getHours(), score: Number(outcome.score || 0) });
    platformHours.set(outcome.platform, list);
  });

  const recommendations = Array.from(platformHours.entries()).map(([platform, values]) => {
    const byHour = new Map<number, { total: number; count: number }>();
    values.forEach((value) => {
      const current = byHour.get(value.hour) || { total: 0, count: 0 };
      current.total += value.score;
      current.count += 1;
      byHour.set(value.hour, current);
    });
    const best = Array.from(byHour.entries()).sort(
      (a, b) => b[1].total / b[1].count - a[1].total / a[1].count
    )[0];
    return {
      platform,
      hour: best?.[0] ?? 10,
      averageScore: best ? Math.round(best[1].total / best[1].count) : 0,
      sampleSize: values.length,
    };
  });

  const result = await upsertAgentArtifact(supabase, {
    workspace_id: task.workspace_id,
    task_id: task.id,
    artifact_type: 'best_time_recommendation',
    title: 'Best posting windows',
    summary: 'Xocial found platform-specific time windows from your published post outcomes.',
    confidence: Math.min(0.85, 0.35 + postIds.length * 0.03),
    status: 'active',
    payload: { recommendations },
    source_data: {
      dedupeKey: `best-time:${hashInput(recommendations)}`,
      outcomeCount: outcomes?.length || 0,
    },
  });

  return {
    message: result.created ? 'Best-time recommendations created' : 'Best-time recommendations refreshed',
    artifactsCreated: result.created ? 1 : 0,
  };
}

async function processStrategyPlanner(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const context = await buildIntelligenceContext(supabase, {
    workspaceId: task.workspace_id,
    selectedPlatforms: normalizePlatforms(task.input_payload?.platforms),
    campaignGoal: typeof task.input_payload?.campaignGoal === 'string' ? task.input_payload.campaignGoal : undefined,
  });
  const { data: recentArtifacts } = await supabase
    .from('agent_artifacts')
    .select('artifact_type, title, summary, payload, confidence, created_at')
    .eq('workspace_id', task.workspace_id)
    .in('artifact_type', ['performance_insight', 'best_time_recommendation', 'brand_suggestion'])
    .in('status', ['active', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(10);

  let aiPlan: z.output<typeof strategyPlannerSchema> | null = null;
  let modelRunId: string | undefined;
  try {
    const generated = await generateWorkerJson(supabase, {
      workspaceId: task.workspace_id,
      taskId: task.id,
      agentType: 'strategy_planner',
      promptVersion: 'strategy-planner-v1',
      system: workerSystemPrompt('Strategy Planner'),
      user: [
        'Create a practical weekly social media strategy plan for Xocial.',
        'Use Brand Brain, outcomes, recent artifacts, and selected platforms.',
        'Return JSON with recommendations array. Each recommendation needs type, title, description, priority, confidence_score, action_items, metrics.',
        'Recommendations must be specific enough to apply in Calendar or Create.',
        '',
        `Intelligence context: ${compactJson(context, 9000)}`,
        `Recent worker artifacts: ${compactJson(recentArtifacts || [], 5000)}`,
      ].join('\n'),
      schema: strategyPlannerSchema,
      maxTokens: 1800,
      temperature: 0.35,
      inputPayload: {
        selectedPlatforms: context.selectedPlatforms,
        campaignGoal: context.campaignGoal || null,
        artifactCount: recentArtifacts?.length || 0,
      },
      entityType: 'agent_task',
      entityId: task.id,
    });
    aiPlan = strategyPlannerSchema.parse(generated.data);
    modelRunId = generated.modelRunId;
  } catch (aiError) {
    console.warn('[AgentTasks] Strategy planner AI fallback:', aiError);
  }

  const fallbackRecommendations = [
    {
      workspace_id: task.workspace_id,
      type: 'content',
      title: 'Build next week around your strongest content pillars',
      description:
        context.contentPillars.length > 0
          ? `Prioritize ${context.contentPillars.slice(0, 3).join(', ')} and adapt each idea per platform.`
          : 'Add content pillars to Brand Brain, then generate a weekly plan from those themes.',
      priority: context.contentPillars.length > 0 ? 'high' : 'medium',
      confidence_score: context.contentPillars.length > 0 ? 0.74 : 0.5,
      action_items: [
        'Create 3 pillar-led post drafts.',
        'Adapt each draft into platform-specific previews.',
        'Schedule the strongest posts into open calendar slots.',
      ],
      metrics: {
        brandCompletion: context.brandProfile.confidence_score || 0,
        outcomeSignals: Object.keys(context.currentPerformanceSummary || {}).length,
      },
      status: 'pending',
    },
    {
      workspace_id: task.workspace_id,
      type: 'timing',
      title: 'Use measured best-time windows before adding more volume',
      description:
        'Run Best-Time Analysis after each analytics sync, then place high-value posts into the strongest platform windows.',
      priority: 'medium',
      confidence_score: 0.62,
      action_items: ['Run Best-Time Analysis.', 'Apply slots in Calendar.', 'Compare outcomes after 24 hours.'],
      metrics: {},
      status: 'pending',
    },
  ];
  const sourceRecommendations = aiPlan?.recommendations?.length
    ? aiPlan.recommendations
    : fallbackRecommendations;
  const recommendations = sourceRecommendations.slice(0, 8).map((recommendation: any) => ({
    workspace_id: task.workspace_id,
    type: recommendation.type || 'content',
    title: recommendation.title,
    description: recommendation.description,
    priority: recommendation.priority || 'medium',
    confidence_score: Number(recommendation.confidence_score || 0.62),
    action_items: Array.isArray(recommendation.action_items) ? recommendation.action_items : [],
    metrics: {
      ...(asRecord(recommendation.metrics)),
      aiGenerated: Boolean(aiPlan),
      modelRunId: modelRunId || null,
    },
    status: 'pending',
  }));

  const result = await insertUniqueStrategyRecommendations(supabase, recommendations);

  return {
    message: result.created ? 'Strategy recommendations created' : 'Strategy recommendations refreshed',
    recommendationsCreated: result.created,
    recommendationsReused: result.reused,
  };
}

async function processSafety(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const post = await fetchPost(supabase, task);
  if (!post) return { message: 'Post not found; safety skipped', skipped: true };

  const brandProfile = await getBrandProfile(supabase, task.workspace_id);
  const platforms = normalizePlatforms(post.platforms);
  const text = platforms.map((platform) => extractText(post.content, platform)).join('\n');
  const lower = text.toLowerCase();
  const blockers = brandProfile.dont_rules.filter((rule) => lower.includes(rule.toLowerCase()));
  const riskyClaims = /\bguaranteed|cure|risk-free|100%|instant results\b/i.test(text);

  if (blockers.length === 0 && !riskyClaims) {
    return { message: 'No safety concerns detected', skipped: true };
  }

  const result = await upsertAgentArtifact(supabase, {
    workspace_id: task.workspace_id,
    task_id: task.id,
    artifact_type: 'safety_warning',
    title: 'Content safety warning',
    summary: riskyClaims
      ? 'This post may contain risky or absolute claims.'
      : 'This post appears to match a Brand Brain do-not rule.',
    confidence: 0.72,
    status: 'active',
    payload: { blockers, riskyClaims, platforms },
    source_data: {
      dedupeKey: `safety:${post.id}:${hashInput({ blockers, riskyClaims, platforms })}`,
      postId: post.id,
    },
  });

  return {
    message: result.created ? 'Safety warning created' : 'Safety warning refreshed',
    artifactsCreated: result.created ? 1 : 0,
  };
}

async function processReporting(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const [brandProfile, outcomes, events, artifacts, recommendations] = await Promise.all([
    getBrandProfile(supabase, task.workspace_id),
    supabase
      .from('post_outcome_summaries')
      .select('*')
      .eq('workspace_id', task.workspace_id)
      .order('generated_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('learning_events')
      .select('*')
      .eq('workspace_id', task.workspace_id)
      .order('occurred_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('agent_artifacts')
      .select('artifact_type, title, summary, payload, confidence, status, created_at')
      .eq('workspace_id', task.workspace_id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('strategy_recommendations')
      .select('type, title, description, priority, confidence_score, action_items, status, created_at')
      .eq('workspace_id', task.workspace_id)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data, error }) => (error ? [] : data || [])),
  ]);
  const avgScore =
    outcomes.length > 0
      ? outcomes.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / outcomes.length
      : 0;
  let report: z.output<typeof reportingSchema> | null = null;
  let modelRunId: string | undefined;
  try {
    const generated = await generateWorkerJson(supabase, {
      workspaceId: task.workspace_id,
      taskId: task.id,
      agentType: 'reporting',
      promptVersion: 'reporting-v1',
      system: workerSystemPrompt('Agency Reporting Analyst'),
      user: [
        'Create a concise weekly social media report for an agency/client.',
        'Return JSON with title, summary, executive_summary, wins, issues, next_actions, client_notes.',
        'Mention only evidence from the supplied data.',
        '',
        `Brand Brain: ${compactJson(brandProfile, 2500)}`,
        `Outcome summaries: ${compactJson(outcomes.slice(0, 30), 6000)}`,
        `Learning events: ${compactJson(events.slice(0, 35), 5000)}`,
        `Worker artifacts: ${compactJson(artifacts.slice(0, 12), 5000)}`,
        `Strategy recommendations: ${compactJson(recommendations.slice(0, 10), 5000)}`,
      ].join('\n'),
      schema: reportingSchema,
      maxTokens: 1600,
      temperature: 0.3,
      inputPayload: {
        outcomeCount: outcomes.length,
        learningEventCount: events.length,
        artifactCount: artifacts.length,
        recommendationCount: recommendations.length,
      },
      entityType: 'agent_task',
      entityId: task.id,
    });
    report = reportingSchema.parse(generated.data);
    modelRunId = generated.modelRunId;
  } catch (aiError) {
    console.warn('[AgentTasks] Reporting AI fallback:', aiError);
  }

  const result = await upsertAgentArtifact(supabase, {
    workspace_id: task.workspace_id,
    task_id: task.id,
    artifact_type: 'weekly_report',
    title: report?.title || 'Weekly AI report',
    summary:
      report?.summary ||
      `${outcomes.length} outcome summaries and ${events.length} learning signals reviewed. Average performance score: ${Math.round(avgScore)}.`,
    confidence: outcomes.length > 0 ? 0.7 : 0.45,
    status: 'active',
    payload: {
      aiGenerated: Boolean(report),
      modelRunId: modelRunId || null,
      outcomeCount: outcomes.length,
      learningEventCount: events.length,
      averageScore: Math.round(avgScore),
      executiveSummary:
        report?.executive_summary ||
        `${outcomes.length} outcomes and ${events.length} learning signals were reviewed.`,
      wins: report?.wins || [],
      issues: report?.issues || [],
      nextActions:
        report?.next_actions?.length
          ? report.next_actions
          : [
              'Review performance insights.',
              'Accept or ignore Brand Brain suggestions.',
              'Use Calendar to schedule the next strategy recommendation.',
            ],
      clientNotes: report?.client_notes || [],
    },
    source_data: {
      dedupeKey: `weekly-report:${new Date().toISOString().slice(0, 10)}:${hashInput({
        outcomes: outcomes.length,
        events: events.length,
        recommendations: recommendations.length,
      })}`,
      outcomeCount: outcomes.length,
      learningEventCount: events.length,
      artifactCount: artifacts.length,
      recommendationCount: recommendations.length,
    },
  });

  return {
    message: result.created ? 'Report artifact created' : 'Report artifact refreshed',
    artifactsCreated: result.created ? 1 : 0,
  };
}

async function processContentAdaptation(
  supabase: SupabaseClient,
  task: AgentTaskRow
): Promise<ProcessorResult> {
  const post = await fetchPost(supabase, task);
  if (!post) return { message: 'Post not found; content adaptation skipped', skipped: true };
  await queuePostIntelligenceTasks(supabase, {
    workspaceId: task.workspace_id,
    postId: post.id,
    platforms: normalizePlatforms(post.platforms),
    reason: 'content_adaptation_requested',
  });
  return { message: 'Adaptation support tasks queued', rowsWritten: 2 };
}

function mode(values: string[]) {
  return modeList(values)[0] || null;
}

function modeList(values: string[]) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

function summarizePreference(comments: string[], fallback: string) {
  const joined = comments.join(' ').toLowerCase();
  if (joined.includes('formal')) return 'Avoid copy that feels too formal for this brand.';
  if (joined.includes('long')) return 'Keep captions tighter unless extra detail is clearly needed.';
  if (joined.includes('cta')) return 'Use a clearer CTA before sending content for approval.';
  if (joined.includes('product')) return 'Connect content more clearly to the product or offer.';
  if (joined.includes('audience')) return 'Make audience fit explicit before publishing.';
  if (joined.includes('brand')) return 'Check brand voice before review.';
  return fallback;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
