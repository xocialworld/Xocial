/**
 * Approval Workflows Management API
 * GET, POST /api/workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all workflows for a workspace
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

        // Fetch workflows with steps
        const { data: workflows, error } = await supabase
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
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Fetch workflows error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch workflows' },
                { status: 500 }
            );
        }

        // Sort steps by order
        const sortedWorkflows = workflows?.map(workflow => ({
            ...workflow,
            steps: workflow.steps?.sort((a: any, b: any) => a.step_order - b.step_order) || [],
        }));

        return NextResponse.json({ workflows: sortedWorkflows });

    } catch (error) {
        console.error('Workflows GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch workflows' },
            { status: 500 }
        );
    }
}

// POST - Create a new workflow
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
            name,
            description,
            type = 'sequential',
            is_default = false,
            steps = [],
        } = body;

        if (!workspace_id || !name) {
            return NextResponse.json(
                { error: 'workspace_id and name are required' },
                { status: 400 }
            );
        }

        // Verify admin/owner role
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Only admins can create workflows' },
                { status: 403 }
            );
        }

        // If setting as default, unset other default workflows
        if (is_default) {
            await supabase
                .from('approval_workflows')
                .update({ is_default: false })
                .eq('workspace_id', workspace_id)
                .eq('is_default', true);
        }

        // Create workflow
        const { data: workflow, error: workflowError } = await supabase
            .from('approval_workflows')
            .insert({
                workspace_id,
                name,
                description,
                type,
                is_default,
            })
            .select()
            .single();

        if (workflowError) {
            console.error('Create workflow error:', workflowError);
            return NextResponse.json(
                { error: 'Failed to create workflow' },
                { status: 500 }
            );
        }

        // Create steps if provided
        if (steps.length > 0) {
            const stepsToInsert = steps.map((step: any, index: number) => ({
                workflow_id: workflow.id,
                step_order: index + 1,
                required_role: step.required_role || null,
                required_users: step.required_users || [],
                approval_rule: step.approval_rule || 'any',
            }));

            const { error: stepsError } = await supabase
                .from('approval_workflow_steps')
                .insert(stepsToInsert);

            if (stepsError) {
                console.error('Create steps error:', stepsError);
                // Rollback workflow creation
                await supabase.from('approval_workflows').delete().eq('id', workflow.id);
                return NextResponse.json(
                    { error: 'Failed to create workflow steps' },
                    { status: 500 }
                );
            }
        }

        // Fetch complete workflow with steps
        const { data: completeWorkflow } = await supabase
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
            .eq('id', workflow.id)
            .single();

        return NextResponse.json({
            workflow: completeWorkflow,
            success: true,
        });

    } catch (error) {
        console.error('Workflows POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create workflow' },
            { status: 500 }
        );
    }
}
