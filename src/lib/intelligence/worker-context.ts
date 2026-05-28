import type { SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/types';
import type { AIContextPacket } from '@/types/intelligence';
import { buildAIContextPacket } from './context';

export const WORKER_INTELLIGENCE_VERSION = 'worker-v2';
export const WORKER_SCHEMA_VERSION = 2;

export type WorkerDataCoverage = {
  brandProfile: {
    available: boolean;
    completion: number;
  };
  contextSources: string[];
  outcomeSummaries: number;
  metricSnapshots: number;
  contentFeatures: number;
  approvalSignals: number;
  workerArtifacts: number;
  strategyRecommendations: number;
  learningEvents: number;
};

export type WorkerIntelligenceContext = {
  aiContextPacket: AIContextPacket;
  outcomeSummaries: any[];
  metricSnapshots: any[];
  contentFeatures: any[];
  approvalSignals: any[];
  workerArtifacts: any[];
  strategyRecommendations: any[];
  learningEvents: any[];
  dataCoverage: WorkerDataCoverage;
  dataCaveats: string[];
};

type ConfidenceBreakdown = {
  score: number;
  brandMemory: number;
  performanceData: number;
  approvalLearning: number;
  contentClassification: number;
  recentActivity: number;
  caveatPenalty: number;
};

function compactJson(value: unknown, maxLength = 6000) {
  return JSON.stringify(value, null, 2).slice(0, maxLength);
}

function truncate(value: unknown, maxLength = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

async function safeQuery<T = any>(query: PromiseLike<{ data?: T[] | null; error?: any }>) {
  try {
    const { data, error } = await query;
    if (error) {
      const message = String(error?.message || '');
      if (!message.includes('Could not find') && error?.code !== '42P01' && error?.code !== 'PGRST205') {
        console.warn('[WorkerContext] Optional context query failed:', message);
      }
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(
      '[WorkerContext] Optional context query failed:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

export async function buildWorkerIntelligenceContext(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    selectedPlatforms?: Platform[];
    campaignGoal?: string;
    contentPillar?: string;
    query?: string;
  }
): Promise<WorkerIntelligenceContext> {
  const aiContextPacket = await buildAIContextPacket(supabase, input);

  const [
    outcomeSummaries,
    metricSnapshots,
    contentFeatures,
    approvalSignals,
    workerArtifacts,
    strategyRecommendations,
    learningEvents,
  ] = await Promise.all([
    safeQuery(
      supabase
        .from('post_outcome_summaries')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('generated_at', { ascending: false })
        .limit(80)
    ),
    safeQuery(
      supabase
        .from('platform_metric_snapshots')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('synced_at', { ascending: false })
        .limit(120)
    ),
    safeQuery(
      supabase
        .from('content_feature_snapshots')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })
        .limit(120)
    ),
    safeQuery(
      supabase
        .from('approval_learning_signals')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })
        .limit(60)
    ),
    safeQuery(
      supabase
        .from('agent_artifacts')
        .select('artifact_type, title, summary, payload, confidence, status, created_at')
        .eq('workspace_id', input.workspaceId)
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(30)
    ),
    safeQuery(
      supabase
        .from('strategy_recommendations')
        .select('type, title, description, priority, confidence_score, action_items, metrics, status, created_at')
        .eq('workspace_id', input.workspaceId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(30)
    ),
    safeQuery(
      supabase
        .from('learning_events')
        .select('event_type, entity_type, entity_id, platform, signal_strength, metadata, occurred_at')
        .eq('workspace_id', input.workspaceId)
        .order('occurred_at', { ascending: false })
        .limit(100)
    ),
  ]);

  const brandCompletion = Number(aiContextPacket.contextMetadata.brandCompletion || 0);
  const dataCoverage: WorkerDataCoverage = {
    brandProfile: {
      available: brandCompletion > 0 || aiContextPacket.contextMetadata.contextSources.includes('brand_profile'),
      completion: brandCompletion,
    },
    contextSources: aiContextPacket.contextMetadata.contextSources,
    outcomeSummaries: outcomeSummaries.length,
    metricSnapshots: metricSnapshots.length,
    contentFeatures: contentFeatures.length,
    approvalSignals: approvalSignals.length,
    workerArtifacts: workerArtifacts.length,
    strategyRecommendations: strategyRecommendations.length,
    learningEvents: learningEvents.length,
  };

  return {
    aiContextPacket,
    outcomeSummaries,
    metricSnapshots,
    contentFeatures,
    approvalSignals,
    workerArtifacts,
    strategyRecommendations,
    learningEvents,
    dataCoverage,
    dataCaveats: buildDataCaveats(dataCoverage),
  };
}

export function buildDataCaveats(coverage: WorkerDataCoverage) {
  const caveats: string[] = [];

  if (!coverage.brandProfile.available || coverage.brandProfile.completion < 35) {
    caveats.push('Brand Brain is sparse, so brand-fit conclusions need reviewer confirmation.');
  }
  if (coverage.outcomeSummaries < 5) {
    caveats.push('Fewer than five normalized outcome summaries are available.');
  }
  if (coverage.metricSnapshots < 5) {
    caveats.push('Metric snapshot history is limited.');
  }
  if (coverage.contentFeatures < 5) {
    caveats.push('Content classification history is limited.');
  }
  if (coverage.approvalSignals < 3) {
    caveats.push('Approval learning signals are limited.');
  }

  return caveats;
}

export function buildWorkerSystemPrompt(agentName: string, responsibilities: string[] = []) {
  return [
    `You are ${agentName}, a specialist worker inside Xocial AI ${WORKER_INTELLIGENCE_VERSION}.`,
    'Use only the supplied workspace data. Do not invent metrics, posts, accounts, or client preferences.',
    'Return one valid JSON object matching the requested schema and no surrounding commentary.',
    'Every recommendation must include practical evidence, confidence, and a clear reason a social media manager can act on.',
    'If evidence is weak, lower confidence and state what data would improve the decision.',
    'Prefer specific platform, hook, CTA, pillar, timing, media, and approval patterns over generic marketing advice.',
    ...responsibilities,
  ].join('\n');
}

export function formatWorkerContextForPrompt(context: WorkerIntelligenceContext, maxLength = 14000) {
  const sections = [
    'XOCIAL WORKER CONTEXT',
    `Worker version: ${WORKER_INTELLIGENCE_VERSION}`,
    `Schema version: ${WORKER_SCHEMA_VERSION}`,
    `Data coverage: ${compactJson(context.dataCoverage, 1800)}`,
    context.dataCaveats.length
      ? `Data caveats:\n${context.dataCaveats.map((item) => `- ${item}`).join('\n')}`
      : 'Data caveats: none detected',
    '',
    context.aiContextPacket.promptContext,
    '',
    `Recent outcomes: ${compactJson(context.outcomeSummaries.slice(0, 35), 5000)}`,
    `Metric snapshots: ${compactJson(context.metricSnapshots.slice(0, 35), 5000)}`,
    `Content features: ${compactJson(context.contentFeatures.slice(0, 45), 5000)}`,
    `Approval signals: ${compactJson(context.approvalSignals.slice(0, 30), 4000)}`,
    `Recent worker artifacts: ${compactJson(context.workerArtifacts.slice(0, 15), 4000)}`,
    `Active strategy recommendations: ${compactJson(context.strategyRecommendations.slice(0, 15), 4000)}`,
    `Recent learning events: ${compactJson(context.learningEvents.slice(0, 35), 4000)}`,
  ].join('\n');

  return sections.slice(0, maxLength);
}

export function buildWorkerUserPrompt(input: {
  objective: string;
  outputContract: string;
  context: WorkerIntelligenceContext;
  sections?: Array<{ title: string; value: unknown; maxLength?: number }>;
}) {
  const customSections = (input.sections || [])
    .map((section) => `${section.title}: ${compactJson(section.value, section.maxLength || 4000)}`)
    .join('\n');

  return [
    `Objective: ${input.objective}`,
    `Required output: ${input.outputContract}`,
    '',
    formatWorkerContextForPrompt(input.context),
    customSections ? `\nTASK-SPECIFIC DATA\n${customSections}` : '',
  ].join('\n');
}

export function estimateWorkerConfidence(
  context: WorkerIntelligenceContext,
  options: { base?: number; aiGenerated?: boolean } = {}
): ConfidenceBreakdown {
  const coverage = context.dataCoverage;
  const brandMemory = clamp(coverage.brandProfile.completion / 100);
  const performanceData = clamp((coverage.outcomeSummaries + coverage.metricSnapshots) / 80);
  const approvalLearning = clamp(coverage.approvalSignals / 20);
  const contentClassification = clamp(coverage.contentFeatures / 50);
  const recentActivity = clamp((coverage.workerArtifacts + coverage.strategyRecommendations + coverage.learningEvents) / 80);
  const caveatPenalty = clamp(context.dataCaveats.length * 0.04, 0, 0.2);
  const base = options.base ?? 0.35;
  const aiBoost = options.aiGenerated ? 0.03 : 0;
  const score = clamp(
    base +
      brandMemory * 0.12 +
      performanceData * 0.18 +
      approvalLearning * 0.12 +
      contentClassification * 0.12 +
      recentActivity * 0.08 +
      aiBoost -
      caveatPenalty,
    0.2,
    0.92
  );

  return {
    score: Number(score.toFixed(2)),
    brandMemory: Number(brandMemory.toFixed(2)),
    performanceData: Number(performanceData.toFixed(2)),
    approvalLearning: Number(approvalLearning.toFixed(2)),
    contentClassification: Number(contentClassification.toFixed(2)),
    recentActivity: Number(recentActivity.toFixed(2)),
    caveatPenalty: Number(caveatPenalty.toFixed(2)),
  };
}

export function evidenceFromRows<T>(
  rows: T[],
  mapper: (row: T) => string | null | undefined,
  limit = 5
) {
  return rows
    .map(mapper)
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => truncate(value, 260))
    .slice(0, limit);
}

export function buildWorkerMetadata(input: {
  promptVersion: string;
  context: WorkerIntelligenceContext;
  aiGenerated: boolean;
  modelRunId?: string | null;
  confidenceBreakdown?: ConfidenceBreakdown;
  evidence?: string[];
  reasoningSummary?: string;
}) {
  const confidenceBreakdown =
    input.confidenceBreakdown ||
    estimateWorkerConfidence(input.context, { aiGenerated: input.aiGenerated });
  const evidence = input.evidence || [];
  const quality = {
    hasEvidence: evidence.length > 0,
    evidenceCount: evidence.length,
    hasReasoning: Boolean(input.reasoningSummary),
    caveatCount: input.context.dataCaveats.length,
    confidenceScore: confidenceBreakdown.score,
    contextSourceCount: input.context.aiContextPacket.contextMetadata.contextSources.length,
    workerVersion: WORKER_INTELLIGENCE_VERSION,
  };

  return {
    workerVersion: WORKER_INTELLIGENCE_VERSION,
    schemaVersion: WORKER_SCHEMA_VERSION,
    promptVersion: input.promptVersion,
    aiGenerated: input.aiGenerated,
    modelRunId: input.modelRunId || null,
    dataCoverage: input.context.dataCoverage,
    dataCaveats: input.context.dataCaveats,
    confidenceBreakdown,
    evidence,
    quality,
    reasoningSummary:
      input.reasoningSummary ||
      (input.context.dataCaveats.length
        ? `Recommendation is based on available workspace data with ${input.context.dataCaveats.length} caveat(s).`
        : 'Recommendation is based on available workspace memory, outcomes, and learning signals.'),
  };
}
