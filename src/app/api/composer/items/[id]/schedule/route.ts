/**
 * Content Item Schedule API
 * POST /api/composer/items/[id]/schedule
 * 
 * Schedule a content item for publishing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    APIError,
    createServiceRoleClient,
    handleAPIError,
    requireAuth,
} from '@/lib/api-middleware';
import {
    assertContentMutable,
    assertMediaInWorkspace,
    assertSocialAccountsInWorkspace,
    enforceLimit,
    requireWorkspaceContext,
} from '@/lib/workspace-context';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { scheduled_at } = body;

        if (!scheduled_at) {
            return NextResponse.json(
                { error: 'scheduled_at is required' },
                { status: 400 }
            );
        }

        const scheduledDate = new Date(scheduled_at);
        if (scheduledDate <= new Date()) {
            return NextResponse.json(
                { error: 'Scheduled time must be in the future' },
                { status: 400 }
            );
        }

        // Fetch content item
        await requireAuth(request);
        const serviceClient = createServiceRoleClient();
        const { data: item, error: fetchError } = await serviceClient
            .from('content_items')
            .select(`
        *,
        variants:content_variants (*),
        approval_instance:content_approval_instances (status)
      `)
            .eq('id', params.id)
            .single();

        if (fetchError || !item) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        const { user, userClient: supabase, workspace, role, limits, usage } =
            await requireWorkspaceContext(request, {
                workspaceId: item.workspace_id,
                roles: ['owner', 'admin', 'manager', 'creator'],
            });

        // Check if approval is required and approved
        const approvalInstance = item.approval_instance?.[0];
        if (approvalInstance && approvalInstance.status !== 'approved') {
            return NextResponse.json(
                { error: 'Content must be approved before scheduling' },
                { status: 400 }
            );
        }

        assertContentMutable(item.status, role);
        enforceLimit(
            usage.scheduled_posts_count,
            limits.max_scheduled_posts,
            `Scheduled post limit reached for your ${limits.plan} plan`
        );

        // Check if there are variants
        if (!item.variants || item.variants.length === 0) {
            return NextResponse.json(
                { error: 'Content must have at least one variant to schedule' },
                { status: 400 }
            );
        }

        await assertSocialAccountsInWorkspace(
            supabase,
            workspace.id,
            item.variants.map((variant: any) => variant.social_account_id)
        );
        await assertMediaInWorkspace(
            supabase,
            workspace.id,
            item.variants.flatMap((variant: any) => variant.media_ids || [])
        );

        // Update content item
        const { error: updateItemError } = await supabase
            .from('content_items')
            .update({
                status: 'scheduled',
                scheduled_at: scheduledDate.toISOString(),
                timezone_snapshot: workspace.timezone || 'UTC',
                locked_at: new Date().toISOString(),
                locked_by: user.id,
            })
            .eq('id', params.id);

        if (updateItemError) {
            console.error('Schedule content item error:', updateItemError);
            return NextResponse.json(
                { error: 'Failed to schedule content' },
                { status: 500 }
            );
        }

        // Update all variants
        const { error: updateVariantsError } = await supabase
            .from('content_variants')
            .update({
                status: 'scheduled',
                scheduled_at: scheduledDate.toISOString(),
            })
            .eq('content_item_id', params.id)
            .in('status', ['draft', 'ready']);

        if (updateVariantsError) {
            console.error('Schedule variants error:', updateVariantsError);
        }

        // Fetch updated item
        const { data: updatedItem } = await supabase
            .from('content_items')
            .select(`
        *,
        variants:content_variants (*)
      `)
            .eq('id', params.id)
            .single();

        return NextResponse.json({
            item: updatedItem,
            success: true,
            message: `Content scheduled for ${scheduledDate.toLocaleString()}`,
        });

    } catch (error) {
        console.error('Schedule content error:', error);
        return handleAPIError(error);
    }
}
