import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engagement
 * Fetch engagement items (comments, mentions) from connected social accounts
 * 
 * Query params:
 * - platform: Filter by platform (optional)
 * - status: Filter by status - 'new', 'read', 'replied' (optional)
 * - limit: Number of items to return (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
    try {
        const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

        // Rate limit
        const limited = checkRateLimit(`${user.id}:engagement`, 100, 60_000);
        if (!limited) {
            return NextResponse.json(
                { success: false, error: 'Too many requests' },
                { status: 429 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const platform = searchParams.get('platform');
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Get connected social accounts for this workspace
        const { data: accounts } = await supabase
            .from('social_accounts')
            .select('id, platform, account_name, profile_image_url')
            .eq('workspace_id', workspace.id)
            .eq('is_active', true);

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    hasMore: false,
                },
            });
        }

        // Query social_engagements table
        let query = supabase
            .from('social_engagements')
            .select(`
                *,
                social_account:social_accounts(
                    id,
                    platform,
                    account_name,
                    profile_image_url
                )
            `, { count: 'exact' })
            .eq('workspace_id', workspace.id)
            .order('occurred_at', { ascending: false });

        // Apply filters
        if (platform) {
            query = query.eq('platform', platform);
        }

        if (type) {
            query = query.eq('type', type);
        }

        if (status) {
            if (status === 'new' || status === 'unread') {
                query = query.eq('is_read', false);
            } else if (status === 'replied') {
                query = query.eq('is_replied', true);
            }
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: engagements, error, count } = await query;

        if (error) {
            throw error;
        }

        // Transform data
        const items = engagements.map((item: any) => ({
            id: item.id,
            type: item.type,
            user: item.author_name,
            handle: item.author_handle,
            avatar: item.author_avatar_url,
            content: item.content,
            platform: item.platform,
            postTitle: item.post_title,
            timestamp: item.occurred_at,
            responded: item.is_replied,
            isRead: item.is_read,
            socialAccountId: item.social_account_id,
            socialAccount: item.social_account
        }));

        return NextResponse.json({
            success: true,
            data: {
                items,
                accounts: accounts.map(acc => ({
                    id: acc.id,
                    platform: acc.platform,
                    name: acc.account_name,
                    avatar: acc.profile_image_url,
                })),
                total: count || 0,
                hasMore: (offset + items.length) < (count || 0),
            },
        });
    } catch (error) {
        logger.error('Engagement fetch error', error as Error);
        return handleAPIError(error);
    }
}
