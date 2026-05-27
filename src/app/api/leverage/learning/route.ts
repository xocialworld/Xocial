import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const [events, artifacts, tasks] = await Promise.all([
    serviceClient
      .from('learning_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('occurred_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => (error ? [] : data || [])),
    serviceClient
      .from('agent_artifacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('artifact_type', [
        'brand_suggestion',
        'performance_insight',
        'strategy_plan',
        'best_time_recommendation',
        'safety_warning',
        'weekly_report',
      ])
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => (error ? [] : data || [])),
    serviceClient
      .from('agent_tasks')
      .select('id, agent_type, status, priority, entity_type, entity_id, error_message, retry_count, scheduled_for, started_at, finished_at, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => (error ? [] : data || [])),
  ]);

  const sourceCounts = events.reduce((acc: Record<string, number>, event: any) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  return successResponse({
    events,
    artifacts,
    tasks,
    sourceCounts,
    sources: {
      publishedPosts: true,
      analytics: true,
      approvals: true,
      comments: true,
      hashtags: true,
      competitors: false,
    },
  });
});
