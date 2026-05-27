/**
 * Cron Job: Automated Post Publishing
 * Publishes scheduled posts when invoked by a cron provider
 *
 * Features:
 * - Publishing lock to prevent duplicate processing
 * - Retry logic with exponential backoff
 * - Error categorization (retryable vs permanent)
 * - Partial success handling (some platforms succeed)
 *
 * Triggered by: Vercel Cron, an external scheduler, or a manual secure request
 * Recommended schedule: every minute when the hosting plan supports it
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  withCronVerification,
  cronSuccessResponse,
  cronErrorResponse,
} from '@/lib/cron-verification';
import { PlatformPublisher, type Platform, type PublishResult } from '@/lib/platforms/publisher';
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
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { enqueueAgentTask, queuePostIntelligenceTasks } from '@/lib/intelligence/tasks';

// Maximum retry attempts before permanent failure. Instagram video/Reels
// containers can remain in Meta processing for several minutes.
const MAX_RETRY_ATTEMPTS = 6;

// Backoff intervals (minutes) for each retry
const RETRY_BACKOFF_MINUTES = [1, 2, 5, 10, 15, 30];
const PUBLISHING_LOCK_TTL_MINUTES = 10;
const PUBLISH_POST_SELECT = `
  *,
  workspace:workspaces!inner(id, name),
  social_account:social_accounts(*)
`;

function isPlatform(value: unknown): value is Platform {
  return (
    typeof value === 'string' &&
    ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'].includes(value)
  );
}

function addCarriedSuccess(
  carried: Map<Platform, PublishResult>,
  platform: unknown,
  result: Partial<PublishResult> = {}
) {
  if (!isPlatform(platform) || carried.has(platform)) {
    return;
  }

  carried.set(platform, {
    platform,
    success: true,
    accountId: result.accountId,
    platformPostId: result.platformPostId,
    permalink: result.permalink,
  });
}

function hasFreshPublishingLock(metadata: unknown, now: Date): boolean {
  const normalized = normalizeMetadata(metadata);
  const startedAt = normalized.publishingLock?.startedAt;

  if (!startedAt || typeof startedAt !== 'string') {
    return false;
  }

  const startedAtMs = new Date(startedAt).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return false;
  }

  const lockAgeMs = now.getTime() - startedAtMs;
  return lockAgeMs >= 0 && lockAgeMs < PUBLISHING_LOCK_TTL_MINUTES * 60 * 1000;
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (error?.retryable === true) return true;

  // Server errors (5xx) are retryable
  if (error?.originalStatus >= 500) return true;

  // Rate limit errors are retryable
  if (error?.type === 'RATE_LIMIT' || error?.type === 'SERVER_ERROR') return true;

  // Specific retryable error messages
  const retryableMessages = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'rate limit',
    'too many requests',
    'temporarily unavailable',
    'service unavailable',
    'internal server error',
    'container was not ready',
    'in_progress',
    'media id is not available',
  ];

  const errorMessage = (error?.message || error?.error || '').toLowerCase();
  return retryableMessages.some((msg) => errorMessage.includes(msg));
}

function buildPendingPlatformPublishes(
  metadata: Record<string, any>,
  publishResults: PublishResult[]
) {
  const existing =
    metadata.pendingPlatformPublishes &&
    typeof metadata.pendingPlatformPublishes === 'object' &&
    !Array.isArray(metadata.pendingPlatformPublishes)
      ? metadata.pendingPlatformPublishes
      : {};
  const next: Record<string, any> = { ...existing };
  const now = new Date().toISOString();

  publishResults.forEach((result) => {
    if (!isPlatform(result.platform)) return;

    if (result.success) {
      delete next[result.platform];
      return;
    }

    if (result.retryable) {
      next[result.platform] = {
        ...(result.providerState || {}),
        platform: result.platform,
        accountId: result.accountId,
        retryable: true,
        error: result.error,
        errorCode: result.errorCode,
        updatedAt: now,
      };
      return;
    }

    delete next[result.platform];
  });

  return next;
}

function hasPendingPlatformPublishes(pending: Record<string, any>) {
  return Object.keys(pending).length > 0;
}

/**
 * Calculate next retry time based on attempt number
 */
function calculateNextRetryTime(attemptNumber: number): Date {
  const backoffMinutes =
    RETRY_BACKOFF_MINUTES[Math.min(attemptNumber, RETRY_BACKOFF_MINUTES.length - 1)];
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
  return nextRetry;
}

/**
 * GET /api/cron/publish
 * Publishes all posts that are scheduled for now or earlier
 */
export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    console.log('[Cron: Publish] Starting automated publishing job');

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    const jobRun = await startJobRun(supabase, {
      jobType: 'publish_scheduled',
      trigger: 'cron',
      metadata: { invokedAt: new Date().toISOString() },
    });

    // Get scheduled posts that are due. The production posts table constraint does
    // not currently allow a transient "publishing" status, so locking uses an
    // optimistic updated_at match instead of a status transition.
    const now = new Date();
    const { data: dueScheduledPosts, error: scheduledFetchError } = await supabase
      .from('posts')
      .select(PUBLISH_POST_SELECT)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (scheduledFetchError) {
      console.error('[Cron: Publish] Error fetching scheduled posts:', scheduledFetchError);
      return cronErrorResponse('Failed to fetch scheduled posts', scheduledFetchError);
    }

    const freshLockCount = (dueScheduledPosts || []).filter((post) =>
      hasFreshPublishingLock(post.metadata, now)
    ).length;

    const scheduledPosts = [...(dueScheduledPosts || [])]
      .filter((post, index, list) => list.findIndex((item) => item.id === post.id) === index)
      .filter((post) => !hasFreshPublishingLock(post.metadata, now))
      .sort((a, b) => {
        const aTime = new Date(a.scheduled_at || a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.scheduled_at || b.updated_at || b.created_at).getTime();
        return aTime - bTime;
      })
      .slice(0, 50);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('[Cron: Publish] No posts to publish');
      await finishJobRun(supabase, jobRun?.id, {
        status: 'succeeded',
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        metadata: {
          dueScheduled: dueScheduledPosts?.length || 0,
          skippedFreshLocks: freshLockCount,
        },
      });
      return cronSuccessResponse({
        message: 'No posts to publish',
        processed: 0,
        dueScheduled: dueScheduledPosts?.length || 0,
        skippedFreshLocks: freshLockCount,
        stuckPublishing: 0,
        now: now.toISOString(),
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Publish] Found ${scheduledPosts.length} posts to publish`);

    const results: Array<{
      postId: string;
      success: boolean;
      platforms?: string[];
      errors?: string[];
      error?: string;
      duration: number;
      retryScheduled?: boolean;
    }> = [];

    const publisher = new PlatformPublisher();

    // Process each post
    for (const post of scheduledPosts) {
      const postStartTime = Date.now();
      const metadata = normalizeMetadata(post.metadata);
      const retryCount = metadata.retryCount || 0;

      try {
        console.log(`[Cron: Publish] Processing post ${post.id} (attempt ${retryCount + 1})`);

        // Acquire an optimistic lock without using an unsupported transient status.
        const lockId = `${post.id}:${Date.now()}`;
        const { data: lockedPost, error: lockError } = await supabase
          .from('posts')
          .update({
            updated_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              publishingLock: {
                id: lockId,
                startedAt: new Date().toISOString(),
                expiresAt: new Date(
                  Date.now() + PUBLISHING_LOCK_TTL_MINUTES * 60 * 1000
                ).toISOString(),
              },
            },
          })
          .eq('id', post.id)
          .eq('status', 'scheduled')
          .eq('updated_at', post.updated_at)
          .select()
          .maybeSingle();

        if (lockError || !lockedPost) {
          console.log(`[Cron: Publish] Post ${post.id} already being processed or status changed`);
          continue; // Skip - already being processed by another instance
        }

        const platforms = normalizePlatforms(post.platforms);

        if (platforms.length === 0) {
          throw new Error('No supported platforms found for this post');
        }

        const carriedSuccesses = new Map<Platform, PublishResult>();
        const { data: existingPlatformPosts, error: existingPlatformPostsError } = await supabase
          .from('platform_posts')
          .select('platform, platform_post_id, external_id, permalink, status')
          .eq('post_id', post.id)
          .eq('status', 'published')
          .in('platform', platforms);

        if (existingPlatformPostsError) {
          throw new Error(
            `Failed to read existing platform posts: ${existingPlatformPostsError.message}`
          );
        }

        (existingPlatformPosts || []).forEach((platformPost: any) => {
          addCarriedSuccess(carriedSuccesses, platformPost.platform, {
            platformPostId: platformPost.platform_post_id || platformPost.external_id,
            permalink: platformPost.permalink,
          });
        });

        if (Array.isArray(metadata.publishResults)) {
          metadata.publishResults
            .filter((result: any) => result?.success)
            .forEach((result: any) => {
              addCarriedSuccess(carriedSuccesses, result.platform, {
                accountId: result.accountId,
                platformPostId: result.platformPostId,
                permalink: result.permalink,
              });
            });
        }

        if (Array.isArray(metadata.successfulPlatforms)) {
          metadata.successfulPlatforms.forEach((platform: unknown) => {
            addCarriedSuccess(carriedSuccesses, platform);
          });
        }

        const pendingPlatforms = platforms.filter((platform) => !carriedSuccesses.has(platform));
        const accountIds =
          pendingPlatforms.length > 0
            ? await resolveAccountIds(supabase, post.workspace_id, pendingPlatforms, metadata)
            : {};

        const mediaUrls = extractMediaUrls(post.media);
        const mediaType = inferMediaTypeFromMedia(post.media);

        const { fallback, perPlatform } = buildPlatformContentPayload(
          post.content,
          pendingPlatforms,
          mediaUrls,
          mediaType
        );

        // Publish to all platforms
        const publishResults =
          pendingPlatforms.length > 0
            ? await publisher.publishToAll({
                platforms: pendingPlatforms,
                content: fallback,
                platformContent: perPlatform,
                platformStates: metadata.pendingPlatformPublishes,
                accountIds,
              })
            : [];

        const allPublishResults = [...publishResults, ...carriedSuccesses.values()];
        const nextPendingPlatformPublishes = buildPendingPlatformPublishes(
          metadata,
          publishResults
        );
        const hasPendingRetries = hasPendingPlatformPublishes(nextPendingPlatformPublishes);
        const attemptNo = retryCount + 1;
        const mergedAccountIds = {
          ...(typeof metadata.accountIds === 'object' && metadata.accountIds
            ? metadata.accountIds
            : {}),
          ...accountIds,
        };

        // Analyze results
        const allSucceeded = platforms.every((platform) =>
          allPublishResults.some((result) => result.platform === platform && result.success)
        );
        const someSucceeded = allPublishResults.some((r) => r.success);
        const externalIds = extractExternalIds(allPublishResults);
        const errors: string[] = [];
        let hasRetryableError = false;

        allPublishResults.forEach((result) => {
          if (!result.success && result.error) {
            errors.push(`${result.platform}: ${result.error}`);
            if (isRetryableError(result)) {
              hasRetryableError = true;
            }
          }
        });

        if (publishResults.length > 0) {
          await recordPlatformPosts({
            supabase,
            postId: post.id,
            publishResults,
            workspaceId: post.workspace_id,
            jobRunId: jobRun?.id,
            attemptNo,
          });

          await createInitialAnalytics({
            supabase,
            postId: post.id,
            publishResults,
          });

          await Promise.all(
            publishResults.map((result) =>
              recordPublishAttempt(supabase, {
                workspaceId: post.workspace_id,
                postId: post.id,
                platform: result.platform,
                socialAccountId: result.accountId || mergedAccountIds[result.platform] || null,
                attemptNo,
                status: result.success ? 'published' : result.retryable ? 'pending' : 'failed',
                platformPostId: result.platformPostId || null,
                permalink: result.permalink || null,
                errorMessage: result.success ? null : result.error || 'Publish failed',
                retryable: result.retryable,
                errorCode: result.errorCode || null,
                jobRunId: jobRun?.id,
                responseMetadata: result.providerState || {},
              })
            )
          );
        }

        // Update post with results
        if (allSucceeded) {
          // Complete success
          const publishedAt = new Date().toISOString();

          await supabase
            .from('posts')
            .update({
              status: 'published',
              published_at: publishedAt,
              error_message: null,
              external_post_id: JSON.stringify(externalIds),
              metadata: {
                ...metadata,
                accountIds: mergedAccountIds,
                publishResults: allPublishResults,
                publishedAt,
                retryCount: undefined, // Clear retry count on success
                publishAttempts: attemptNo,
                lastPublishJobRunId: jobRun?.id,
                publishingLock: undefined,
                pendingPlatformPublishes: undefined,
              },
            })
            .eq('id', post.id);

          await recordPostActivity(supabase, {
            workspaceId: post.workspace_id,
            postId: post.id,
            source: 'cron',
            eventType: 'publish_succeeded',
            statusBefore: post.status,
            statusAfter: 'published',
            jobRunId: jobRun?.id,
            message: 'Scheduled post published to all platforms',
            metadata: { results: allPublishResults },
          });

          await recordLearningEvent(supabase, {
            workspaceId: post.workspace_id,
            source: 'cron',
            eventType: 'post_published',
            entityType: 'post',
            entityId: post.id,
            signalStrength: 1,
            metadata: { platforms: post.platforms, results: allPublishResults },
          });
          await queuePostIntelligenceTasks(supabase, {
            workspaceId: post.workspace_id,
            postId: post.id,
            platforms: normalizePlatforms(post.platforms),
            reason: 'scheduled_publish_succeeded',
            priority: 7,
          });
          await enqueueAgentTask(supabase, {
            workspaceId: post.workspace_id,
            agentType: 'performance_analyst',
            entityType: 'post',
            entityId: post.id,
            priority: 4,
            inputPayload: { trigger: 'scheduled_publish_succeeded' },
          });

          console.log(`[Cron: Publish] Successfully published post ${post.id}`);

          results.push({
            postId: post.id,
            success: true,
            platforms: post.platforms,
            duration: Date.now() - postStartTime,
          });
        } else if (someSucceeded) {
          // Partial success. If the remaining platform failures are retryable,
          // keep the post scheduled so the next cron ticks continue only the
          // failed platforms while carried successes prevent duplicates.
          const publishedAt = new Date().toISOString();
          const successfulPlatforms = allPublishResults
            .filter((r) => r.success)
            .map((r) => r.platform);
          const failedPlatforms = allPublishResults
            .filter((r) => !r.success)
            .map((r) => r.platform);
          const shouldRetryPartial = hasRetryableError && retryCount < MAX_RETRY_ATTEMPTS;

          if (shouldRetryPartial) {
            const nextRetryTime = calculateNextRetryTime(retryCount);

            await supabase
              .from('posts')
              .update({
                status: 'scheduled',
                scheduled_at: nextRetryTime.toISOString(),
                published_at: publishedAt,
                error_message: `Published to ${successfulPlatforms.join(', ')}. Retrying: ${errors.join('; ')}`,
                external_post_id: JSON.stringify(externalIds),
                metadata: {
                  ...metadata,
                  accountIds: mergedAccountIds,
                  publishResults: allPublishResults,
                  publishedAt,
                  successfulPlatforms,
                  failedPlatforms,
                  retryCount: retryCount + 1,
                  publishAttempts: attemptNo,
                  lastFailedAt: new Date().toISOString(),
                  nextRetryAt: nextRetryTime.toISOString(),
                  lastPublishJobRunId: jobRun?.id,
                  pendingPlatformPublishes: nextPendingPlatformPublishes,
                  publishingLock: undefined,
                },
              })
              .eq('id', post.id);

            await recordPostActivity(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              source: 'cron',
              eventType: 'publish_retry_scheduled',
              statusBefore: post.status,
              statusAfter: 'scheduled',
              jobRunId: jobRun?.id,
              message: `Published to ${successfulPlatforms.join(', ')}; retry scheduled for ${failedPlatforms.join(', ')}`,
              errorMessage: errors.join('; '),
              metadata: {
                results: allPublishResults,
                nextRetryAt: nextRetryTime.toISOString(),
                pendingPlatformPublishes: nextPendingPlatformPublishes,
              },
            });

            await recordLearningEvent(supabase, {
              workspaceId: post.workspace_id,
              source: 'cron',
              eventType: 'publish_retry_scheduled',
              entityType: 'post',
              entityId: post.id,
              signalStrength: 0.45,
              metadata: {
                results: allPublishResults,
                nextRetryAt: nextRetryTime.toISOString(),
                pendingPlatformPublishes: nextPendingPlatformPublishes,
              },
            });

            results.push({
              postId: post.id,
              success: false,
              platforms: post.platforms,
              errors,
              duration: Date.now() - postStartTime,
              retryScheduled: true,
            });
          } else {
            await supabase
              .from('posts')
              .update({
                status: 'partial',
                published_at: publishedAt,
                error_message: `Published to ${successfulPlatforms.join(', ')}. Failed: ${errors.join('; ')}`,
                external_post_id: JSON.stringify(externalIds),
                metadata: {
                  ...metadata,
                  accountIds: mergedAccountIds,
                  publishResults: allPublishResults,
                  publishedAt,
                  successfulPlatforms,
                  failedPlatforms,
                  publishAttempts: attemptNo,
                  lastPublishJobRunId: jobRun?.id,
                  pendingPlatformPublishes: hasPendingRetries
                    ? nextPendingPlatformPublishes
                    : undefined,
                  publishingLock: undefined,
                },
              })
              .eq('id', post.id);

            await recordPostActivity(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              source: 'cron',
              eventType: 'publish_partial',
              statusBefore: post.status,
              statusAfter: 'partial',
              jobRunId: jobRun?.id,
              message: 'Scheduled post published to some platforms with errors',
              errorMessage: errors.join('; '),
              metadata: { results: allPublishResults },
            });

            await recordLearningEvent(supabase, {
              workspaceId: post.workspace_id,
              source: 'cron',
              eventType: 'publish_failed',
              entityType: 'post',
              entityId: post.id,
              signalStrength: 0.35,
              metadata: { platforms: post.platforms, results: allPublishResults, errors },
            });
            await queuePostIntelligenceTasks(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              platforms: normalizePlatforms(post.platforms),
              reason: 'scheduled_publish_partial',
              priority: 5,
            });

            console.log(
              `[Cron: Publish] Partial success for post ${post.id}: ${successfulPlatforms.join(', ')}`
            );

            results.push({
              postId: post.id,
              success: false,
              platforms: post.platforms,
              errors,
              duration: Date.now() - postStartTime,
            });
          }
        } else {
          // Complete failure - determine if we should retry
          const shouldRetry = hasRetryableError && retryCount < MAX_RETRY_ATTEMPTS;

          if (shouldRetry) {
            // Schedule retry with backoff
            const nextRetryTime = calculateNextRetryTime(retryCount);

            await supabase
              .from('posts')
              .update({
                status: 'scheduled', // Back to scheduled for retry
                scheduled_at: nextRetryTime.toISOString(),
                error_message: `Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}: ${errors.join('; ')}`,
                metadata: {
                  ...metadata,
                  accountIds: mergedAccountIds,
                  publishResults: allPublishResults,
                  retryCount: retryCount + 1,
                  publishAttempts: attemptNo,
                  lastFailedAt: new Date().toISOString(),
                  nextRetryAt: nextRetryTime.toISOString(),
                  pendingPlatformPublishes: nextPendingPlatformPublishes,
                  publishingLock: undefined,
                },
              })
              .eq('id', post.id);

            console.log(
              `[Cron: Publish] Scheduled retry for post ${post.id} at ${nextRetryTime.toISOString()}`
            );
            await recordPostActivity(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              source: 'cron',
              eventType: 'publish_retry_scheduled',
              statusBefore: post.status,
              statusAfter: 'scheduled',
              jobRunId: jobRun?.id,
              message: `Scheduled retry for ${nextRetryTime.toISOString()}`,
              errorMessage: errors.join('; '),
              metadata: {
                results: allPublishResults,
                nextRetryAt: nextRetryTime.toISOString(),
                pendingPlatformPublishes: nextPendingPlatformPublishes,
              },
            });

            await recordLearningEvent(supabase, {
              workspaceId: post.workspace_id,
              source: 'cron',
              eventType: 'publish_retry_scheduled',
              entityType: 'post',
              entityId: post.id,
              signalStrength: 0.35,
              metadata: {
                results: allPublishResults,
                nextRetryAt: nextRetryTime.toISOString(),
                pendingPlatformPublishes: nextPendingPlatformPublishes,
              },
            });

            results.push({
              postId: post.id,
              success: false,
              platforms: post.platforms,
              errors,
              duration: Date.now() - postStartTime,
              retryScheduled: true,
            });
          } else {
            // Permanent failure
            await supabase
              .from('posts')
              .update({
                status: 'failed',
                error_message:
                  retryCount >= MAX_RETRY_ATTEMPTS
                    ? `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errors.join('; ')}`
                    : errors.join('; '),
                metadata: {
                  ...metadata,
                  accountIds: mergedAccountIds,
                  publishResults: allPublishResults,
                  publishAttempts: attemptNo,
                  failedAt: new Date().toISOString(),
                  finalRetryCount: retryCount,
                  pendingPlatformPublishes: undefined,
                  publishingLock: undefined,
                },
              })
              .eq('id', post.id);

            console.error(`[Cron: Publish] Permanent failure for post ${post.id}:`, errors);
            await recordPostActivity(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              source: 'cron',
              eventType: 'publish_failed',
              statusBefore: post.status,
              statusAfter: 'failed',
              jobRunId: jobRun?.id,
              message: 'Scheduled publish failed',
              errorMessage: errors.join('; '),
              metadata: { results: allPublishResults },
            });

            await recordLearningEvent(supabase, {
              workspaceId: post.workspace_id,
              source: 'cron',
              eventType: 'publish_failed',
              entityType: 'post',
              entityId: post.id,
              signalStrength: 0.25,
              metadata: { platforms: post.platforms, results: allPublishResults, errors },
            });
            await queuePostIntelligenceTasks(supabase, {
              workspaceId: post.workspace_id,
              postId: post.id,
              platforms: normalizePlatforms(post.platforms),
              reason: 'scheduled_publish_failed',
              priority: 5,
            });

            results.push({
              postId: post.id,
              success: false,
              platforms: post.platforms,
              errors,
              duration: Date.now() - postStartTime,
            });
          }
        }
      } catch (error: any) {
        console.error(`[Cron: Publish] Unexpected error processing post ${post.id}:`, error);

        // Check if error is retryable
        const shouldRetry = isRetryableError(error) && retryCount < MAX_RETRY_ATTEMPTS;

        if (shouldRetry) {
          const nextRetryTime = calculateNextRetryTime(retryCount);

          await supabase
            .from('posts')
            .update({
              status: 'scheduled',
              scheduled_at: nextRetryTime.toISOString(),
              error_message: `Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}: ${error.message}`,
              metadata: {
                ...metadata,
                retryCount: retryCount + 1,
                lastError: error.message,
                nextRetryAt: nextRetryTime.toISOString(),
                publishingLock: undefined,
              },
            })
            .eq('id', post.id);

          results.push({
            postId: post.id,
            success: false,
            error: error.message,
            duration: Date.now() - postStartTime,
            retryScheduled: true,
          });
        } else {
          await supabase
            .from('posts')
            .update({
              status: 'failed',
              error_message: error.message || 'Unknown error during publishing',
              metadata: {
                ...metadata,
                failedAt: new Date().toISOString(),
                lastError: error.message,
                publishingLock: undefined,
              },
            })
            .eq('id', post.id);

          results.push({
            postId: post.id,
            success: false,
            error: error.message || 'Unknown error',
            duration: Date.now() - postStartTime,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success && !r.retryScheduled).length;
    const retryCount = results.filter((r) => r.retryScheduled).length;
    const totalDuration = Date.now() - startTime;

    console.log(
      `[Cron: Publish] Completed: ${successCount} succeeded, ${failureCount} failed, ${retryCount} scheduled for retry in ${totalDuration}ms`
    );
    await finishJobRun(supabase, jobRun?.id, {
      status:
        failureCount > 0
          ? successCount > 0 || retryCount > 0
            ? 'partial'
            : 'failed'
          : 'succeeded',
      processedCount: results.length,
      succeededCount: successCount,
      failedCount: failureCount,
      retryCount,
      metadata: {
        dueScheduled: dueScheduledPosts?.length || 0,
        skippedFreshLocks: freshLockCount,
        results,
      },
    });

    return cronSuccessResponse({
      message: 'Publishing job completed',
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      retryScheduled: retryCount,
      duration: totalDuration,
      dueScheduled: dueScheduledPosts?.length || 0,
      skippedFreshLocks: freshLockCount,
      stuckPublishing: 0,
      now: now.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('[Cron: Publish] Fatal error:', error);
    return cronErrorResponse('Fatal error during publishing', {
      error: error.message,
      stack: error.stack,
    });
  }
});

// Prevent caching of cron responses
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
