/**
 * Billing History API
 * GET /api/billing/history
 * 
 * Fetch billing history for a workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspace_id');
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        // Verify user is owner/admin of the workspace
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Only workspace owners can view billing history' },
                { status: 403 }
            );
        }

        // Fetch billing history
        const { data: history, error, count } = await supabase
            .from('billing_history')
            .select('*', { count: 'exact' })
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Failed to fetch billing history:', error);
            return NextResponse.json(
                { error: 'Failed to fetch billing history' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            history,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });

    } catch (error) {
        console.error('Billing history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch billing history' },
            { status: 500 }
        );
    }
}
