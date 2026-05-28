/**
 * Cron Job: Sync Engagement Metrics
 * Runs through recent platform_posts and writes canonical analytics learning data.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  cronErrorResponse,
  cronSuccessResponse,
  withCronVerification,
} from '@/lib/cron-verification';
import {
  summarizeMetricSyncResults,
  syncPlatformPostMetrics,
} from '@/lib/intelligence/analytics-sync';

type PlatformPostRow = {
  post_id: string;
  platform: string;
  platform_post_id: string | null;
  social_account_id?: string | null;
  published_at?: string | null;
  posts: { workspace_id: string; published_at?: string | null } | Array<{ workspace_id: string; published_at?: string | null }>;
};

/**
 * GET /api/cron/sync-metrics
 * Syncs engagement metrics for recently published posts.
 */
export const GET = withCronVerification(async (_request: NextRequest) => {
  const startTime = Date.now();

  try {
    console.log('[Cron: Sync Metrics] Starting metrics sync job');

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: platformPostsData, error: fetchError } = await supabase
      .from('platform_posts')
      .select(
        'post_id, platform, platform_post_id, social_account_id, published_at, posts:posts!inner(workspace_id, published_at)'
      )
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo.toISOString())
      .not('platform_post_id', 'is', null)
      .limit(200);

    if (fetchError) {
      console.error('[Cron: Sync Metrics] Error fetching posts:', fetchError);
      return cronErrorResponse('Failed to fetch posts', fetchError);
    }

    if (!platformPostsData || platformPostsData.length === 0) {
      return cronSuccessResponse({
        message: 'No posts to sync',
        processed: 0,
        synced: 0,
        skipped: 0,
        failed: 0,
        duration: Date.now() - startTime,
      });
    }

    const results = [];

    for (const row of platformPostsData as PlatformPostRow[]) {
      const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
      const result = await syncPlatformPostMetrics(supabase, {
        workspaceId: post.workspace_id,
        postId: row.post_id,
        platform: row.platform,
        platformPostId: row.platform_post_id,
        socialAccountId: row.social_account_id || null,
        publishedAt: row.published_at || post.published_at || null,
        syncSource: 'cron_sync_metrics',
      });

      results.push(result);
    }

    const summary = summarizeMetricSyncResults(results);

    try {
      const { error: refreshError } = await supabase.rpc('refresh_daily_metrics');
      if (refreshError) {
        console.error('[Cron: Sync Metrics] Failed to refresh materialized view:', refreshError);
      }
    } catch (error) {
      console.error('[Cron: Sync Metrics] Exception refreshing view:', error);
    }

    const totalDuration = Date.now() - startTime;
    console.log(
      `[Cron: Sync Metrics] Completed: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed in ${totalDuration}ms`
    );

    return cronSuccessResponse({
      message: 'Metrics sync job completed',
      ...summary,
      duration: totalDuration,
      results,
    });
  } catch (error: any) {
    console.error('[Cron: Sync Metrics] Fatal error:', error);
    return cronErrorResponse('Fatal error during metrics sync', {
      error: error.message,
      stack: error.stack,
    });
  }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
