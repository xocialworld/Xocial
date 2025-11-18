/**
 * Cron Job: Automated Post Publishing
 * Runs every minute to publish scheduled posts
 * 
 * Triggered by: Vercel Cron
 * Schedule: * * * * * (every minute)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { PlatformPublisher } from '@/lib/platforms/publisher';
import {
  recordPlatformPosts,
  createInitialAnalytics,
  extractExternalIds,
  buildPlatformContentPayload,
} from '@/lib/platforms/publish-utils';
import {
  normalizeMetadata,
  normalizePlatforms,
  resolveAccountIds,
} from '@/lib/platforms/post-publish-helpers';

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

    // Get posts scheduled for now or earlier
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        workspace:workspaces!inner(id, name),
        social_account:social_accounts(*)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50); // Process max 50 posts per run

    if (fetchError) {
      console.error('[Cron: Publish] Error fetching scheduled posts:', fetchError);
      return cronErrorResponse('Failed to fetch scheduled posts', fetchError);
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('[Cron: Publish] No posts to publish');
      return cronSuccessResponse({
        message: 'No posts to publish',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Publish] Found ${scheduledPosts.length} posts to publish`);

    const results = [];
    const publisher = new PlatformPublisher();

    // Process each post
    for (const post of scheduledPosts) {
      const postStartTime = Date.now();
      
      try {
        console.log(`[Cron: Publish] Processing post ${post.id}`);

        // Update status to 'publishing' to prevent duplicate processing
        const { error: updateError } = await supabase
          .from('posts')
          .update({ status: 'publishing' })
          .eq('id', post.id)
          .eq('status', 'scheduled'); // Only update if still scheduled

        if (updateError) {
          console.error(`[Cron: Publish] Error updating status for post ${post.id}:`, updateError);
          throw updateError;
        }

        const metadata = normalizeMetadata(post.metadata);
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

        const mediaUrls = Array.isArray(post.media)
          ? post.media
              .map((item: any) => item?.url)
              .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
          : [];

        const { fallback, perPlatform } = buildPlatformContentPayload(
          post.content,
          platforms,
          mediaUrls
        );

        // Publish to all platforms
        const publishResults = await publisher.publishToAll({
          platforms,
          content: fallback,
          platformContent: perPlatform,
          accountIds,
          scheduledFor: post.scheduled_at ? new Date(post.scheduled_at) : undefined,
        });

        // Check if all publishes succeeded
        const allSucceeded = publishResults.every((r) => r.success);
        const externalIds = extractExternalIds(publishResults);
        const errors: string[] = [];

        publishResults.forEach((result) => {
          if (!result.success && result.error) {
            errors.push(`${result.platform}: ${result.error}`);
          }
        });

        // Update post with results
        if (allSucceeded) {
          const publishedAt = new Date().toISOString();

          await supabase
            .from('posts')
            .update({
              status: 'published',
              published_at: publishedAt,
              external_post_id: JSON.stringify(externalIds),
              metadata: {
                ...metadata,
                accountIds,
                publishResults,
                publishedAt,
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
        } else {
          // Partial or complete failure
          await supabase
            .from('posts')
            .update({
              status: 'failed',
              error_message: errors.join('; '),
              metadata: {
                ...metadata,
                accountIds,
                publishResults,
                failedAt: new Date().toISOString(),
              },
            })
            .eq('id', post.id);

          console.error(`[Cron: Publish] Failed to publish post ${post.id}:`, errors);
          
          results.push({
            postId: post.id,
            success: false,
            platforms: post.platforms,
            errors,
            duration: Date.now() - postStartTime,
          });
        }
      } catch (error: any) {
        console.error(`[Cron: Publish] Unexpected error processing post ${post.id}:`, error);

        // Revert status back to scheduled for retry
        await supabase
          .from('posts')
          .update({
            status: 'scheduled',
            error_message: error.message || 'Unknown error during publishing',
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

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalDuration = Date.now() - startTime;

    console.log(`[Cron: Publish] Completed: ${successCount} succeeded, ${failureCount} failed in ${totalDuration}ms`);

    return cronSuccessResponse({
      message: 'Publishing job completed',
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      duration: totalDuration,
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

