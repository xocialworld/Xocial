import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getBrandProfile } from '@/lib/intelligence/context';
import { calculateBrandCompletion } from '@/lib/intelligence/learning';
import type { AIExplanation, LeverageInsight } from '@/types/intelligence';

export const dynamic = 'force-dynamic';

function safeCount(count: number | null) {
  return count ?? 0;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function compactText(value: unknown, maxLength = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function textList(value: unknown, limit = 5) {
  return Array.isArray(value)
    ? value.map((item) => compactText(item, 180)).filter(Boolean).slice(0, limit)
    : [];
}

function missingBrandFields(profile: any) {
  return [
    profile?.voice ? null : 'brand voice',
    profile?.audience ? null : 'audience',
    profile?.content_pillars?.length ? null : 'content pillars',
    profile?.do_rules?.length ? null : 'do rules',
    profile?.dont_rules?.length ? null : 'do-not rules',
    profile?.approved_examples?.length ? null : 'approved examples',
    profile?.rejected_examples?.length ? null : 'rejected examples',
  ].filter(Boolean) as string[];
}

function recommendationType(value: unknown): LeverageInsight['type'] {
  if (['growth', 'content', 'timing', 'brand', 'risk', 'learning'].includes(String(value))) {
    return value as LeverageInsight['type'];
  }
  return 'growth';
}

function recommendationExplanation(recommendation: any): AIExplanation {
  const metrics = asRecord(recommendation.metrics);
  return {
    reasonSummary: compactText(
      metrics.reasoningSummary ||
        metrics.expectedImpact ||
        recommendation.description ||
        'This strategy recommendation came from Xocial AI learning signals.'
    ),
    evidence: textList(metrics.evidence, 4),
    dataCaveats: textList(metrics.dataCaveats, 3),
    confidenceBreakdown: asRecord(metrics.confidenceBreakdown),
    confidenceScore: Number(recommendation.confidence_score || 0),
    expectedImpact: metrics.expectedImpact ? compactText(metrics.expectedImpact, 180) : undefined,
    calendarAction: metrics.calendarAction ? compactText(metrics.calendarAction, 180) : undefined,
    contentPillar: metrics.contentPillar ? compactText(metrics.contentPillar, 120) : undefined,
    targetPlatforms: Array.isArray(metrics.targetPlatforms) ? metrics.targetPlatforms : undefined,
    generatedBy: 'strategy_recommendation',
    workerVersion: metrics.workerVersion,
    promptVersion: metrics.promptVersion,
  };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const [brandProfile, recommendations, published, scheduled, failed, accounts, learningEvents] =
    await Promise.all([
      getBrandProfile(serviceClient, workspaceId),
      serviceClient
        .from('strategy_recommendations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data, error }) => (error ? [] : data || [])),
      serviceClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'published'),
      serviceClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'scheduled'),
      serviceClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['failed', 'partial']),
      serviceClient
        .from('social_accounts')
        .select('id, platform, last_synced_at, health_status, last_sync_status')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true),
      serviceClient
        .from('learning_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('occurred_at', { ascending: false })
        .limit(8)
        .then(({ data, error }) => (error ? [] : data || [])),
    ]);

  const brandCompletion = calculateBrandCompletion(brandProfile);
  const insights: LeverageInsight[] = [];

  if (brandCompletion < 70) {
    const missing = missingBrandFields(brandProfile);
    insights.push({
      id: 'brand-brain-completion',
      type: 'brand',
      title: 'Complete Brand Brain',
      description: `Brand Brain is ${brandCompletion}% complete. Add audience, pillars, examples, and rules so Xocial AI can generate more on-brand strategy.`,
      priority: 'high',
      confidence: 0.95,
      source: 'Brand Brain',
      actionLabel: 'Review Brand Brain',
      action: 'review_brand',
      explanation: {
        reasonSummary: `Brand Brain is below the recommended readiness threshold. Completing ${missing.slice(0, 4).join(', ') || 'the remaining memory fields'} will make AI recommendations more brand-specific.`,
        evidence: [
          `Brand Brain completion is ${brandCompletion}%.`,
          missing.length ? `Missing or sparse fields: ${missing.slice(0, 6).join(', ')}.` : '',
        ].filter(Boolean),
        confidenceScore: 0.95,
        recommendedAction: 'Review Brand Brain and add concrete voice, audience, pillar, and example guidance.',
        generatedBy: 'leverage_overview',
      },
    });
  }

  recommendations.slice(0, 2).forEach((rec: any) => {
    insights.push({
      id: rec.id,
      type: recommendationType(rec.type),
      title: rec.title,
      description: rec.description,
      priority: rec.priority || 'medium',
      confidence: Number(rec.confidence_score || 0.7),
      source: 'Strategy recommendations',
      actionLabel: rec.type === 'timing' ? 'Push to Calendar' : 'Create Draft',
      action: rec.type === 'timing' ? 'push_calendar' : 'create_draft',
      explanation: recommendationExplanation(rec),
    });
  });

  if (safeCount(failed.count) > 0) {
    const failedCount = safeCount(failed.count);
    insights.push({
      id: 'failed-posts',
      type: 'risk',
      title: 'Publishing needs attention',
      description: `${failedCount} recent posts are failed or partially published. Review account health before running more campaigns.`,
      priority: 'critical',
      confidence: 1,
      source: 'Post status',
      actionLabel: 'View Analytics',
      action: 'view_analytics',
      explanation: {
        reasonSummary: 'Xocial found failed or partially published posts, so publishing reliability should be fixed before adding more campaign volume.',
        evidence: [`${failedCount} post${failedCount === 1 ? '' : 's'} currently have failed or partial status.`],
        confidenceScore: 1,
        recommendedAction: 'Open analytics or account health, resolve provider errors, then retry affected platforms.',
        generatedBy: 'leverage_overview',
      },
    });
  }

  if (safeCount(published.count) < 5) {
    const publishedCount = safeCount(published.count);
    insights.push({
      id: 'low-data',
      type: 'learning',
      title: 'Xocial AI needs more publishing data',
      description: 'Publish more posts or connect historical sync data to unlock stronger best-time, prediction, and content pillar recommendations.',
      priority: 'medium',
      confidence: 0.85,
      source: 'Learning loop',
      actionLabel: 'Run AI Audit',
      action: 'run_audit',
      explanation: {
        reasonSummary: 'Best-time, prediction, and content-pattern recommendations need enough published posts and synced metrics to become reliable.',
        evidence: [
          `${publishedCount} published post${publishedCount === 1 ? '' : 's'} available for learning.`,
          `${learningEvents.length} recent learning event${learningEvents.length === 1 ? '' : 's'} loaded in the overview.`,
        ],
        dataCaveats: ['More publishing outcomes, platform metrics, and approval feedback will improve recommendation quality.'],
        confidenceScore: 0.85,
        recommendedAction: 'Publish or sync more historical posts, then run the strategy and analytics workers again.',
        generatedBy: 'leverage_overview',
      },
    });
  }

  return successResponse({
    summary: {
      brandCompletion,
      activeRecommendations: recommendations.length,
      publishedPosts: safeCount(published.count),
      scheduledPosts: safeCount(scheduled.count),
      failedPosts: safeCount(failed.count),
      activeAccounts: accounts.data?.length || 0,
      learningEvents: learningEvents.length,
    },
    insights,
    recommendations,
    recentLearning: learningEvents,
    accounts: accounts.data || [],
    brandProfile,
  });
});
