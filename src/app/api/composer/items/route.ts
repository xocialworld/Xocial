/**
 * Content Items API (Composer)
 * GET, POST /api/composer/items
 * 
 * CRUD operations for content items with variants
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    APIError,
    handleAPIError,
} from '@/lib/api-middleware';
import {
    assertMediaInWorkspace,
    assertSocialAccountsInWorkspace,
    enforceLimit,
    requireWorkspaceContext,
} from '@/lib/workspace-context';

// GET - List content items for a workspace
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspace_id');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        const { userClient: supabase, workspace, role } = await requireWorkspaceContext(request, {
            workspaceId,
            roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
        });

        // Build query
        let query = supabase
            .from('content_items')
            .select(`
        *,
        created_by_user:profiles!created_by (
          id,
          full_name,
          avatar_url
        ),
        variants:content_variants (
          id,
          platform,
          caption,
          status,
          scheduled_at,
          published_at,
          social_account:social_accounts (
            id,
            platform_username,
            platform
          )
        ),
        approval_instance:content_approval_instances (
          id,
          status,
          workflow:approval_workflows (
            id,
            name
          )
        )
      `, { count: 'exact' })
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (role === 'client') {
            query = query.eq('is_internal_only', false);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data: items, error, count } = await query;

        if (error) {
            console.error('Fetch content items error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch content items' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            items,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });

    } catch (error) {
        console.error('Content items GET error:', error);
        return handleAPIError(error);
    }
}

// POST - Create a new content item with variants
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            workspace_id,
            title,
            brief,
            scheduled_at,
            variants = [],
            workflow_id,
        } = body;

        if (!workspace_id) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        const { user, userClient: supabase, workspace, role, limits, usage } =
            await requireWorkspaceContext(request, {
                workspaceId: workspace_id,
                roles: ['owner', 'admin', 'manager', 'creator'],
            });

        const variantList = Array.isArray(variants) ? variants : [];
        await assertSocialAccountsInWorkspace(
            supabase,
            workspace.id,
            variantList.map((variant: any) => variant.social_account_id)
        );
        await assertMediaInWorkspace(
            supabase,
            workspace.id,
            variantList.flatMap((variant: any) => variant.media_ids || [])
        );

        if (workflow_id) {
            const { data: workflow, error: workflowError } = await supabase
                .from('approval_workflows')
                .select('id')
                .eq('id', workflow_id)
                .eq('workspace_id', workspace.id)
                .maybeSingle();

            if (workflowError || !workflow) {
                throw new APIError(
                    400,
                    'Approval workflow does not belong to the selected workspace',
                    'INVALID_WORKSPACE_RESOURCE'
                );
            }
        }

        // Determine initial status
        const hasSchedule = scheduled_at && new Date(scheduled_at) > new Date();
        const approvalMode = workspace.workflow_mode || workspace.settings?.approval_mode;
        const requiresApproval = approvalMode && approvalMode !== 'none';
        const canBypassApproval = ['owner', 'admin'].includes(role);
        const initialStatus = requiresApproval && !canBypassApproval
            ? 'in_review'
            : hasSchedule
                ? 'scheduled'
                : 'draft';

        if (initialStatus === 'scheduled') {
            enforceLimit(
                usage.scheduled_posts_count,
                limits.max_scheduled_posts,
                `Scheduled post limit reached for your ${limits.plan} plan`
            );
        }

        // Create content item with drafted_at and optional approval_workflow_id
        const { data: contentItem, error: itemError } = await supabase
            .from('content_items')
            .insert({
                workspace_id: workspace.id,
                timezone_snapshot: workspace.timezone || 'UTC',
                title: title || null,
                brief: brief || null,
                status: initialStatus,
                scheduled_at: scheduled_at || null,
                drafted_at: body.drafted_at || new Date().toISOString(),
                approval_workflow_id: workflow_id || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (itemError) {
            console.error('Create content item error:', itemError);
            return NextResponse.json(
                { error: 'Failed to create content item' },
                { status: 500 }
            );
        }

        // Create variants if provided
        let createdVariants: any[] = [];
        if (variantList.length > 0) {
            const variantsToInsert = variantList.map((variant: any) => ({
                content_item_id: contentItem.id,
                social_account_id: variant.social_account_id || null,
                platform: variant.platform,
                caption: variant.caption || '',
                media_ids: variant.media_ids || [],
                hashtags: variant.hashtags || [],
                mentions: variant.mentions || [],
                link_url: variant.link_url || null,
                platform_specific: variant.platform_specific || {},
                status: initialStatus === 'scheduled' ? 'scheduled' : 'draft',
                scheduled_at: scheduled_at || null,
            }));

            const { data: insertedVariants, error: variantsError } = await supabase
                .from('content_variants')
                .insert(variantsToInsert)
                .select();

            if (variantsError) {
                console.error('Create variants error:', variantsError);
                // Rollback content item
                await supabase.from('content_items').delete().eq('id', contentItem.id);
                return NextResponse.json(
                    { error: 'Failed to create content variants' },
                    { status: 500 }
                );
            }
            createdVariants = insertedVariants || [];
        }

        // Create approval instance if workflow is specified
        if (workflow_id || (requiresApproval && !canBypassApproval)) {
            // Get first step of workflow
            const workflowQuery = supabase
                .from('approval_workflows')
                .select(`
          id,
          steps:approval_workflow_steps (
            id,
            step_order
          )
        `)
                .eq('workspace_id', workspace.id)
                .order('is_default', { ascending: false })
                .limit(1);

            const { data: workflow } = workflow_id
                ? await workflowQuery.eq('id', workflow_id).maybeSingle()
                : await workflowQuery.maybeSingle();

            if (workflow) {
                const firstStep = workflow.steps?.find((s: any) => s.step_order === 1);

                await supabase.from('content_approval_instances').insert({
                    content_item_id: contentItem.id,
                    workflow_id: workflow.id,
                    current_step_id: firstStep?.id || null,
                    status: 'pending',
                });

                // Update content item status
                await supabase
                    .from('content_items')
                    .update({ status: 'in_review' })
                    .eq('id', contentItem.id);
            }
        }

        // Fetch complete item
        const { data: completeItem } = await supabase
            .from('content_items')
            .select(`
        *,
        variants:content_variants (*),
        approval_instance:content_approval_instances (*)
      `)
            .eq('id', contentItem.id)
            .single();

        return NextResponse.json({
            item: completeItem,
            success: true,
        });

    } catch (error) {
        console.error('Content items POST error:', error);
        return handleAPIError(error);
    }
}
