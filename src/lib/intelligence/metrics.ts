import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/types';
import { enqueueAgentTask } from './tasks';
import { recordLearningEvent } from './learning';

type MetricInput = {
  workspaceId: string;
  postId?: string | null;
  platformPostId?: string | null;
  socialAccountId?: string | null;
  platform: Platform | string;
  metrics: Record<string, any>;
  raw?: Record<string, any>;
};

function toNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getWriteClient(fallback: SupabaseClient) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return fallback;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function standardizeMetrics(metrics: Record<string, any>) {
  const views = toNumber(metrics.views ?? metrics.video_views ?? metrics.videoViews);
  const impressions = toNumber(metrics.impressions ?? views);
  const reach = toNumber(metrics.reach ?? views ?? impressions);
  const likes = toNumber(metrics.likes);
  const comments = toNumber(metrics.comments);
  const saves = toNumber(metrics.saves);
  const shares = toNumber(metrics.shares);
  const clicks = toNumber(metrics.clicks);
  const watchTimeSeconds = toNumber(
    metrics.watch_time_seconds ?? metrics.watchTimeSeconds ?? metrics.watch_time
  );
  const followerDelta = toNumber(metrics.follower_delta ?? metrics.followers_gain);

  return {
    views: views || impressions || reach,
    reach,
    impressions,
    likes,
    comments,
    saves,
    shares,
    clicks,
    watch_time_seconds: watchTimeSeconds,
    follower_delta: followerDelta,
  };
}

function scoreMetrics(metrics: ReturnType<typeof standardizeMetrics>) {
  const exposure = Math.max(metrics.views, metrics.reach, metrics.impressions);
  const engagement =
    metrics.likes + metrics.comments * 2 + metrics.shares * 3 + metrics.saves * 2 + metrics.clicks;
  const engagementRate = exposure > 0 ? (engagement / exposure) * 100 : 0;
  const scaleScore = exposure > 0 ? Math.log10(exposure + 1) * 14 : 0;
  const interactionScore = engagementRate * 9;
  const commentBonus = Math.min(12, metrics.comments * 1.5);
  const saveShareBonus = Math.min(16, (metrics.saves + metrics.shares) * 2);

  return clamp(Math.round(scaleScore + interactionScore + commentBonus + saveShareBonus));
}

async function getBaseline(
  supabase: SupabaseClient,
  workspaceId: string,
  platform: string,
  postId?: string | null
) {
  let query = supabase
    .from('post_outcome_summaries')
    .select('score')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .order('generated_at', { ascending: false })
    .limit(30);

  if (postId) {
    query = query.neq('post_id', postId);
  }

  const { data } = await query;
  const scores = (data || []).map((row: any) => Number(row.score || 0)).filter(Number.isFinite);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function explainOutcome(score: number, baseline: number, metrics: ReturnType<typeof standardizeMetrics>) {
  const exposure = Math.max(metrics.views, metrics.reach, metrics.impressions);
  const engagement = metrics.likes + metrics.comments + metrics.shares + metrics.saves + metrics.clicks;
  if (baseline > 0 && score >= baseline + 12) {
    return `Outperforming baseline by ${score - baseline} points with ${engagement} engagements on ${exposure} views/reach.`;
  }
  if (baseline > 0 && score <= baseline - 12) {
    return `Under baseline by ${baseline - score} points; review hook, CTA, media fit, or posting time.`;
  }
  if (score >= 70) {
    return `Strong normalized performance with ${engagement} engagements on ${exposure} views/reach.`;
  }
  if (score <= 35) {
    return 'Weak early signal; use this as negative learning for future hooks, timing, or platform fit.';
  }
  return `Average platform result with ${engagement} engagements on ${exposure} views/reach.`;
}

export async function recordMetricSnapshotAndOutcome(
  supabase: SupabaseClient,
  input: MetricInput
) {
  const writeClient = getWriteClient(supabase);
  const metrics = standardizeMetrics(input.metrics || {});
  const syncedAt = new Date().toISOString();

  const { error: snapshotError } = await writeClient.from('platform_metric_snapshots').insert({
    workspace_id: input.workspaceId,
    post_id: input.postId || null,
    platform_post_id: input.platformPostId || null,
    social_account_id: input.socialAccountId || null,
    platform: input.platform,
    ...metrics,
    raw: input.raw || input.metrics || {},
    synced_at: syncedAt,
  });

  if (snapshotError) {
    console.warn('[IntelligenceMetrics] Failed to write metric snapshot:', snapshotError.message);
  }

  if (!input.postId) {
    return { snapshotWritten: !snapshotError, outcomeWritten: false };
  }

  const score = scoreMetrics(metrics);
  const baseline = await getBaseline(writeClient, input.workspaceId, String(input.platform), input.postId);
  const confidence = clamp(
    0.35 +
      Math.min(0.35, Math.max(metrics.views, metrics.reach, metrics.impressions) / 10000) +
      Math.min(0.2, (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / 100),
    0,
    0.9
  );

  const { error: outcomeError } = await writeClient.from('post_outcome_summaries').upsert(
    {
      workspace_id: input.workspaceId,
      post_id: input.postId,
      platform: input.platform,
      score,
      baseline_score: baseline,
      day_score: score,
      seven_day_score: score,
      confidence,
      reason_summary: explainOutcome(score, baseline, metrics),
      metrics,
      generated_at: syncedAt,
    },
    { onConflict: 'post_id,platform' }
  );

  if (outcomeError) {
    console.warn('[IntelligenceMetrics] Failed to write outcome summary:', outcomeError.message);
  }

  await recordLearningEvent(writeClient, {
    workspaceId: input.workspaceId,
    source: 'analytics_sync',
    eventType: 'metric_synced',
    entityType: 'post',
    entityId: input.postId,
    platform: String(input.platform),
    signalStrength: confidence,
    metadata: {
      platformPostId: input.platformPostId,
      score,
      baseline,
      metrics,
    },
  });

  await enqueueAgentTask(writeClient, {
    workspaceId: input.workspaceId,
    agentType: 'performance_analyst',
    entityType: 'post',
    entityId: input.postId,
    priority: 4,
    inputPayload: {
      platform: input.platform,
      score,
      trigger: 'metric_synced',
    },
  });

  return {
    snapshotWritten: !snapshotError,
    outcomeWritten: !outcomeError,
    score,
    baseline,
  };
}
