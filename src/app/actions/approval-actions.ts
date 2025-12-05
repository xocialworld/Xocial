'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas
const createWorkflowSchema = z.object({
    workspace_id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['single_step', 'sequential', 'parallel']),
    steps: z.array(z.object({
        step_order: z.number().int().min(1),
        required_role: z.string().optional(),
        required_users: z.array(z.string().uuid()).optional(),
        approval_rule: z.enum(['any', 'all']),
    })).min(1),
});

const submitForApprovalSchema = z.object({
    post_id: z.string().uuid(),
    workflow_id: z.string().uuid(),
});

const approvalActionSchema = z.object({
    instance_id: z.string().uuid(),
    step_id: z.string().uuid(),
    action: z.enum(['approve', 'reject', 'comment']),
    comment: z.string().optional(),
});

// Actions

export async function createApprovalWorkflow(data: z.infer<typeof createWorkflowSchema>) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: 'Unauthorized' };
    }

    // 1. Create Workflow
    const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .insert({
            workspace_id: data.workspace_id,
            name: data.name,
            description: data.description,
            type: data.type,
        })
        .select()
        .single();

    if (workflowError) {
        return { error: workflowError.message };
    }

    // 2. Create Steps
    const stepsToInsert = data.steps.map(step => ({
        workflow_id: workflow.id,
        step_order: step.step_order,
        required_role: step.required_role,
        required_users: step.required_users,
        approval_rule: step.approval_rule,
    }));

    const { error: stepsError } = await supabase
        .from('approval_workflow_steps')
        .insert(stepsToInsert);

    if (stepsError) {
        // Cleanup workflow if steps fail (optional, but good practice)
        await supabase.from('approval_workflows').delete().eq('id', workflow.id);
        return { error: stepsError.message };
    }

    revalidatePath(`/settings/workflows`);
    return { success: true, workflow };
}

export async function submitPostForApproval(data: z.infer<typeof submitForApprovalSchema>) {
    const supabase = await createClient();

    // Get the first step of the workflow
    const { data: firstStep, error: stepError } = await supabase
        .from('approval_workflow_steps')
        .select('id')
        .eq('workflow_id', data.workflow_id)
        .order('step_order', { ascending: true })
        .limit(1)
        .single();

    if (stepError || !firstStep) {
        return { error: 'Workflow has no steps' };
    }

    // Create Approval Instance
    const { error: instanceError } = await supabase
        .from('content_approval_instances')
        .insert({
            content_item_id: data.post_id,
            workflow_id: data.workflow_id,
            current_step_id: firstStep.id,
            status: 'pending',
        });

    if (instanceError) {
        return { error: instanceError.message };
    }

    // Update Post Status
    await supabase
        .from('posts')
        .update({ status: 'pending_approval' })
        .eq('id', data.post_id);

    revalidatePath(`/posts/${data.post_id}`);
    return { success: true };
}

export async function performApprovalAction(data: z.infer<typeof approvalActionSchema>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    // Record Action
    const { error: actionError } = await supabase
        .from('content_approval_actions')
        .insert({
            approval_instance_id: data.instance_id,
            step_id: data.step_id,
            actor_id: user.id,
            action: data.action,
            comment: data.comment,
        });

    if (actionError) return { error: actionError.message };

    // Logic to advance workflow or reject
    if (data.action === 'reject') {
        await supabase
            .from('content_approval_instances')
            .update({ status: 'rejected' })
            .eq('id', data.instance_id);

        // Get post_id to update post status
        const { data: instance } = await supabase
            .from('content_approval_instances')
            .select('content_item_id')
            .eq('id', data.instance_id)
            .single();

        if (instance) {
            await supabase.from('posts').update({ status: 'failed' }).eq('id', instance.content_item_id); // Or 'draft' depending on logic
        }
    } else if (data.action === 'approve') {
        // Check if step is complete (simplified: assuming single approver per step for now or 'any' rule satisfied)
        // In a real implementation, we'd check 'approval_rule' (any vs all) and count approvals.

        // Find next step
        const { data: currentStep } = await supabase
            .from('approval_workflow_steps')
            .select('step_order, workflow_id')
            .eq('id', data.step_id)
            .single();

        if (currentStep) {
            const { data: nextStep } = await supabase
                .from('approval_workflow_steps')
                .select('id')
                .eq('workflow_id', currentStep.workflow_id)
                .gt('step_order', currentStep.step_order)
                .order('step_order', { ascending: true })
                .limit(1)
                .single();

            if (nextStep) {
                // Move to next step
                await supabase
                    .from('content_approval_instances')
                    .update({ current_step_id: nextStep.id })
                    .eq('id', data.instance_id);
            } else {
                // Workflow Complete
                await supabase
                    .from('content_approval_instances')
                    .update({ status: 'approved', current_step_id: null })
                    .eq('id', data.instance_id);

                const { data: instance } = await supabase
                    .from('content_approval_instances')
                    .select('content_item_id')
                    .eq('id', data.instance_id)
                    .single();

                if (instance) {
                    await supabase.from('posts').update({ status: 'approved' }).eq('id', instance.content_item_id);
                }
            }
        }
    }

    revalidatePath(`/approvals`);
    return { success: true };
}
