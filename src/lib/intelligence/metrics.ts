import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/types';
import { enqueueAgentTask } from './tasks';
import { buildLearningEventKey, recordLearningEvent } from './learning';
import {
  explainPlatformOutcome,
  scorePlatformMetrics,
  standardizePlatformMetrics,
  type StandardizedPlatformMetrics,
} from './platform-metrics';

type MetricInput = {
  workspaceId: string;
  postId?: string | null;
  platformPostId?: string | null;
  socialAccountId?: string | null;
  platform: Platform | string;
  metrics: Record<string, any>;
  raw?: Record<string, any>;
  publishedAt?: string | null;
  platformPostPublishedAt?: string | null;
  syncSource?: string;
};

type StandardizedMetrics = StandardizedPlatformMetrics;

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

function scoreSnapshot(snapshot: any) {
  return scorePlatformMetrics(snapshot.platform || 'default', {
    views: toNumber(snapshot.views),
    reach: toNumber(snapshot.reach),
    impressions: toNumber(snapshot.impressions),
    likes: toNumber(snapshot.likes),
    comments: toNumber(snapshot.comments),
    saves: toNumber(snapshot.saves),
    shares: toNumber(snapshot.shares),
    clicks: toNumber(snapshot.clicks),
    watch_time_seconds: toNumber(snapshot.watch_time_seconds),
    follower_delta: toNumber(snapshot.follower_delta),
    engagement: toNumber(snapshot.engagement),
    engagement_rate: toNumber(snapshot.engagement_rate),
    platformWeights: {},
  });
}

function ageHours(publishedAt: string | null | undefined, syncedAt: string) {
  if (!publishedAt) return null;
  const published = new Date(publishedAt).getTime();
  const synced = new Date(syncedAt).getTime();
  if (!Number.isFinite(published) || !Number.isFinite(synced)) return null;
  return Math.max(0, (synced - published) / (60 * 60 * 1000));
}

async function getSnapshotHistory(
  supabase: SupabaseClient,
  input: MetricInput,
  latestMetrics: StandardizedMetrics,
  syncedAt: string
) {
  if (!input.postId) {
    return [{ ...latestMetrics, synced_at: syncedAt }];
  }

  const { data, error } = await supabase
    .from('platform_metric_snapshots')
    .select(
      'views, reach, impressions, likes, comments, saves, shares, clicks, watch_time_seconds, follower_delta, synced_at'
    )
    .eq('workspace_id', input.workspaceId)
    .eq('post_id', input.postId)
    .eq('platform', input.platform)
    .order('synced_at', { ascending: true })
    .limit(200);

  if (error || !data || data.length === 0) {
    return [{ ...latestMetrics, synced_at: syncedAt }];
  }

  return data;
}

function pickWindowScore(
  snapshots: any[],
  publishedAt: string | null | undefined,
  latestScore: number,
  currentAgeHours: number | null,
  windowHours: number
) {
  const eligible = snapshots.filter((snapshot) => {
    const snapshotAge = ageHours(publishedAt, snapshot.synced_at);
    return snapshotAge !== null && snapshotAge <= windowHours;
  });

  if (eligible.length > 0) {
    return scoreSnapshot(eligible[eligible.length - 1]);
  }

  if (currentAgeHours !== null && currentAgeHours <= windowHours) {
    return latestScore;
  }

  return null;
}

async function getWorkspaceBaseline(
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
  return scores;
}

async function getAccountBaseline(
  supabase: SupabaseClient,
  workspaceId: string,
  platform: string,
  socialAccountId?: string | null,
  postId?: string | null
) {
  if (!socialAccountId) return [];

  const { data: snapshots } = await supabase
    .from('platform_metric_snapshots')
    .select('post_id')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .eq('social_account_id', socialAccountId)
    .not('post_id', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(80);

  const postIds = Array.from(
    new Set(
      (snapshots || [])
        .map((row: any) => row.post_id)
        .filter((id: string | null) => id && id !== postId)
    )
  ).slice(0, 30);

  if (postIds.length === 0) return [];

  const { data } = await supabase
    .from('post_outcome_summaries')
    .select('score')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .in('post_id', postIds)
    .order('generated_at', { ascending: false })
    .limit(30);

  return (data || []).map((row: any) => Number(row.score || 0)).filter(Number.isFinite);
}

async function getBaseline(
  supabase: SupabaseClient,
  input: MetricInput
) {
  const platform = String(input.platform);
  const accountScores = await getAccountBaseline(
    supabase,
    input.workspaceId,
    platform,
    input.socialAccountId,
    input.postId
  );

  if (accountScores.length >= 3) {
    return {
      score: Math.round(accountScores.reduce((sum, score) => sum + score, 0) / accountScores.length),
      scope: 'account_platform',
      sampleSize: accountScores.length,
    };
  }

  const workspaceScores = await getWorkspaceBaseline(
    supabase,
    input.workspaceId,
    platform,
    input.postId
  );

  if (workspaceScores.length === 0) {
    return { score: 0, scope: 'none', sampleSize: 0 };
  }

  return {
    score: Math.round(workspaceScores.reduce((sum, score) => sum + score, 0) / workspaceScores.length),
    scope: 'workspace_platform',
    sampleSize: workspaceScores.length,
  };
}

async function queueOutcomeWorkers(
  supabase: SupabaseClient,
  input: MetricInput,
  score: number
) {
  if (!input.postId) return;

  await enqueueAgentTask(supabase, {
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

  const { data: platformOutcomes } = await supabase
    .from('post_outcome_summaries')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('platform', input.platform)
    .limit(6);

  if ((platformOutcomes || []).length >= 5) {
    await enqueueAgentTask(supabase, {
      workspaceId: input.workspaceId,
      agentType: 'best_time',
      priority: 5,
      inputPayload: {
        platform: input.platform,
        trigger: 'metric_synced',
      },
    });
  }

  const { data: featureSnapshot } = await supabase
    .from('content_feature_snapshots')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('post_id', input.postId)
    .eq('platform', input.platform)
    .limit(1)
    .maybeSingle();

  if (!featureSnapshot) {
    await enqueueAgentTask(supabase, {
      workspaceId: input.workspaceId,
      agentType: 'content_classifier',
      entityType: 'post',
      entityId: input.postId,
      priority: 5,
      inputPayload: {
        platform: input.platform,
        trigger: 'metric_synced',
      },
    });
  }
}

export async function recordMetricSnapshotAndOutcome(
  supabase: SupabaseClient,
  input: MetricInput
) {
  const writeClient = getWriteClient(supabase);
  const metrics = standardizePlatformMetrics(input.platform, input.metrics || {});
  const syncedAt = new Date().toISOString();
  const publishedAt = input.publishedAt || input.platformPostPublishedAt || null;
  const snapshotMetrics = {
    views: metrics.views,
    reach: metrics.reach,
    impressions: metrics.impressions,
    likes: metrics.likes,
    comments: metrics.comments,
    saves: metrics.saves,
    shares: metrics.shares,
    clicks: metrics.clicks,
    watch_time_seconds: metrics.watch_time_seconds,
    follower_delta: metrics.follower_delta,
  };

  const { error: snapshotError } = await writeClient.from('platform_metric_snapshots').insert({
    workspace_id: input.workspaceId,
    post_id: input.postId || null,
    platform_post_id: input.platformPostId || null,
    social_account_id: input.socialAccountId || null,
    platform: input.platform,
    ...snapshotMetrics,
    raw: input.raw || input.metrics || {},
    synced_at: syncedAt,
  });

  if (snapshotError) {
    console.warn('[IntelligenceMetrics] Failed to write metric snapshot:', snapshotError.message);
  }

  if (!input.postId) {
    return { snapshotWritten: !snapshotError, outcomeWritten: false };
  }

  const score = scorePlatformMetrics(input.platform, metrics);
  const baseline = await getBaseline(writeClient, input);
  const snapshots = await getSnapshotHistory(writeClient, input, metrics, syncedAt);
  const currentAgeHours = ageHours(publishedAt, syncedAt);
  const firstHourScore = pickWindowScore(snapshots, publishedAt, score, currentAgeHours, 1);
  const dayScore = pickWindowScore(snapshots, publishedAt, score, currentAgeHours, 24);
  const sevenDayScore = pickWindowScore(snapshots, publishedAt, score, currentAgeHours, 168);
  const confidence = clamp(
    0.35 +
      Math.min(0.35, Math.max(metrics.views, metrics.reach, metrics.impressions) / 10000) +
      Math.min(0.15, (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / 100) +
      Math.min(0.05, snapshots.length / 20),
    0,
    0.9
  );
  const outcomeMetrics = {
    ...metrics,
    normalized: metrics,
    raw: input.raw || input.metrics || {},
    syncSource: input.syncSource || 'analytics_sync',
    publishedAt,
    ageHours: currentAgeHours,
    scores: {
      latest: score,
      firstHour: firstHourScore,
      day: dayScore,
      sevenDay: sevenDayScore,
    },
    baseline: {
      score: baseline.score,
      scope: baseline.scope,
      sampleSize: baseline.sampleSize,
    },
    snapshotCount: snapshots.length,
  };

  const { error: outcomeError } = await writeClient.from('post_outcome_summaries').upsert(
    {
      workspace_id: input.workspaceId,
      post_id: input.postId,
      platform: input.platform,
      score,
      baseline_score: baseline.score,
      first_hour_score: firstHourScore,
      day_score: dayScore,
      seven_day_score: sevenDayScore,
      confidence,
      reason_summary: explainPlatformOutcome(input.platform, score, baseline.score, metrics),
      metrics: outcomeMetrics,
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
    eventKey: buildLearningEventKey({
      workspaceId: input.workspaceId,
      eventType: 'metric_synced',
      entityType: 'post',
      entityId: input.postId,
      platform: String(input.platform),
      discriminator: `${input.platformPostId || 'local'}:${syncedAt.slice(0, 13)}`,
    }),
    metadata: {
      platformPostId: input.platformPostId,
      score,
      baseline: baseline.score,
      baselineScope: baseline.scope,
      metrics: outcomeMetrics,
      syncSource: input.syncSource || 'analytics_sync',
    },
  });

  await queueOutcomeWorkers(writeClient, input, score);

  return {
    snapshotWritten: !snapshotError,
    outcomeWritten: !outcomeError,
    score,
    baseline: baseline.score,
    baselineScope: baseline.scope,
    firstHourScore,
    dayScore,
    sevenDayScore,
    snapshotCount: snapshots.length,
  };
}
