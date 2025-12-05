import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/twitter/analytics
 * Get Twitter analytics with trends
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user } = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!accountId) {
        throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
    }

    try {
        const supabase = await createClient();

        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('platform', 'twitter')
            .single();

        if (accountError || !account) {
            throw new APIError(404, 'Twitter account not found', 'ACCOUNT_NOT_FOUND');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select(`
                id,
                external_post_id,
                content,
                published_at,
                post_analytics (
                    impressions,
                    likes,
                    retweets,
                    replies,
                    quotes
                )
            `)
            .eq('social_account_id', accountId)
            .eq('status', 'published')
            .gte('published_at', startDate.toISOString())
            .order('published_at', { ascending: false });

        if (postsError) {
            throw new Error(`Failed to fetch posts: ${postsError.message}`);
        }

        const currentTotals = (posts || []).reduce((acc, post: any) => {
            const analytics = post.post_analytics?.[0] || {};
            return {
                impressions: acc.impressions + (analytics.impressions || 0),
                likes: acc.likes + (analytics.likes || 0),
                retweets: acc.retweets + (analytics.retweets || 0),
                replies: acc.replies + (analytics.replies || 0),
                quotes: acc.quotes + (analytics.quotes || 0),
            };
        }, { impressions: 0, likes: 0, retweets: 0, replies: 0, quotes: 0 });

        const engagement = currentTotals.likes + currentTotals.retweets + currentTotals.replies + currentTotals.quotes;
        const engagementRate = currentTotals.impressions > 0
            ? (engagement / currentTotals.impressions) * 100
            : 0;

        const impressionsPerTweet = posts && posts.length > 0
            ? currentTotals.impressions / posts.length
            : 0;

        const formattedPosts = (posts || []).map((post: any) => ({
            id: post.id,
            external_post_id: post.external_post_id,
            text: post.content?.text || '',
            published_at: post.published_at,
            analytics: post.post_analytics?.[0] || {},
        }));

        logger.info(`[Twitter Analytics] Fetched analytics for ${accountId}`);

        return NextResponse.json({
            success: true,
            data: {
                totals: currentTotals,
                trends: {
                    impressionsTrend: 0,
                    engagementTrend: 0,
                },
                posts: formattedPosts,
                average: {
                    engagementRate,
                    impressionsPerTweet,
                },
            },
        });
    } catch (error: any) {
        logger.error('[Twitter Analytics] Error:', error);
        throw new APIError(500, `Failed to fetch analytics: ${error.message}`, 'ANALYTICS_FAILED');
    }
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
