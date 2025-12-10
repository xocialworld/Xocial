/**
 * Request Approval API
 * POST /api/composer/items/[id]/request-approval
 * 
 * Submit content for approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { workflow_id } = body;

        // Fetch content item
        const { data: item, error: fetchError } = await supabase
            .from('content_items')
            .select('*, approval_instance:content_approval_instances (*)')
            .eq('id', params.id)
            .single();

        if (fetchError || !item) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', item.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Check if already in approval
        if (item.approval_instance && item.approval_instance.length > 0) {
            const existingInstance = item.approval_instance[0];
            if (existingInstance.status === 'pending') {
                return NextResponse.json(
                    { error: 'Content is already pending approval' },
                    { status: 400 }
                );
            }
        }

        // Get workflow (use provided or default)
        let workflowToUse = workflow_id;

        if (!workflowToUse) {
            // Get default workflow for workspace
            const { data: defaultWorkflow } = await supabase
                .from('approval_workflows')
                .select('id')
                .eq('workspace_id', item.workspace_id)
                .eq('is_default', true)
                .single();

            if (defaultWorkflow) {
                workflowToUse = defaultWorkflow.id;
            } else {
                // Get any workflow
                const { data: anyWorkflow } = await supabase
                    .from('approval_workflows')
                    .select('id')
                    .eq('workspace_id', item.workspace_id)
                    .limit(1)
                    .single();

                if (anyWorkflow) {
                    workflowToUse = anyWorkflow.id;
                }
            }
        }

        if (!workflowToUse) {
            return NextResponse.json(
                { error: 'No approval workflow configured. Please create one in Settings > Workflows.' },
                { status: 400 }
            );
        }

        // Get workflow with first step
        const { data: workflow } = await supabase
            .from('approval_workflows')
            .select(`
        id,
        name,
        steps:approval_workflow_steps (
          id,
          step_order
        )
      `)
            .eq('id', workflowToUse)
            .single();

        if (!workflow) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }

        const firstStep = workflow.steps?.find((s: any) => s.step_order === 1);

        // Delete any existing approval instance
        await supabase
            .from('content_approval_instances')
            .delete()
            .eq('content_item_id', params.id);

        // Create new approval instance
        const { data: approvalInstance, error: createError } = await supabase
            .from('content_approval_instances')
            .insert({
                content_item_id: params.id,
                workflow_id: workflow.id,
                current_step_id: firstStep?.id || null,
                status: 'pending',
            })
            .select()
            .single();

        if (createError) {
            console.error('Create approval instance error:', createError);
            return NextResponse.json(
                { error: 'Failed to create approval request' },
                { status: 500 }
            );
        }

        // Update content item status
        await supabase
            .from('content_items')
            .update({ status: 'in_review' })
            .eq('id', params.id);

        return NextResponse.json({
            success: true,
            message: `Submitted for approval using "${workflow.name}" workflow`,
            approval_instance: approvalInstance,
        });

    } catch (error) {
        console.error('Request approval error:', error);
        return NextResponse.json(
            { error: 'Failed to request approval' },
            { status: 500 }
        );
    }
}
