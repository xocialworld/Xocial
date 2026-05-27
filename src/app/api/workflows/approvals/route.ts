
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/api-middleware';
import {
    normalizeApprovalReasons,
    summarizeApprovalReasons,
} from '@/lib/intelligence/approval-reasons';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import { enqueueAgentTask, queuePostIntelligenceTasks } from '@/lib/intelligence/tasks';

// GET: Fetch pending approvals
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if workspace user has role to view approvals (admin/owner)
    // For simplicity, we assume the user is accessing their active workspace context
    // But ideally we should filter by workspace_id passed in query or header.
    // We'll fetch pending approvals for ALL workspaces the user is an admin/owner of, OR filter by specific workspace if provided.
    // Let's assume the frontend passes `workspaceId` as a search param, or we fetch for the current context.
    // Checking `approvals-board.tsx` -> `fetchApprovals` calls `/api/workflows/approvals` without params.
    // This implies we need to get the "current" workspace or return all.
    // Given the multi-workspace architecture, we should probably return approvals for the currently selected workspace.
    // However, without a workspace_id, we'll try to fetch for all workspaces where the user is an admin/owner.

    // 1. Get workspaces where user is owner or admin
    const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

    if (membersError || !members || members.length === 0) {
        return NextResponse.json({ data: [] }); // No access to approvals
    }

    const workspaceIds = members.map(m => m.workspace_id);

    // 2. Fetch posts with status 'pending_approval' or 'rejected' in these workspaces
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
      id,
      status,
      created_at,
      content,
      platforms,
      scheduled_at,
      creator:users!posts_creator_id_fkey (
        id,
        name,
        avatar_url
      ),
      workspace:workspaces (
        id,
        name
      )
    `)
        .in('status', ['pending_approval', 'rejected', 'published', 'scheduled'])
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent 50 for now

    if (postsError) {
        console.error('Error fetching approvals:', postsError);
        return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
    }

    // 3. Map to ApprovalItem format expected by frontend
    const mapStatus = (status: string) => {
        if (status === 'pending_approval') return 'pending';
        if (status === 'rejected') return 'rejected';
        if (['published', 'scheduled'].includes(status)) return 'approved';
        return 'approved'; // fallback
    };

    const approvals = posts.map(post => ({
        id: post.id,
        status: mapStatus(post.status),
        created_at: post.created_at,
        post: {
            id: post.id,
            content: post.content,
            platforms: post.platforms,
        },
        workflow: { name: 'Standard Approval' },
        step: { id: '1', step_order: 1, required_role: 'admin' },
        requested_by: post.creator ? {
            name: (post.creator as any).name,
            avatar: (post.creator as any).avatar_url
        } : { name: 'Unknown User', avatar: null }
    }));

    return NextResponse.json({ data: approvals });
}

// POST: Approve or Reject
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { instance_id: postId, action } = body; // 'instance_id' maps to 'post.id'
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (!postId || !['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const decision = action === 'approve' ? 'approve' : 'reject';
    const structuredReasons = normalizeApprovalReasons(body.reasonIds, decision);
    const reasonSummary = summarizeApprovalReasons(structuredReasons);
    const reasonMetadata = {
        reasonIds: structuredReasons.map((reason) => reason.id),
        reasonLabels: structuredReasons.map((reason) => reason.label),
        reasonCategories: structuredReasons.map((reason) => reason.category),
        reasonHints: structuredReasons.map((reason) => reason.brandLearningHint),
        reasonSummary,
    };

    // 1. Verify access: User must be admin/owner of the workspace the post belongs to
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('workspace_id, scheduled_at, platforms')
        .eq('id', postId)
        .single();

    if (postError || !post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { data: membership, error: memberError } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', post.workspace_id)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single();

    if (memberError || !membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Perform Action
    let newStatus = '';
    if (action === 'approve') {
        // Logic: If scheduled_at is in future, go to 'scheduled'. Else 'published'?
        // Or 'approved' if we had that status.
        // Based on Composer logic, users select 'Schedule' or 'Publish'.
        // If we have a 'scheduled_at', it was likely a Schedule request.
        if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
            newStatus = 'scheduled';
        } else {
            newStatus = 'published';
        }
    } else {
        newStatus = 'rejected';
    }

    const { error: updateError } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    // TODO: Log the approval action/comment in an audit table if it existed.
    console.log(`User ${user.id} ${action}d post ${postId}. New status: ${newStatus}. Comment: ${comment}`);

    const serviceClient = createServiceRoleClient();
    await serviceClient.from('approval_learning_signals').insert({
        workspace_id: post.workspace_id,
        post_id: postId,
        actor_user_id: user.id,
        signal_type: action === 'approve' ? 'approved' : 'rejected',
        comment: comment || null,
        metadata: {
            nextStatus: newStatus,
            source: 'approvals_board',
            ...reasonMetadata,
        },
    });

    await recordLearningEvent(serviceClient, {
        workspaceId: post.workspace_id,
        actorUserId: user.id,
        source: 'approval',
        eventType: action === 'approve' ? 'approval_approved' : 'approval_rejected',
        entityType: 'post',
        entityId: postId,
        signalStrength: action === 'approve' ? 0.85 : 0.75,
        metadata: {
            comment,
            nextStatus: newStatus,
            ...reasonMetadata,
        },
    });

    await queuePostIntelligenceTasks(serviceClient, {
        workspaceId: post.workspace_id,
        postId,
        platforms: Array.isArray(post.platforms) ? post.platforms : [],
        reason: action === 'approve' ? 'approval_approved' : 'approval_rejected',
        priority: 6,
    });
    await enqueueAgentTask(serviceClient, {
        workspaceId: post.workspace_id,
        agentType: 'brand_learner',
        entityType: 'post',
        entityId: postId,
        priority: 7,
        inputPayload: {
            action,
            comment,
            ...reasonMetadata,
            trigger: 'approval_action',
        },
    });

    return NextResponse.json({ success: true, newStatus, reasons: structuredReasons });
}
