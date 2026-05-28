import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  APIError,
  successResponse,
  validateRequest,
  withErrorHandler,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { buildAIContextPacket, getBrandProfile } from '@/lib/intelligence/context';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { enqueueAgentTask, queuePostIntelligenceTasks } from '@/lib/intelligence/tasks';
import type { Platform } from '@/types';
import type {
  AIContextPacket,
  AIExplanation,
  CalendarCampaignGap,
  CalendarDayIntelligence,
  CalendarPlatformOpportunity,
  CalendarStrategyAction,
  CalendarStrategyHealth,
} from '@/types/intelligence';

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
    'fill_platform_gap',
    'fill_campaign_gap',
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

function dateKeyFromIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toDateKey(new Date()) : toDateKey(date);
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
  return value
    .map((platform) => String(platform).toLowerCase())
    .filter((platform): platform is Platform => PLATFORM_VALUES.includes(platform as Platform));
}

function firstPlatformSet(...sources: unknown[]) {
  for (const source of sources) {
    const platforms = normalizePlatforms(source);
    if (platforms.length > 0) return platforms.slice(0, 3);
  }
  return ['instagram'] as Platform[];
}

function normalizePriority(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
  const priority = String(value || '').toLowerCase();
  if (priority === 'critical' || priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority;
  }
  return 'medium';
}

function priorityWeight(priority?: string) {
  if (priority === 'critical') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function actionWeight(action: CalendarStrategyAction) {
  const slotWeight =
    action.slotType === 'campaign_gap'
      ? 5
      : action.slotType === 'platform_gap'
        ? 4
        : action.slotType === 'empty_day'
          ? 3
          : action.slotType === 'pillar_gap'
            ? 2
            : 1;
  return priorityWeight(action.priority) * 10 + slotWeight + Number(action.confidence || 0);
}

function hasCalendarSuggestionTableError(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    message.includes("Could not find the table 'public.ai_feedback_actions'")
  );
}

async function fetchSuppressedCalendarSuggestionIds(serviceClient: any, workspaceId: string) {
  try {
    const { data, error } = await serviceClient
      .from('ai_feedback_actions')
      .select('target_id, action')
      .eq('workspace_id', workspaceId)
      .eq('target_type', 'calendar_suggestion')
      .in('action', ['apply', 'ignore', 'dismiss', 'mark_off_brand', 'reject'])
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      if (!hasCalendarSuggestionTableError(error)) {
        console.warn('[Calendar AI] Feedback suppression skipped:', error.message);
      }
      return new Set<string>();
    }

    return new Set((data || []).map((item: any) => String(item.target_id || '')).filter(Boolean));
  } catch (error: any) {
    if (!hasCalendarSuggestionTableError(error)) {
      console.warn('[Calendar AI] Feedback suppression skipped:', error?.message || error);
    }
    return new Set<string>();
  }
}

function buildDraftText(input: {
  type: string;
  title?: string;
  description?: string;
  pillar?: string;
  recommendation?: any;
  contextPacket?: AIContextPacket;
}) {
  const recommendation = input.recommendation;
  const heading = input.title || recommendation?.title || 'Calendar AI draft';
  const description = input.description || recommendation?.description || '';
  const actionItems = Array.isArray(recommendation?.action_items)
    ? recommendation.action_items
    : [];
  const brand = input.contextPacket?.intelligenceContext.brandProfile;
  const platformPreferences = brand?.platform_preferences
    ? Object.entries(brand.platform_preferences)
        .slice(0, 3)
        .map(([platform, preference]) => `${platform}: ${String(preference)}`)
    : [];

  const lines = [
    heading,
    '',
    description,
    input.pillar ? `\nContent pillar: ${input.pillar}` : '',
    brand?.voice ? `\nBrand voice: ${brand.voice}` : '',
    brand?.audience ? `Audience: ${brand.audience}` : '',
    brand?.do_rules?.length ? `Do: ${brand.do_rules.slice(0, 4).join('; ')}` : '',
    brand?.dont_rules?.length ? `Avoid: ${brand.dont_rules.slice(0, 4).join('; ')}` : '',
    platformPreferences.length ? `Platform preferences: ${platformPreferences.join('; ')}` : '',
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

function calendarExplanation(input: {
  reasonSummary: string;
  evidence?: string[];
  confidenceScore?: number;
  platforms: Platform[];
  pillar?: string;
  calendarAction?: string;
  dataCaveats?: string[];
}): AIExplanation {
  return {
    reasonSummary: input.reasonSummary,
    evidence: input.evidence || [],
    confidenceScore: input.confidenceScore,
    targetPlatforms: input.platforms,
    contentPillar: input.pillar || undefined,
    calendarAction: input.calendarAction,
    dataCaveats: input.dataCaveats,
    generatedBy: 'calendar_ai_actions',
    promptVersion: 'calendar.ai-actions.v1',
  };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const today = new Date();
  const from = parseDate(request.nextUrl.searchParams.get('from'), startOfMonth(today));
  const to = parseDate(request.nextUrl.searchParams.get('to'), endOfMonth(from));
  const nowKey = toDateKey(today);

  const [
    brandProfile,
    postsResult,
    recommendationsResult,
    artifactsResult,
    featuresResult,
    accountsResult,
    suppressedSuggestionIds,
  ] =
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
      serviceClient
        .from('social_accounts')
        .select('id, platform, status')
        .eq('workspace_id', workspaceId)
        .in('status', ['active', 'connected'])
        .limit(50),
      fetchSuppressedCalendarSuggestionIds(serviceClient, workspaceId),
    ]);

  const posts = postsResult.data || [];
  const recommendations = recommendationsResult.data || [];
  const artifacts = artifactsResult.data || [];
  const features = featuresResult.data || [];
  const activeAccounts = accountsResult.data || [];
  const occupied = new Set<string>();
  const rangePosts: any[] = [];

  posts.forEach((post: any) => {
    const calendarDate = new Date(getPostCalendarDate(post));
    if (Number.isNaN(calendarDate.getTime())) return;
    if (calendarDate >= from && calendarDate <= to && !['failed', 'rejected'].includes(post.status)) {
      occupied.add(toDateKey(calendarDate));
      rangePosts.push(post);
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
  const activePlatforms = Array.from(
    new Set([
      ...normalizePlatforms(activeAccounts.map((account: any) => account.platform)),
      ...defaultPlatforms,
    ])
  );
  const scheduledOrPlannedPosts = rangePosts.filter((post) =>
    ['draft', 'approved', 'scheduled', 'pending_approval'].includes(String(post.status))
  );
  const publishedPosts = rangePosts.filter((post) =>
    ['published', 'partial'].includes(String(post.status))
  );
  const platformOpportunities: CalendarPlatformOpportunity[] = activePlatforms
    .map((platform) => {
      const scheduledCount = scheduledOrPlannedPosts.filter((post) =>
        normalizePlatforms(post.platforms).includes(platform)
      ).length;
      const publishedCount = publishedPosts.filter((post) =>
        normalizePlatforms(post.platforms).includes(platform)
      ).length;
      return {
        platform,
        scheduledCount,
        publishedCount,
        reason:
          scheduledCount === 0
            ? `${platform} has no future planned posts in this calendar range.`
            : `${platform} has ${scheduledCount} planned post${scheduledCount === 1 ? '' : 's'} in this range.`,
        priority: scheduledCount === 0 ? 'high' : 'low',
      } satisfies CalendarPlatformOpportunity;
    })
    .filter((opportunity) => opportunity.scheduledCount === 0);

  const actions: CalendarStrategyAction[] = [];

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
      dateKey: day.date,
      platforms: defaultPlatforms,
      pillar,
      priority: 'high',
      source: 'Calendar gap',
      slotType: 'empty_day',
      impact: 'Keeps the publishing cadence consistent on an otherwise empty weekday.',
      state: 'recommended',
      blockedReason: null,
      explanation: calendarExplanation({
        reasonSummary: pillar
          ? `This day is empty and ${pillar} is underrepresented, so Xocial recommends filling the slot with a planned draft.`
          : 'This day is empty in the calendar, so Xocial recommends adding one planned draft.',
        evidence: [
          `No active post found on ${day.date}.`,
          pillar ? `${pillar} is one of the lowest-count content pillars this month.` : '',
        ].filter(Boolean),
        confidenceScore: 0.72,
        platforms: defaultPlatforms,
        pillar,
        calendarAction: 'Create a planned draft for the empty day.',
      }),
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
      dateKey: dateKeyFromIso(day?.scheduledAt || setHour(addDays(today, index + 1), 10).toISOString()),
      platforms: defaultPlatforms,
      recommendationId: recommendation.id,
      priority: normalizePriority(recommendation.priority),
      confidence: recommendation.confidence_score,
      source: 'Strategy recommendation',
      slotType: 'strategy',
      impact: recommendation.metrics?.expectedImpact || 'Turns an active strategy recommendation into an executable calendar draft.',
      state: 'recommended',
      blockedReason: null,
      explanation: calendarExplanation({
        reasonSummary:
          recommendation.metrics?.reasoningSummary ||
          recommendation.metrics?.expectedImpact ||
          'This action comes from an active strategy recommendation generated from workspace learning signals.',
        evidence: Array.isArray(recommendation.metrics?.evidence)
          ? recommendation.metrics.evidence.slice(0, 4)
          : ['Active strategy recommendation is still pending execution.'],
        confidenceScore: Number(recommendation.confidence_score || 0),
        platforms: defaultPlatforms,
        pillar: recommendation.metrics?.contentPillar,
        calendarAction: recommendation.metrics?.calendarAction || 'Turn the strategy item into a planned draft.',
        dataCaveats: Array.isArray(recommendation.metrics?.dataCaveats)
          ? recommendation.metrics.dataCaveats.slice(0, 3)
          : undefined,
      }),
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
      dateKey: dateKeyFromIso(day?.scheduledAt || setHour(addDays(today, index + 3), 10).toISOString()),
      platforms: defaultPlatforms,
      pillar: pillarInfo.pillar,
      priority: pillarInfo.count === 0 ? 'high' : 'medium',
      source: 'Pillar balance',
      slotType: 'pillar_gap',
      impact: 'Improves content mix by adding coverage for an underused brand pillar.',
      state: 'recommended',
      blockedReason: null,
      explanation: calendarExplanation({
        reasonSummary: `${pillarInfo.pillar} has ${pillarInfo.count} recent classified posts, so Xocial recommends balancing the content mix.`,
        evidence: [
          `${pillarInfo.count} recent post${pillarInfo.count === 1 ? '' : 's'} classified under this pillar.`,
          `${features.length} classified content signals reviewed.`,
        ],
        confidenceScore: pillarInfo.count === 0 ? 0.78 : 0.66,
        platforms: defaultPlatforms,
        pillar: pillarInfo.pillar,
        calendarAction: 'Create a planned draft for the underused pillar.',
      }),
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
      dateKey: dateKeyFromIso(setHour(base, hour).toISOString()),
      platforms: [platform],
      priority: 'medium',
      confidence: slot.averageScore ? Math.min(0.9, Number(slot.averageScore) / 100) : undefined,
      source: 'Best-time worker',
      sourceArtifactId: bestTimeArtifact?.id,
      slotType: 'best_time',
      impact: 'Places platform-specific content into a measured stronger posting window.',
      state: 'recommended',
      blockedReason: null,
      explanation: calendarExplanation({
        reasonSummary: `The best-time worker found a stronger ${platform} posting window around ${String(hour).padStart(2, '0')}:00.`,
        evidence: [
          slot.averageScore ? `Average outcome score for this slot: ${Math.round(Number(slot.averageScore))}.` : '',
          bestTimeArtifact?.summary || '',
        ].filter(Boolean),
        confidenceScore: slot.averageScore ? Math.min(0.9, Number(slot.averageScore) / 100) : 0.6,
        platforms: [platform],
        calendarAction: `Schedule a ${platform} draft at ${String(hour).padStart(2, '0')}:00.`,
        dataCaveats: bestTimes.length ? [] : ['Best-time signal is limited until more published post metrics are synced.'],
      }),
    });
  });

  platformOpportunities.slice(0, 4).forEach((opportunity, index) => {
    const day = emptyDays[(index + 1) % Math.max(emptyDays.length, 1)];
    const scheduledAt = day?.scheduledAt || setHour(addDays(today, index + 2), 11).toISOString();
    const actionId = `platform-gap-${opportunity.platform}-${dateKeyFromIso(scheduledAt)}`;
    opportunity.recommendedActionId = actionId;
    actions.push({
      id: actionId,
      type: 'fill_platform_gap',
      title: `Add ${opportunity.platform} coverage`,
      description: `Create a planned ${opportunity.platform} draft so this channel is represented in the calendar.`,
      scheduledAt,
      dateKey: dateKeyFromIso(scheduledAt),
      platforms: [opportunity.platform],
      priority: opportunity.priority,
      confidence: 0.7,
      source: 'Platform coverage',
      slotType: 'platform_gap',
      impact: 'Keeps active channels from going quiet while other platforms receive content.',
      state: 'recommended',
      blockedReason: null,
      explanation: calendarExplanation({
        reasonSummary: `${opportunity.platform} has no planned content in this calendar range, so Xocial recommends adding one draft.`,
        evidence: [
          `${opportunity.platform} scheduled/planned posts in range: ${opportunity.scheduledCount}.`,
          `${opportunity.platform} published/imported posts in range: ${opportunity.publishedCount}.`,
        ],
        confidenceScore: 0.7,
        platforms: [opportunity.platform],
        calendarAction: `Create one planned ${opportunity.platform} draft.`,
      }),
    });
  });

  const campaignRecommendations = recommendations
    .filter((recommendation: any) => {
      const text = `${recommendation.type || ''} ${recommendation.title || ''} ${recommendation.description || ''}`.toLowerCase();
      return text.includes('campaign') || text.includes('launch') || text.includes('offer');
    })
    .slice(0, 3);
  const campaignGaps: CalendarCampaignGap[] = campaignRecommendations.length
    ? campaignRecommendations.map((recommendation: any, index: number) => {
        const scheduledAt =
          emptyDays[(index + 3) % Math.max(emptyDays.length, 1)]?.scheduledAt ||
          setHour(addDays(today, index + 4), 10).toISOString();
        const actionId = `campaign-gap-${recommendation.id}`;
        actions.push({
          id: actionId,
          type: 'fill_campaign_gap',
          title: recommendation.title || 'Turn campaign strategy into a draft',
          description:
            recommendation.description ||
            'Create a planned draft from this active campaign strategy recommendation.',
          scheduledAt,
          dateKey: dateKeyFromIso(scheduledAt),
          platforms: defaultPlatforms,
          pillar: recommendation.metrics?.contentPillar || undefined,
          recommendationId: recommendation.id,
          priority: normalizePriority(recommendation.priority || 'medium'),
          confidence: Number(recommendation.confidence_score || 0.62),
          source: 'Campaign gap',
          slotType: 'campaign_gap',
          impact:
            recommendation.metrics?.expectedImpact ||
            'Connects a campaign-level recommendation to an actual calendar draft.',
          state: 'recommended',
          blockedReason: null,
          explanation: calendarExplanation({
            reasonSummary:
              recommendation.metrics?.reasoningSummary ||
              'This active campaign recommendation has not been turned into calendar content yet.',
            evidence: Array.isArray(recommendation.metrics?.evidence)
              ? recommendation.metrics.evidence.slice(0, 4)
              : ['Active campaign recommendation is still pending execution.'],
            confidenceScore: Number(recommendation.confidence_score || 0.62),
            platforms: defaultPlatforms,
            pillar: recommendation.metrics?.contentPillar,
            calendarAction: recommendation.metrics?.calendarAction || 'Create a planned campaign draft.',
            dataCaveats: Array.isArray(recommendation.metrics?.dataCaveats)
              ? recommendation.metrics.dataCaveats.slice(0, 3)
              : undefined,
          }),
        });
        return {
          id: `campaign-gap-${recommendation.id}`,
          title: recommendation.title,
          description: recommendation.description,
          recommendedActionId: actionId,
          pillar: recommendation.metrics?.contentPillar || null,
          platforms: defaultPlatforms,
          priority: normalizePriority(recommendation.priority || 'medium') as CalendarCampaignGap['priority'],
        };
      })
    : underusedPillars.slice(0, 1).map((pillarInfo, index) => {
        const scheduledAt =
          emptyDays[(index + 3) % Math.max(emptyDays.length, 1)]?.scheduledAt ||
          setHour(addDays(today, index + 4), 10).toISOString();
        const actionId = `campaign-gap-pillar-${pillarInfo.pillar}`;
        actions.push({
          id: actionId,
          type: 'fill_campaign_gap',
          title: `Create a mini-campaign around ${pillarInfo.pillar}`,
          description: `Use ${pillarInfo.pillar} as a campaign theme because it is underrepresented this month.`,
          scheduledAt,
          dateKey: dateKeyFromIso(scheduledAt),
          platforms: defaultPlatforms,
          pillar: pillarInfo.pillar,
          priority: pillarInfo.count === 0 ? 'high' : 'medium',
          confidence: pillarInfo.count === 0 ? 0.72 : 0.6,
          source: 'Campaign gap',
          slotType: 'campaign_gap',
          impact: 'Turns pillar imbalance into a coordinated campaign direction.',
          state: 'recommended',
          blockedReason: null,
          explanation: calendarExplanation({
            reasonSummary: `${pillarInfo.pillar} is underrepresented, so Xocial recommends using it as a campaign theme.`,
            evidence: [
              `${pillarInfo.count} recent classified post${pillarInfo.count === 1 ? '' : 's'} for ${pillarInfo.pillar}.`,
              `${features.length} classified content signals reviewed.`,
            ],
            confidenceScore: pillarInfo.count === 0 ? 0.72 : 0.6,
            platforms: defaultPlatforms,
            pillar: pillarInfo.pillar,
            calendarAction: `Create a mini-campaign draft around ${pillarInfo.pillar}.`,
          }),
        });
        return {
          id: actionId,
          title: `Create a mini-campaign around ${pillarInfo.pillar}`,
          description: `Use ${pillarInfo.pillar} as a campaign theme because it is underrepresented this month.`,
          recommendedActionId: actionId,
          pillar: pillarInfo.pillar,
          platforms: defaultPlatforms,
          priority: pillarInfo.count === 0 ? 'high' : 'medium',
        };
      });

  const visibleActions = actions
    .filter((action) => !suppressedSuggestionIds.has(action.id))
    .sort((a, b) => actionWeight(b) - actionWeight(a))
    .slice(0, 14);
  const visibleActionIds = new Set(visibleActions.map((action) => action.id));
  const visiblePlatformOpportunities = platformOpportunities.filter(
    (opportunity) => !opportunity.recommendedActionId || visibleActionIds.has(opportunity.recommendedActionId)
  );
  const visibleCampaignGaps = campaignGaps.filter(
    (gap) => !gap.recommendedActionId || visibleActionIds.has(gap.recommendedActionId)
  );
  const actionsByDate = new Map<string, CalendarStrategyAction[]>();
  visibleActions.forEach((action) => {
    const list = actionsByDate.get(action.dateKey) || [];
    list.push(action);
    actionsByDate.set(action.dateKey, list);
  });
  const postCountsByDate = new Map<string, number>();
  rangePosts.forEach((post) => {
    const dateKey = toDateKey(new Date(getPostCalendarDate(post)));
    postCountsByDate.set(dateKey, (postCountsByDate.get(dateKey) || 0) + 1);
  });
  const dayKeys = Array.from(new Set([...actionsByDate.keys(), ...postCountsByDate.keys()])).sort();
  const dayIntelligence: CalendarDayIntelligence[] = dayKeys.map((dateKey) => {
    const dayActions = actionsByDate.get(dateKey) || [];
    const postCount = postCountsByDate.get(dateKey) || 0;
    return {
      dateKey,
      hasPosts: postCount > 0,
      postCount,
      recommendedSlotCount: dayActions.length,
      topActionIds: dayActions.slice(0, 3).map((action) => action.id),
      labels: Array.from(new Set(dayActions.map((action) => action.slotType || action.type))).slice(0, 3),
    };
  });
  const underusedPillarCount = underusedPillars.filter((pillar) => pillar.count === 0).length;
  const gapLoad =
    emptyDays.length +
    underusedPillarCount +
    visiblePlatformOpportunities.length +
    visibleCampaignGaps.length;
  const healthScore = Math.max(0, Math.min(100, 100 - gapLoad * 8 + Math.min(12, scheduledOrPlannedPosts.length * 2)));
  const strategyHealth: CalendarStrategyHealth = {
    score: healthScore,
    status: healthScore >= 72 ? 'healthy' : healthScore >= 45 ? 'needs_attention' : 'at_risk',
    emptyDays: emptyDays.length,
    underusedPillars: underusedPillarCount,
    bestTimeSlots: bestTimes.length,
    platformGaps: visiblePlatformOpportunities.length,
    campaignGaps: visibleCampaignGaps.length,
    plannedDrafts: posts.filter((post: any) => post.metadata?.aiCalendar?.plannedAt).length,
    recommendations: visibleActions.length,
  };

  return successResponse({
    summary: {
      emptyDays: emptyDays.length,
      activeRecommendations: recommendations.length,
      bestTimeSlots: bestTimes.length,
      contentPillars: pillars.length,
      plannedPosts: strategyHealth.plannedDrafts,
    },
    strategyHealth,
    dayIntelligence,
    platformOpportunities: visiblePlatformOpportunities,
    campaignGaps: visibleCampaignGaps,
    actions: visibleActions,
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
  const aiContextPacket = await buildAIContextPacket(serviceClient, {
    workspaceId,
    selectedPlatforms: platforms,
    campaignGoal: input.description || input.title || 'Create a calendar draft',
    contentPillar: input.pillar,
    query: [input.title, input.description].filter(Boolean).join(' - '),
  });
  const text = buildDraftText({
    type: input.type,
    title: input.title,
    description: input.description,
    pillar: input.pillar,
    recommendation,
    contextPacket: aiContextPacket,
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
          contextMetadata: aiContextPacket.contextMetadata,
        },
        ai: {
          generated: false,
          source: 'calendar_ai_actions',
          usedBrandBrain: true,
          contextMetadata: aiContextPacket.contextMetadata,
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
      contextMetadata: aiContextPacket.contextMetadata,
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
