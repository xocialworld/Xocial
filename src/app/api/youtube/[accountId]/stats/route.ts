import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getYouTubeChannelStats } from '@/lib/oauth/youtube';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user, supabase } = await requireAuth(request);

    // Extract accountId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accountId = pathParts[pathParts.indexOf('youtube') + 1];

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
        throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
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
    const channelId = account.account_id;

    try {
        const stats = await getYouTubeChannelStats(accessToken, channelId);

        return NextResponse.json({
            subscriber_count: stats.statistics?.subscriberCount ? parseInt(stats.statistics.subscriberCount) : 0,
            video_count: stats.statistics?.videoCount ? parseInt(stats.statistics.videoCount) : 0,
            view_count: stats.statistics?.viewCount ? parseInt(stats.statistics.viewCount) : 0,
        });
    } catch (error: any) {
        throw new APIError(500, error.message || 'Failed to fetch YouTube stats', 'YOUTUBE_API_ERROR');
    }
});
