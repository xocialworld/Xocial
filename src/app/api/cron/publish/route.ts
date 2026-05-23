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
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { PlatformPublisher } from '@/lib/platforms/publisher';
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

// Maximum retry attempts before permanent failure
const MAX_RETRY_ATTEMPTS = 3;

// Backoff intervals (minutes) for each retry
const RETRY_BACKOFF_MINUTES = [5, 15, 60];
const PUBLISHING_LOCK_TTL_MINUTES = 10;
const PUBLISH_POST_SELECT = `
  *,
  workspace:workspaces!inner(id, name),
  social_account:social_accounts(*)
`;

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
  // Server errors (5xx) are retryable
  if (error.originalStatus >= 500) return true;
  
  // Rate limit errors are retryable
  if (error.type === 'RATE_LIMIT' || error.type === 'SERVER_ERROR') return true;
  
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
  ];
  
  const errorMessage = (error.message || '').toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Calculate next retry time based on attempt number
 */
function calculateNextRetryTime(attemptNumber: number): Date {
  const backoffMinutes = RETRY_BACKOFF_MINUTES[Math.min(attemptNumber, RETRY_BACKOFF_MINUTES.length - 1)];
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

        const accountIds = await resolveAccountIds(
          supabase,
          post.workspace_id,
          platforms,
          metadata
        );

        const mediaUrls = extractMediaUrls(post.media);
        const mediaType = inferMediaTypeFromMedia(post.media);

        const { fallback, perPlatform } = buildPlatformContentPayload(
          post.content,
          platforms,
          mediaUrls,
          mediaType
        );

        // Publish to all platforms
        const publishResults = await publisher.publishToAll({
          platforms,
          content: fallback,
          platformContent: perPlatform,
          accountIds,
        });

        // Analyze results
        const allSucceeded = publishResults.every((r) => r.success);
        const someSucceeded = publishResults.some((r) => r.success);
        const externalIds = extractExternalIds(publishResults);
        const errors: string[] = [];
        let hasRetryableError = false;

        publishResults.forEach((result) => {
          if (!result.success && result.error) {
            errors.push(`${result.platform}: ${result.error}`);
            if (isRetryableError(result)) {
              hasRetryableError = true;
            }
          }
        });

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
                accountIds,
                publishResults,
                publishedAt,
                retryCount: undefined, // Clear retry count on success
              },
            })
            .eq('id', post.id);

          await recordPlatformPosts({
            supabase,
            postId: post.id,
            publishResults,
            publishedAt,
          });

          await createInitialAnalytics({
            supabase,
            postId: post.id,
            publishResults,
          });

          console.log(`[Cron: Publish] Successfully published post ${post.id}`);
          
          results.push({
            postId: post.id,
            success: true,
            platforms: post.platforms,
            duration: Date.now() - postStartTime,
          });
        } else if (someSucceeded) {
          // Partial success - record what worked, but mark as partially failed
          const publishedAt = new Date().toISOString();
          const successfulPlatforms = publishResults.filter(r => r.success).map(r => r.platform);
          const failedPlatforms = publishResults.filter(r => !r.success).map(r => r.platform);

          await supabase
            .from('posts')
            .update({
              status: 'partial',
              published_at: publishedAt,
              error_message: `Published to ${successfulPlatforms.join(', ')}. Failed: ${errors.join('; ')}`,
              external_post_id: JSON.stringify(externalIds),
              metadata: {
                ...metadata,
                accountIds,
                publishResults,
                publishedAt,
                successfulPlatforms,
                failedPlatforms,
              },
            })
            .eq('id', post.id);

          // Record successful platform posts
          await recordPlatformPosts({
            supabase,
            postId: post.id,
            publishResults: publishResults.filter(r => r.success),
            publishedAt,
          });

          console.log(`[Cron: Publish] Partial success for post ${post.id}: ${successfulPlatforms.join(', ')}`);
          
          results.push({
            postId: post.id,
            success: false,
            platforms: post.platforms,
            errors,
            duration: Date.now() - postStartTime,
          });
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
                  accountIds,
                  publishResults,
                  retryCount: retryCount + 1,
                  lastFailedAt: new Date().toISOString(),
                  nextRetryAt: nextRetryTime.toISOString(),
                },
              })
              .eq('id', post.id);

            console.log(`[Cron: Publish] Scheduled retry for post ${post.id} at ${nextRetryTime.toISOString()}`);
            
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
                error_message: retryCount >= MAX_RETRY_ATTEMPTS 
                  ? `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errors.join('; ')}`
                  : errors.join('; '),
                metadata: {
                  ...metadata,
                  accountIds,
                  publishResults,
                  failedAt: new Date().toISOString(),
                  finalRetryCount: retryCount,
                },
              })
              .eq('id', post.id);

            console.error(`[Cron: Publish] Permanent failure for post ${post.id}:`, errors);
            
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

    console.log(`[Cron: Publish] Completed: ${successCount} succeeded, ${failureCount} failed, ${retryCount} scheduled for retry in ${totalDuration}ms`);

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
