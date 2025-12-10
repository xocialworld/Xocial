/**
 * Single Workflow API
 * GET, PATCH, DELETE /api/workflows/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch a single workflow
export async function GET(
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

        const { data: workflow, error } = await supabase
            .from('approval_workflows')
            .select(`
        *,
        steps:approval_workflow_steps (
          id,
          step_order,
          required_role,
          required_users,
          approval_rule
        )
      `)
            .eq('id', params.id)
            .single();

        if (error || !workflow) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }

        // Sort steps
        workflow.steps = workflow.steps?.sort((a: any, b: any) => a.step_order - b.step_order) || [];

        return NextResponse.json({ workflow });

    } catch (error) {
        console.error('Workflow GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch workflow' },
            { status: 500 }
        );
    }
}

// PATCH - Update a workflow
export async function PATCH(
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
        const { name, description, type, is_default, steps } = body;

        // Get existing workflow
        const { data: existingWorkflow, error: fetchError } = await supabase
            .from('approval_workflows')
            .select('workspace_id')
            .eq('id', params.id)
            .single();

        if (fetchError || !existingWorkflow) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }

        // Verify admin/owner role
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', existingWorkflow.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Only admins can update workflows' },
                { status: 403 }
            );
        }

        // Build update object
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;
        if (is_default !== undefined) updateData.is_default = is_default;

        // If setting as default, unset other defaults
        if (is_default) {
            await supabase
                .from('approval_workflows')
                .update({ is_default: false })
                .eq('workspace_id', existingWorkflow.workspace_id)
                .eq('is_default', true)
                .neq('id', params.id);
        }

        // Update workflow
        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('approval_workflows')
                .update(updateData)
                .eq('id', params.id);

            if (updateError) {
                console.error('Update workflow error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update workflow' },
                    { status: 500 }
                );
            }
        }

        // Update steps if provided
        if (steps !== undefined) {
            // Delete existing steps
            await supabase
                .from('approval_workflow_steps')
                .delete()
                .eq('workflow_id', params.id);

            // Insert new steps
            if (steps.length > 0) {
                const stepsToInsert = steps.map((step: any, index: number) => ({
                    workflow_id: params.id,
                    step_order: index + 1,
                    required_role: step.required_role || null,
                    required_users: step.required_users || [],
                    approval_rule: step.approval_rule || 'any',
                }));

                const { error: stepsError } = await supabase
                    .from('approval_workflow_steps')
                    .insert(stepsToInsert);

                if (stepsError) {
                    console.error('Update steps error:', stepsError);
                    return NextResponse.json(
                        { error: 'Failed to update workflow steps' },
                        { status: 500 }
                    );
                }
            }
        }

        // Fetch updated workflow
        const { data: updatedWorkflow } = await supabase
            .from('approval_workflows')
            .select(`
        *,
        steps:approval_workflow_steps (
          id,
          step_order,
          required_role,
          required_users,
          approval_rule
        )
      `)
            .eq('id', params.id)
            .single();

        return NextResponse.json({
            workflow: updatedWorkflow,
            success: true,
        });

    } catch (error) {
        console.error('Workflow PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update workflow' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a workflow
export async function DELETE(
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

        // Get existing workflow
        const { data: existingWorkflow, error: fetchError } = await supabase
            .from('approval_workflows')
            .select('workspace_id, is_default')
            .eq('id', params.id)
            .single();

        if (fetchError || !existingWorkflow) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }

        // Verify admin/owner role
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', existingWorkflow.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Only admins can delete workflows' },
                { status: 403 }
            );
        }

        // Prevent deleting default workflow
        if (existingWorkflow.is_default) {
            return NextResponse.json(
                { error: 'Cannot delete the default workflow. Set another workflow as default first.' },
                { status: 400 }
            );
        }

        // Delete workflow (steps will cascade)
        const { error: deleteError } = await supabase
            .from('approval_workflows')
            .delete()
            .eq('id', params.id);

        if (deleteError) {
            console.error('Delete workflow error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete workflow' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Workflow deleted successfully',
        });

    } catch (error) {
        console.error('Workflow DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete workflow' },
            { status: 500 }
        );
    }
}
