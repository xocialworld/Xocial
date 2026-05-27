import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError, createServiceRoleClient } from '@/lib/api-middleware';
import { platformPublisher } from '@/lib/platforms/publisher';
import type { Platform, PublishResult } from '@/lib/platforms/publisher';
import {
  recordPlatformPosts,
  createInitialAnalytics,
  extractExternalIds,
  extractMediaUrls,
  buildPlatformContentPayload,
  inferMediaTypeFromMedia,
} from '@/lib/platforms/publish-utils';
import {
  normalizeMetadata,
  normalizePlatforms,
  resolveAccountIds,
} from '@/lib/platforms/post-publish-helpers';
import {
  finishJobRun,
  recordPostActivity,
  recordPublishAttempt,
  startJobRun,
} from '@/lib/observability/job-runs';
import { recordLearningEvents } from '@/lib/intelligence/learning';
import { enqueueAgentTask, queuePostIntelligenceTasks } from '@/lib/intelligence/tasks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const { id: postId } = await params;

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, workspace_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new APIError(404, 'Post not found');
    }

    // Verify user has access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', post.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      throw new APIError(403, 'Access denied');
    }

    const platforms = normalizePlatforms(post.platforms);
    if (platforms.length === 0) {
      throw new APIError(400, 'Post does not target any supported platforms');
    }

    const metadata = normalizeMetadata(post.metadata);
    const attemptNo = Number(metadata.publishAttempts || post.publish_attempts || 0) + 1;
    const jobRun = await startJobRun(supabase, {
      workspaceId: post.workspace_id,
      jobType: 'publish_now',
      trigger: 'user',
      metadata: { postId, platforms },
    });

    await recordPostActivity(supabase, {
      workspaceId: post.workspace_id,
      postId,
      actorUserId: user.id,
      source: 'user',
      eventType: 'publish_started',
      statusBefore: post.status,
      statusAfter: post.status,
      jobRunId: jobRun?.id,
      message: 'Publishing started',
      metadata: { platforms },
    });

    await recordLearningEvents(serviceClient, [
      {
        workspaceId: post.workspace_id,
        actorUserId: user.id,
        source: 'publisher',
        eventType: 'publish_started',
        entityType: 'post',
        entityId: postId,
        signalStrength: 0.5,
        metadata: {
          platforms,
          jobRunId: jobRun?.id,
          attemptNo,
        },
      },
    ]);

    const accountIds = await resolveAccountIds(supabase, post.workspace_id, platforms, metadata);

    const mediaUrls = extractMediaUrls(post.media);
    const mediaType = inferMediaTypeFromMedia(post.media);

    const { fallback, perPlatform } = buildPlatformContentPayload(
      post.content,
      platforms,
      mediaUrls,
      mediaType
    );

    // Idempotency: find already published platform posts
    const { data: existingPosts } = await supabase
      .from('platform_posts')
      .select('platform, platform_post_id, permalink, status')
      .eq('post_id', postId)
      .in('platform', post.platforms || []);

    const alreadyPublished = new Set<string>(
      (existingPosts || [])
        .filter((p: any) => p.status === 'published' && p.platform_post_id)
        .map((p: any) => p.platform)
    );

    const pendingPlatforms = platforms.filter((platform) => !alreadyPublished.has(platform));

    const results =
      pendingPlatforms.length > 0
        ? await platformPublisher.publishToAll({
            platforms: pendingPlatforms,
            content: fallback,
            platformContent: perPlatform,
            accountIds,
          })
        : [];

    // Add successes for already published to final results
    const carriedSuccesses: PublishResult[] =
      ((existingPosts || [])
        .filter((p: any) => alreadyPublished.has(p.platform))
        .map((p: any) => ({
          platform: p.platform as Platform,
          success: true,
          platformPostId: p.platform_post_id as string | undefined,
          permalink: p.permalink as string | undefined,
        })) as PublishResult[]) || [];

    const allResults = [...results, ...carriedSuccesses];

    if (results.length > 0) {
      const publishedAt = new Date().toISOString();
      await recordPlatformPosts({
        supabase,
        postId,
        publishResults: results,
        publishedAt,
        workspaceId: post.workspace_id,
        jobRunId: jobRun?.id,
        attemptNo,
      });
      await createInitialAnalytics({
        supabase,
        postId,
        publishResults: results,
      });
    }

    const allSuccessful = allResults.length > 0 && allResults.every((r) => r.success);
    const anySuccessful = allResults.some((r) => r.success);
    const firstError = allResults.find((r) => !r.success)?.error || null;
    const publishedAt = anySuccessful ? new Date().toISOString() : null;

    await Promise.all(
      allResults.map((result) =>
        recordPublishAttempt(supabase, {
          workspaceId: post.workspace_id,
          postId,
          platform: result.platform,
          socialAccountId: result.accountId || accountIds[result.platform] || null,
          attemptNo,
          status: result.success ? 'published' : 'failed',
          platformPostId: result.platformPostId || null,
          permalink: result.permalink || null,
          errorMessage: result.success ? null : result.error || 'Publish failed',
          jobRunId: jobRun?.id,
          responseMetadata: { carried: alreadyPublished.has(result.platform) },
        })
      )
    );

    const updates: Record<string, any> = {
      status: allSuccessful ? 'published' : anySuccessful ? 'partial' : 'failed',
      error_message: firstError,
      publish_attempts: attemptNo,
      last_publish_error: firstError,
      metadata: {
        ...metadata,
        accountIds,
        publishResults: allResults,
        publishAttempts: attemptNo,
        lastPublishJobRunId: jobRun?.id,
      },
    };

    if (anySuccessful) {
      updates.published_at = publishedAt;
      updates.external_post_id = JSON.stringify(extractExternalIds(allResults));
    } else {
      updates.published_at = null;
    }

    await supabase.from('posts').update(updates).eq('id', postId);

    await recordPostActivity(supabase, {
      workspaceId: post.workspace_id,
      postId,
      actorUserId: user.id,
      source: 'user',
      eventType: allSuccessful
        ? 'publish_succeeded'
        : anySuccessful
          ? 'publish_partial'
          : 'publish_failed',
      statusBefore: post.status,
      statusAfter: updates.status,
      jobRunId: jobRun?.id,
      message: allSuccessful
        ? 'Published to all selected platforms'
        : anySuccessful
          ? 'Published to some platforms with errors'
          : 'Failed to publish to selected platforms',
      errorMessage: firstError,
      metadata: { results: allResults },
    });

    await recordLearningEvents(serviceClient, [
      {
        workspaceId: post.workspace_id,
        actorUserId: user.id,
        source: 'publisher',
        eventType: allSuccessful
          ? 'publish_succeeded'
          : anySuccessful
            ? 'publish_partial'
            : 'publish_failed',
        entityType: 'post',
        entityId: postId,
        signalStrength: allSuccessful ? 1 : anySuccessful ? 0.65 : 0.2,
        metadata: {
          platforms,
          results: allResults,
          status: updates.status,
          errorMessage: firstError,
          jobRunId: jobRun?.id,
          attemptNo,
        },
      },
      anySuccessful
        ? {
            workspaceId: post.workspace_id,
            actorUserId: user.id,
            source: 'publisher',
            eventType: 'post_published' as const,
            entityType: 'post',
            entityId: postId,
            signalStrength: allSuccessful ? 1 : 0.75,
            metadata: {
              platforms: allResults.filter((result) => result.success).map((result) => result.platform),
              results: allResults,
              status: updates.status,
              jobRunId: jobRun?.id,
              attemptNo,
            },
          }
        : null,
    ]);

    await queuePostIntelligenceTasks(serviceClient, {
      workspaceId: post.workspace_id,
      postId,
      platforms,
      reason: allSuccessful ? 'publish_succeeded' : anySuccessful ? 'publish_partial' : 'publish_failed',
      priority: anySuccessful ? 7 : 5,
    });
    await enqueueAgentTask(serviceClient, {
      workspaceId: post.workspace_id,
      agentType: anySuccessful ? 'performance_analyst' : 'safety',
      entityType: 'post',
      entityId: postId,
      priority: anySuccessful ? 4 : 6,
      inputPayload: {
        trigger: allSuccessful ? 'publish_succeeded' : anySuccessful ? 'publish_partial' : 'publish_failed',
        platforms,
        results: allResults,
      },
    });

    await finishJobRun(supabase, jobRun?.id, {
      status: allSuccessful ? 'succeeded' : anySuccessful ? 'partial' : 'failed',
      processedCount: allResults.length,
      succeededCount: allResults.filter((result) => result.success).length,
      failedCount: allResults.filter((result) => !result.success).length,
      errorMessage: firstError,
      metadata: { postId, results: allResults },
    });

    if (!anySuccessful) {
      return NextResponse.json(
        {
          success: false,
          data: {
            post: { ...post, ...updates },
            platformPosts: [],
            results: allResults,
            partial: false,
          },
          results: allResults,
          message: 'Failed to publish to any platform',
          error: {
            code: 'PUBLISH_FAILED',
            message: firstError || 'Failed to publish to any platform',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: allSuccessful,
      data: {
        post: { ...post, ...updates },
        platformPosts: [],
        results: allResults,
        partial: !allSuccessful,
      },
      partial: !allSuccessful,
      results: allResults,
      message: allSuccessful
        ? 'Published to all platforms successfully'
        : 'Published to some platforms with errors',
      error: firstError,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
