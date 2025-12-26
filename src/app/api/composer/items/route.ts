/**
 * Content Items API (Composer)
 * GET, POST /api/composer/items
 * 
 * CRUD operations for content items with variants
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List content items for a workspace
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

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
        return NextResponse.json(
            { error: 'Failed to fetch content items' },
            { status: 500 }
        );
    }
}

// POST - Create a new content item with variants
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Determine initial status
        const hasSchedule = scheduled_at && new Date(scheduled_at) > new Date();
        const initialStatus = hasSchedule ? 'scheduled' : 'draft';

        // Create content item with drafted_at and optional approval_workflow_id
        const { data: contentItem, error: itemError } = await supabase
            .from('content_items')
            .insert({
                workspace_id,
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
        if (variants.length > 0) {
            const variantsToInsert = variants.map((variant: any) => ({
                content_item_id: contentItem.id,
                social_account_id: variant.social_account_id || null,
                platform: variant.platform,
                caption: variant.caption || '',
                media_ids: variant.media_ids || [],
                hashtags: variant.hashtags || [],
                mentions: variant.mentions || [],
                link_url: variant.link_url || null,
                platform_specific: variant.platform_specific || {},
                status: hasSchedule ? 'scheduled' : 'draft',
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
        if (workflow_id) {
            // Get first step of workflow
            const { data: workflow } = await supabase
                .from('approval_workflows')
                .select(`
          id,
          steps:approval_workflow_steps (
            id,
            step_order
          )
        `)
                .eq('id', workflow_id)
                .single();

            if (workflow) {
                const firstStep = workflow.steps?.find((s: any) => s.step_order === 1);

                await supabase.from('content_approval_instances').insert({
                    content_item_id: contentItem.id,
                    workflow_id,
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
        return NextResponse.json(
            { error: 'Failed to create content item' },
            { status: 500 }
        );
    }
}
