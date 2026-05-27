import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  APIError,
  successResponse,
  validateRequest,
  withErrorHandler,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getBrandProfile } from '@/lib/intelligence/context';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { enqueueAgentTask, queuePostIntelligenceTasks } from '@/lib/intelligence/tasks';
import type { Platform } from '@/types';

export const dynamic = 'force-dynamic';

const PLATFORM_VALUES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
];

const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
]);

const createDraftSchema = z.object({
  type: z.enum([
    'queue_refresh',
    'fill_empty_day',
    'create_strategy_draft',
    'create_pillar_balance_draft',
    'create_best_time_draft',
  ]),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  platforms: z.array(platformEnum).optional(),
  pillar: z.string().optional(),
  recommendationId: z.string().optional(),
  sourceArtifactId: z.string().optional(),
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setHour(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getPostCalendarDate(post: any) {
  if (post.status === 'published' || post.status === 'partial') {
    return post.published_at || post.scheduled_at || post.created_at;
  }
  return post.scheduled_at || post.created_at;
}

function normalizePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  return value.filter((platform): platform is Platform => PLATFORM_VALUES.includes(platform));
}

function firstPlatformSet(...sources: unknown[]) {
  for (const source of sources) {
    const platforms = normalizePlatforms(source);
    if (platforms.length > 0) return platforms.slice(0, 3);
  }
  return ['instagram'] as Platform[];
}

function buildDraftText(input: {
  type: string;
  title?: string;
  description?: string;
  pillar?: string;
  recommendation?: any;
}) {
  const recommendation = input.recommendation;
  const heading = input.title || recommendation?.title || 'Calendar AI draft';
  const description = input.description || recommendation?.description || '';
  const actionItems = Array.isArray(recommendation?.action_items)
    ? recommendation.action_items
    : [];

  const lines = [
    heading,
    '',
    description,
    input.pillar ? `\nContent pillar: ${input.pillar}` : '',
    actionItems.length ? `\nDirection:\n${actionItems.map((item: string) => `- ${item}`).join('\n')}` : '',
    '\nDraft this into final platform copy in Create before publishing.',
  ].filter(Boolean);

  return lines.join('\n').trim();
}

function buildContentMap(platforms: Platform[], text: string) {
  return platforms.reduce(
    (acc, platform) => {
      acc[platform] = { text };
      return acc;
    },
    { default: { text } } as Record<string, { text: string }>
  );
}

function normalizeScheduledAt(value?: string) {
  const parsed = value ? new Date(value) : setHour(addDays(new Date(), 1), 10);
  if (Number.isNaN(parsed.getTime())) {
    return setHour(addDays(new Date(), 1), 10);
  }
  if (parsed <= new Date()) {
    return setHour(addDays(new Date(), 1), 10);
  }
  return parsed;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const today = new Date();
  const from = parseDate(request.nextUrl.searchParams.get('from'), startOfMonth(today));
  const to = parseDate(request.nextUrl.searchParams.get('to'), endOfMonth(from));
  const nowKey = toDateKey(today);

  const [brandProfile, postsResult, recommendationsResult, artifactsResult, featuresResult] =
    await Promise.all([
      getBrandProfile(serviceClient, workspaceId),
      serviceClient
        .from('posts')
        .select('id, status, platforms, content, scheduled_at, published_at, created_at, metadata')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1000),
      serviceClient
        .from('strategy_recommendations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(8),
      serviceClient
        .from('agent_artifacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('artifact_type', ['best_time_recommendation', 'strategy_plan', 'performance_insight'])
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(12),
      serviceClient
        .from('content_feature_snapshots')
        .select('pillar, topic, platform, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

  const posts = postsResult.data || [];
  const recommendations = recommendationsResult.data || [];
  const artifacts = artifactsResult.data || [];
  const features = featuresResult.data || [];
  const occupied = new Set<string>();

  posts.forEach((post: any) => {
    const calendarDate = new Date(getPostCalendarDate(post));
    if (Number.isNaN(calendarDate.getTime())) return;
    if (calendarDate >= from && calendarDate <= to && !['failed', 'rejected'].includes(post.status)) {
      occupied.add(toDateKey(calendarDate));
    }
  });

  const emptyDays: Array<{ date: string; scheduledAt: string }> = [];
  let cursor = new Date(Math.max(from.getTime(), today.getTime()));
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to && emptyDays.length < 8) {
    const key = toDateKey(cursor);
    if (key >= nowKey && !isWeekend(cursor) && !occupied.has(key)) {
      emptyDays.push({
        date: key,
        scheduledAt: setHour(cursor, 10).toISOString(),
      });
    }
    cursor = addDays(cursor, 1);
  }

  const bestTimeArtifact = artifacts.find(
    (artifact: any) => artifact.artifact_type === 'best_time_recommendation'
  );
  const bestTimes = Array.isArray(bestTimeArtifact?.payload?.recommendations)
    ? bestTimeArtifact.payload.recommendations
    : [];

  const pillarCounts = new Map<string, number>();
  features.forEach((feature: any) => {
    const pillar = String(feature.pillar || feature.topic || '').trim();
    if (pillar) pillarCounts.set(pillar, (pillarCounts.get(pillar) || 0) + 1);
  });
  const pillars = brandProfile.content_pillars.length
    ? brandProfile.content_pillars
    : Array.from(pillarCounts.keys()).slice(0, 5);
  const underusedPillars = pillars
    .map((pillar) => ({ pillar, count: pillarCounts.get(pillar) || 0 }))
    .sort((a, b) => a.count - b.count);

  const latestPost = posts[0];
  const defaultPlatforms = firstPlatformSet(
    latestPost?.platforms,
    bestTimes.map((item: any) => item.platform),
    Object.keys(brandProfile.platform_preferences || {})
  );

  const actions: Array<Record<string, unknown>> = [];

  emptyDays.slice(0, 4).forEach((day, index) => {
    const pillar = underusedPillars[index % Math.max(underusedPillars.length, 1)]?.pillar;
    actions.push({
      id: `empty-${day.date}`,
      type: 'fill_empty_day',
      title: `Fill ${day.date}`,
      description: pillar
        ? `Create a planned draft around ${pillar} for an empty calendar day.`
        : 'Create a planned draft for an empty calendar day.',
      scheduledAt: day.scheduledAt,
      platforms: defaultPlatforms,
      pillar,
      priority: 'high',
      source: 'Calendar gap',
    });
  });

  recommendations.slice(0, 4).forEach((recommendation: any, index: number) => {
    const day = emptyDays[index % Math.max(emptyDays.length, 1)];
    actions.push({
      id: `strategy-${recommendation.id}`,
      type: 'create_strategy_draft',
      title: recommendation.title,
      description: recommendation.description,
      scheduledAt: day?.scheduledAt || setHour(addDays(today, index + 1), 10).toISOString(),
      platforms: defaultPlatforms,
      recommendationId: recommendation.id,
      priority: recommendation.priority || 'medium',
      confidence: recommendation.confidence_score,
      source: 'Strategy recommendation',
    });
  });

  underusedPillars.slice(0, 3).forEach((pillarInfo, index) => {
    const day = emptyDays[(index + 2) % Math.max(emptyDays.length, 1)];
    actions.push({
      id: `pillar-${pillarInfo.pillar}`,
      type: 'create_pillar_balance_draft',
      title: `Balance pillar: ${pillarInfo.pillar}`,
      description: `This pillar has ${pillarInfo.count} recent classified posts. Add one planned draft to rebalance the month.`,
      scheduledAt: day?.scheduledAt || setHour(addDays(today, index + 3), 10).toISOString(),
      platforms: defaultPlatforms,
      pillar: pillarInfo.pillar,
      priority: pillarInfo.count === 0 ? 'high' : 'medium',
      source: 'Pillar balance',
    });
  });

  bestTimes.slice(0, 4).forEach((slot: any, index: number) => {
    const platform = PLATFORM_VALUES.includes(slot.platform) ? slot.platform : defaultPlatforms[0];
    const day = emptyDays[index % Math.max(emptyDays.length, 1)];
    const base = day ? new Date(day.scheduledAt) : addDays(today, index + 1);
    const hour = Number.isFinite(Number(slot.hour)) ? Number(slot.hour) : 10;
    actions.push({
      id: `best-time-${platform}-${hour}`,
      type: 'create_best_time_draft',
      title: `${platform} best-time slot`,
      description: `Create a draft for ${platform} at ${String(hour).padStart(2, '0')}:00 based on measured account outcomes.`,
      scheduledAt: setHour(base, hour).toISOString(),
      platforms: [platform],
      priority: 'medium',
      confidence: slot.averageScore ? Math.min(0.9, Number(slot.averageScore) / 100) : undefined,
      source: 'Best-time worker',
      sourceArtifactId: bestTimeArtifact?.id,
    });
  });

  return successResponse({
    summary: {
      emptyDays: emptyDays.length,
      activeRecommendations: recommendations.length,
      bestTimeSlots: bestTimes.length,
      contentPillars: pillars.length,
      plannedPosts: posts.filter((post: any) => post.metadata?.aiCalendar?.plannedAt).length,
    },
    actions: actions.slice(0, 14),
    emptyDays,
    bestTimes,
    pillarBalance: underusedPillars,
    strategyRecommendations: recommendations,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, createDraftSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
  });

  if (input.type === 'queue_refresh') {
    const tasks = await Promise.all([
      enqueueAgentTask(serviceClient, {
        workspaceId,
        agentType: 'strategy_planner',
        priority: 7,
        inputPayload: { requestedFrom: 'calendar_ai_actions' },
      }),
      enqueueAgentTask(serviceClient, {
        workspaceId,
        agentType: 'best_time',
        priority: 6,
        inputPayload: { requestedFrom: 'calendar_ai_actions' },
      }),
      enqueueAgentTask(serviceClient, {
        workspaceId,
        agentType: 'performance_analyst',
        priority: 5,
        inputPayload: { requestedFrom: 'calendar_ai_actions' },
      }),
    ]);

    return successResponse({ tasks });
  }

  const scheduledAt = normalizeScheduledAt(input.scheduledAt);
  let recommendation: any = null;
  if (input.recommendationId) {
    const { data, error } = await serviceClient
      .from('strategy_recommendations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', input.recommendationId)
      .maybeSingle();
    if (error) throw new APIError(500, error.message, 'DATABASE_ERROR');
    recommendation = data;
  }

  const platforms = input.platforms?.length ? input.platforms : (['instagram'] as Platform[]);
  const text = buildDraftText({
    type: input.type,
    title: input.title,
    description: input.description,
    pillar: input.pillar,
    recommendation,
  });

  const { data: post, error } = await serviceClient
    .from('posts')
    .insert({
      workspace_id: workspaceId,
      content: buildContentMap(platforms, text),
      platforms,
      status: 'draft',
      scheduled_at: scheduledAt.toISOString(),
      media: [],
      tags: ['calendar-ai'],
      created_by: user.id,
      metadata: {
        aiCalendar: {
          type: input.type,
          plannedAt: scheduledAt.toISOString(),
          pillar: input.pillar || null,
          recommendationId: input.recommendationId || null,
          sourceArtifactId: input.sourceArtifactId || null,
          source: 'calendar_ai_actions',
        },
        ai: {
          generated: false,
          source: 'calendar_ai_actions',
        },
      },
    })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'calendar_ai',
    eventType: 'calendar_ai_draft_created',
    entityType: 'post',
    entityId: post.id,
    signalStrength: 0.65,
    metadata: {
      type: input.type,
      platforms,
      scheduledAt: scheduledAt.toISOString(),
      pillar: input.pillar,
      recommendationId: input.recommendationId,
    },
  });

  if (input.recommendationId) {
    await serviceClient
      .from('strategy_recommendations')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', input.recommendationId);
  }

  await queuePostIntelligenceTasks(serviceClient, {
    workspaceId,
    postId: post.id,
    platforms,
    reason: 'calendar_ai_draft_created',
    priority: 5,
  });

  return successResponse({ post });
});
