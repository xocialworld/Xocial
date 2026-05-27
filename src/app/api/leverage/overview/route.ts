import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getBrandProfile } from '@/lib/intelligence/context';
import { calculateBrandCompletion } from '@/lib/intelligence/learning';
import type { LeverageInsight } from '@/types/intelligence';

export const dynamic = 'force-dynamic';

function safeCount(count: number | null) {
  return count ?? 0;
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
    });
  }

  recommendations.slice(0, 2).forEach((rec: any) => {
    insights.push({
      id: rec.id,
      type: rec.type || 'growth',
      title: rec.title,
      description: rec.description,
      priority: rec.priority || 'medium',
      confidence: Number(rec.confidence_score || 0.7),
      source: 'Strategy recommendations',
      actionLabel: rec.type === 'timing' ? 'Push to Calendar' : 'Create Draft',
      action: rec.type === 'timing' ? 'push_calendar' : 'create_draft',
    });
  });

  if (safeCount(failed.count) > 0) {
    insights.push({
      id: 'failed-posts',
      type: 'risk',
      title: 'Publishing needs attention',
      description: `${safeCount(failed.count)} recent posts are failed or partially published. Review account health before running more campaigns.`,
      priority: 'critical',
      confidence: 1,
      source: 'Post status',
      actionLabel: 'View Analytics',
      action: 'view_analytics',
    });
  }

  if (safeCount(published.count) < 5) {
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
