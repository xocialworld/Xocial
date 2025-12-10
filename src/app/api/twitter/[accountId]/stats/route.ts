import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';

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

    const accessToken = decryptToken(account.access_token);
    const twitterUserId = account.account_id;

    const apiUrl = `https://api.twitter.com/2/users/${twitterUserId}`;
    const params = new URLSearchParams({
        'user.fields': 'public_metrics',
    });

    const response = await fetch(`${apiUrl}?${params}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const err = await response.json();
        throw new APIError(500, err.detail || 'Failed to fetch Twitter stats', 'TWITTER_API_ERROR');
    }

    const data = await response.json();
    const metrics = data?.data?.public_metrics || {};

    return NextResponse.json({
        tweet_count: metrics.tweet_count || 0,
        followers_count: metrics.followers_count || 0,
        following_count: metrics.following_count || 0,
    });
});
