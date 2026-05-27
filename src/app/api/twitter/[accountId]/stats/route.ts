import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import { decryptToken } from '@/lib/encryption';
import {
    assertTwitterLiveApiEnabled,
    isTwitterApiCreditsRequiredError,
    looksLikeTwitterBillingError,
    TWITTER_CREDITS_REQUIRED_CODE,
} from '@/lib/twitter-api-mode';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user, supabase } = await requireAuth(request);

    // Extract accountId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accountId = pathParts[pathParts.indexOf('twitter') + 1];

    if (!accountId) {
        throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
    }

    // Fetch account info
    const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('id, platform, workspace_id, account_id, access_token')
        .eq('id', accountId)
        .single();

    if (accountError || !account) {
        throw new APIError(404, 'Twitter account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', account.workspace_id)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        throw new APIError(403, 'You do not have access to this account', 'FORBIDDEN');
    }

    try {
        assertTwitterLiveApiEnabled('fetching X account stats');
    } catch (error) {
        if (isTwitterApiCreditsRequiredError(error)) {
            throw new APIError(
                402,
                error instanceof Error ? error.message : 'X API credits required',
                TWITTER_CREDITS_REQUIRED_CODE
            );
        }

        throw error;
    }

    const accessToken = decryptToken(account.access_token);
    const twitterUserId = account.account_id;

    const apiUrl = `https://api.x.com/2/users/${twitterUserId}`;
    const params = new URLSearchParams({
        'user.fields': 'public_metrics',
    });

    const response = await fetch(`${apiUrl}?${params}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        let detail = errorText || 'Failed to fetch Twitter stats';

        try {
            const err = JSON.parse(errorText);
            detail = err.detail || err.title || err.errors?.[0]?.message || detail;
        } catch { }

        if (looksLikeTwitterBillingError(detail, response.status)) {
            throw new APIError(402, `X API credits required: ${detail}`, TWITTER_CREDITS_REQUIRED_CODE);
        }

        throw new APIError(500, detail, 'TWITTER_API_ERROR');
    }

    const data = await response.json();
    const metrics = data?.data?.public_metrics || {};

    return NextResponse.json({
        tweet_count: metrics.tweet_count || 0,
        followers_count: metrics.followers_count || 0,
        following_count: metrics.following_count || 0,
    });
});
