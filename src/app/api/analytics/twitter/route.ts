import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    checkRateLimit,
    APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { getTwitterUser } from '@/lib/platforms/twitter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/twitter?accountId=xxx&startDate=xxx&endDate=xxx
 * Fetch Twitter analytics data
 * 
 * Query params:
 * - accountId: UUID (required)
 * - startDate: ISO date (optional)
 * - endDate: ISO date (optional)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Basic rate limiting
    const limited = checkRateLimit(`${user.id}:analytics:twitter`, 60, 60_000);
    if (!limited) {
        throw new APIError(429, 'Too many requests. Please slow down.', 'RATE_LIMITED');
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId) {
        throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
    }

    // Get Twitter account
    const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('workspace_id', workspace.id)
        .eq('platform', 'twitter')
        .eq('is_active', true)
        .single();

    if (accountError || !account) {
        throw new APIError(404, 'Twitter account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Decrypt access token
    const accessToken = decryptToken(account.access_token);

    try {
        // Fetch user profile metrics
        const userProfile = await getTwitterUser(accessToken);

        // Fetch recent tweets to aggregate performance
        // Note: Twitter API v2 Free/Basic tiers have limits.
        // We'll fetch recent tweets to calculate engagement rate for the period if possible,
        // or just return the profile metrics.

        // For now, we return profile metrics as the main source of truth for "current" state.
        // Historical data would require storing snapshots which we do in cron jobs.

        // If we want to show "growth" or "change" over the selected period, we should query our internal analytics table.
        // But for this endpoint, we often want "live" data + "historical" data.

        // Let's fetch internal analytics for historical context
        const { data: analyticsHistory, error: historyError } = await supabase
            .from('daily_metrics_summary') // Assuming this view exists or we query post_analytics
            .select('*')
            .eq('workspace_id', workspace.id)
            .eq('platform', 'twitter')
            .gte('date', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .lte('date', endDate || new Date().toISOString());

        // Construct response
        const metrics = userProfile.public_metrics || {
            followers_count: 0,
            following_count: 0,
            tweet_count: 0,
            listed_count: 0,
        };

        return NextResponse.json({
            success: true,
            data: {
                accountId: account.account_id,
                username: userProfile.username,
                name: userProfile.name,
                profileImageUrl: userProfile.profile_image_url,
                metrics: {
                    followers: metrics.followers_count,
                    following: metrics.following_count,
                    tweets: metrics.tweet_count,
                    listed: metrics.listed_count,
                },
                // We can add more aggregated data here if needed
            },
        });

    } catch (error: any) {
        logger.error(`Failed to fetch Twitter analytics: ${error.message}`, error, {
            userId: user.id,
            accountId,
        });

        throw new APIError(500, `Failed to fetch Twitter analytics: ${error.message}`, 'ANALYTICS_FAILED');
    }
});
