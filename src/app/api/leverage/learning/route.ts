import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import {
  evaluateLearningLoopReadiness,
  evaluateWorkerArtifactQuality,
} from '@/lib/intelligence/evaluation';
import { getBrandProfile } from '@/lib/intelligence/context';

export const dynamic = 'force-dynamic';

const REQUIRED_EVENT_TYPES = [
  'post_created',
  'platform_variant_created',
  'ai_generated',
  'publish_succeeded',
  'metric_synced',
  'approval_approved',
  'approval_rejected',
  'ai_feedback_recorded',
  'content_classified',
];

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const [events, artifacts, tasks, feedbackActions, brandVersions, outcomes, approvalSignals, brandProfile] =
    await Promise.all([
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
    serviceClient
      .from('ai_feedback_actions')
      .select('id, target_type, action, reason_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => (error ? [] : data || [])),
    serviceClient
      .from('workspace_brand_profile_versions')
      .select('id, version_no, changed_fields, change_source, change_reason, created_at')
      .eq('workspace_id', workspaceId)
      .order('version_no', { ascending: false })
      .limit(10)
      .then(({ data, error }) => (error ? [] : data || [])),
    serviceClient
      .from('post_outcome_summaries')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(200)
      .then(({ data, error }) => (error ? [] : data || [])),
    serviceClient
      .from('approval_learning_signals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(200)
      .then(({ data, error }) => (error ? [] : data || [])),
    getBrandProfile(serviceClient, workspaceId),
  ]);

  const sourceCounts = events.reduce((acc: Record<string, number>, event: any) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});
  const eventCoverage = REQUIRED_EVENT_TYPES.map((eventType) => ({
    eventType,
    count: sourceCounts[eventType] || 0,
    covered: Boolean(sourceCounts[eventType]),
  }));
  const taskStats = tasks.reduce(
    (acc: Record<string, any>, task: any) => {
      const status = String(task.status || 'unknown');
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      const agent = String(task.agent_type || 'unknown');
      const current = acc.byAgent[agent] || { total: 0, failed: 0, succeeded: 0, running: 0, queued: 0 };
      current.total += 1;
      current[status] = (current[status] || 0) + 1;
      acc.byAgent[agent] = current;
      if (status === 'failed') acc.failed += 1;
      if (status === 'running') acc.running += 1;
      if (status === 'queued') acc.queued += 1;
      if (status === 'succeeded') acc.succeeded += 1;
      return acc;
    },
    { byStatus: {}, byAgent: {}, failed: 0, running: 0, queued: 0, succeeded: 0 }
  );
  const feedbackStats = feedbackActions.reduce(
    (acc: Record<string, any>, feedback: any) => {
      acc.total += 1;
      acc.byAction[feedback.action] = (acc.byAction[feedback.action] || 0) + 1;
      acc.byTarget[feedback.target_type] = (acc.byTarget[feedback.target_type] || 0) + 1;
      return acc;
    },
    { total: 0, byAction: {}, byTarget: {} }
  );
  const acceptedArtifacts = artifacts.filter((artifact: any) => artifact.status === 'accepted').length;
  const ignoredArtifacts = artifacts.filter((artifact: any) => artifact.status === 'ignored').length;
  const activeArtifacts = artifacts.filter((artifact: any) => artifact.status === 'active').length;
  const artifactQuality = artifacts.map((artifact: any) => ({
    id: artifact.id,
    artifactType: artifact.artifact_type,
    ...evaluateWorkerArtifactQuality(artifact),
  }));
  const learningLoopReadiness = evaluateLearningLoopReadiness({
    learningEvents: events.length,
    outcomeSummaries: outcomes.length,
    approvalSignals: approvalSignals.length,
    feedbackActions: feedbackActions.length,
    brandCompletion: Number(brandProfile.confidence_score || 0),
    workerArtifacts: artifacts.length,
  });

  return successResponse({
    events,
    artifacts,
    tasks,
    feedbackActions,
    brandVersions,
    sourceCounts,
    eventCoverage,
    taskStats,
    feedbackStats,
    learningLoopReadiness,
    artifactStats: {
      active: activeArtifacts,
      accepted: acceptedArtifacts,
      ignored: ignoredArtifacts,
      quality: artifactQuality.slice(0, 20),
      acceptanceRate:
        acceptedArtifacts + ignoredArtifacts > 0
          ? Number((acceptedArtifacts / (acceptedArtifacts + ignoredArtifacts)).toFixed(2))
          : 0,
      averageConfidence:
        artifacts.length > 0
          ? Number(
              (
                artifacts.reduce((sum: number, artifact: any) => sum + Number(artifact.confidence || 0), 0) /
                artifacts.length
              ).toFixed(2)
            )
          : 0,
    },
    sources: {
      publishedPosts: true,
      analytics: true,
      approvals: true,
      comments: true,
      hashtags: true,
      feedback: feedbackActions.length > 0,
      brandVersions: brandVersions.length > 0,
      uploadedDocuments: false,
    },
  });
});
