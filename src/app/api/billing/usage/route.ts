/**
 * Usage Summary API
 * GET /api/billing/usage
 * 
 * Get current usage and limits for the workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUsageSummary } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workspaceId = request.nextUrl.searchParams.get('workspace_id');

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        const usage = await getUsageSummary(workspaceId);

        if (!usage) {
            return NextResponse.json(
                { error: 'Failed to get usage summary' },
                { status: 500 }
            );
        }

        return NextResponse.json({ usage });

    } catch (error) {
        console.error('Usage summary error:', error);
        return NextResponse.json(
            { error: 'Failed to get usage summary' },
            { status: 500 }
        );
    }
}
