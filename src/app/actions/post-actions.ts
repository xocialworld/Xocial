'use server';

import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';
import { Post } from '@/types';

export async function updatePostStatus(postId: string, status: Post['status'], workspaceId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // 1. Update the post status
    const { error: updateError } = await supabase
        .from('posts')
        .update({ status })
        .eq('id', postId);

    if (updateError) {
        throw new Error(`Failed to update post: ${updateError.message}`);
    }

    // 2. Send Notifications based on status
    // In a real app, we'd fetch the workspace owners/admins or the post creator.
    // For this MVP, we'll notify the workspace owner if we are not them, or just generic logic.

    // Logic:
    // - If status -> 'pending_approval': Notify Admins/Owners "Post needs review"
    // - If status -> 'approved': Notify Creator "Post approved"
    // - If status -> 'rejected': Notify Creator "Post rejected"

    // Fetch post to get creator_id if needed, but for now let's just use generic logic
    // We need to fetch workspace members to know who to notify.

    // Note: createNotification uses admin client so we can query members easily if we moved that logic there.
    // But for now, let's keep it simple. We'll fetch the workspace owner.

    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (status === 'pending_approval') {
        if (workspace && workspace.owner_id !== user.id) {
            await createNotification({
                userId: workspace.owner_id,
                workspaceId,
                type: 'post_approval_requested',
                title: 'Review Requested',
                message: 'A post needs your review.',
                data: { postId }
            });
        }
    } else if (status === 'approved' || status === 'rejected') {
        // Ideally notify the creator. We need to fetch the post to know the creator.
        const { data: post } = await supabase.from('posts').select('creator_id').eq('id', postId).single();
        if (post && post.creator_id !== user.id) {
            await createNotification({
                userId: post.creator_id,
                workspaceId,
                type: status === 'approved' ? 'post_approved' : 'post_rejected',
                title: `Post ${status === 'approved' ? 'Approved' : 'Returned'}`,
                message: `Your post has been ${status}.`,
                data: { postId }
            });
        }
    }

    revalidatePath('/o');
    return { success: true };
}
