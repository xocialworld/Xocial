import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getWorkspaceFromRequest } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

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
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

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
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

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

        // For now, return an empty state since we don't have a social_comments table
        // In a full implementation, this would fetch from each platform's API
        // or from a cached comments table

        const engagementItems: any[] = [];

        // TODO: Implement actual comment fetching from connected platforms
        // This would involve:
        // 1. For Instagram: GET /api/instagram/comments
        // 2. For Facebook: Similar endpoint
        // 3. For YouTube: Comments from video analytics

        return NextResponse.json({
            success: true,
            data: {
                items: engagementItems,
                accounts: accounts.map(acc => ({
                    id: acc.id,
                    platform: acc.platform,
                    name: acc.account_name,
                    avatar: acc.profile_image_url,
                })),
                total: engagementItems.length,
                hasMore: false,
            },
        });
    } catch (error) {
        logger.error('Engagement fetch error', error as Error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch engagement data' },
            { status: 500 }
        );
    }
}
