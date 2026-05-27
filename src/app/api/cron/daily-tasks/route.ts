/**
 * Consolidated Daily CRON Job
 * Runs once daily to handle all scheduled tasks:
 * - Publish scheduled posts
 * - Sync engagement metrics
 * - Refresh expiring tokens
 * 
 * This consolidation reduces Vercel CRON usage from 5 to 1 job,
 * making it compatible with Vercel's free tier.
 * 
 * Triggered by: Vercel Cron
 * Schedule: 0 6 * * * (daily at 6 AM UTC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { logger } from '@/lib/logger';
import { processDueAgentTasks } from '@/lib/intelligence/tasks';

interface TaskResult {
    task: string;
    success: boolean;
    message: string;
    details?: any;
    duration: number;
}

/**
 * GET /api/cron/daily-tasks
 * Consolidated daily task runner - replaces multiple separate CRONs
 */
export const GET = withCronVerification(async (request: NextRequest) => {
    const startTime = Date.now();
    const results: TaskResult[] = [];

    console.log('[Cron: Daily Tasks] Starting consolidated daily job');

    // Create Supabase client with service role
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

    // Task 1: Publish Scheduled Posts
    try {
        const taskStart = Date.now();
        console.log('[Cron: Daily Tasks] Running: Publish Scheduled Posts');

        const publishResult = await runPublishTask(supabase);

        results.push({
            task: 'publish_scheduled_posts',
            success: true,
            message: `Published ${publishResult.published} posts`,
            details: publishResult,
            duration: Date.now() - taskStart,
        });
    } catch (error: any) {
        console.error('[Cron: Daily Tasks] Publish task failed:', error);
        results.push({
            task: 'publish_scheduled_posts',
            success: false,
            message: error.message,
            duration: Date.now() - startTime,
        });
    }

    // Task 2: Refresh Expiring Tokens
    try {
        const taskStart = Date.now();
        console.log('[Cron: Daily Tasks] Running: Refresh Expiring Tokens');

        const refreshResult = await runTokenRefreshTask(supabase);

        results.push({
            task: 'refresh_tokens',
            success: true,
            message: `Refreshed ${refreshResult.refreshed} tokens`,
            details: refreshResult,
            duration: Date.now() - taskStart,
        });
    } catch (error: any) {
        console.error('[Cron: Daily Tasks] Token refresh task failed:', error);
        results.push({
            task: 'refresh_tokens',
            success: false,
            message: error.message,
            duration: Date.now() - startTime,
        });
    }

    // Task 3: Sync Metrics (lightweight - only recent posts)
    try {
        const taskStart = Date.now();
        console.log('[Cron: Daily Tasks] Running: Sync Recent Metrics');

        const syncResult = await runMetricsSyncTask(supabase);

        results.push({
            task: 'sync_metrics',
            success: true,
            message: `Synced metrics for ${syncResult.synced} posts`,
            details: syncResult,
            duration: Date.now() - taskStart,
        });
    } catch (error: any) {
        console.error('[Cron: Daily Tasks] Metrics sync task failed:', error);
        results.push({
            task: 'sync_metrics',
            success: false,
            message: error.message,
            duration: Date.now() - startTime,
        });
    }

    // Task 4: Process queued intelligence workers
    try {
        const taskStart = Date.now();
        console.log('[Cron: Daily Tasks] Running: Intelligence Agent Tasks');

        const agentResult = await processDueAgentTasks(supabase as any, { limit: 15 });

        results.push({
            task: 'intelligence_agent_tasks',
            success: true,
            message: `Processed ${agentResult.processed} agent tasks`,
            details: agentResult,
            duration: Date.now() - taskStart,
        });
    } catch (error: any) {
        console.error('[Cron: Daily Tasks] Intelligence agent task failed:', error);
        results.push({
            task: 'intelligence_agent_tasks',
            success: false,
            message: error.message,
            duration: Date.now() - startTime,
        });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalDuration = Date.now() - startTime;

    console.log(`[Cron: Daily Tasks] Completed: ${successCount}/${results.length} tasks succeeded in ${totalDuration}ms`);

    return cronSuccessResponse({
        message: 'Daily tasks completed',
        tasksRun: results.length,
        succeeded: successCount,
        failed: failureCount,
        duration: totalDuration,
        results,
    });
});

/**
 * Task 1: Publish scheduled posts that are due
 */
async function runPublishTask(supabase: any) {
    // Get posts scheduled for now or earlier
    const { data: scheduledPosts, error } = await supabase
        .from('posts')
        .select('id, status')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())
        .limit(50);

    if (error) throw error;

    if (!scheduledPosts || scheduledPosts.length === 0) {
        return { published: 0, message: 'No posts to publish' };
    }

    // Trigger publish for each post via internal API call
    // This reuses existing publish logic
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const response = await fetch(`${baseUrl}/api/cron/publish`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const result = await response.json();
        return { published: result.data?.processed || 0 };
    } catch (e) {
        // If internal call fails, just return count
        return { published: 0, skipped: scheduledPosts.length, reason: 'Internal API unavailable' };
    }
}

/**
 * Task 2: Refresh tokens expiring within 7 days
 */
async function runTokenRefreshTask(supabase: any) {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: accounts, error } = await supabase
        .from('social_accounts')
        .select('id, platform, token_expires_at')
        .eq('is_active', true)
        .not('refresh_token', 'is', null)
        .lt('token_expires_at', sevenDaysFromNow.toISOString());

    if (error) throw error;

    if (!accounts || accounts.length === 0) {
        return { refreshed: 0, message: 'No tokens need refreshing' };
    }

    // Trigger token refresh via internal API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const response = await fetch(`${baseUrl}/api/cron/refresh-tokens`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const result = await response.json();
        return { refreshed: result.data?.refreshed || 0 };
    } catch (e) {
        return { refreshed: 0, needsRefresh: accounts.length, reason: 'Internal API unavailable' };
    }
}

/**
 * Task 3: Sync metrics for recent posts (last 3 days only to reduce API calls)
 */
async function runMetricsSyncTask(supabase: any) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recentPosts, error } = await supabase
        .from('platform_posts')
        .select('post_id, platform')
        .eq('status', 'published')
        .gte('published_at', threeDaysAgo.toISOString())
        .limit(50);

    if (error) throw error;

    if (!recentPosts || recentPosts.length === 0) {
        return { synced: 0, message: 'No recent posts to sync' };
    }

    // Trigger metrics sync via internal API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const response = await fetch(`${baseUrl}/api/cron/sync-metrics`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const result = await response.json();
        return { synced: result.data?.processed || 0 };
    } catch (e) {
        return { synced: 0, pending: recentPosts.length, reason: 'Internal API unavailable' };
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
