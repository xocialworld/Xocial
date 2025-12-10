/**
 * Single Comment API
 * PATCH, DELETE /api/comments/[id]
 * 
 * Update or delete a specific comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH - Update a comment
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

        const commentId = params.id;
        const body = await request.json();
        const { body: newBody, is_resolved } = body;

        // Get the existing comment
        const { data: existingComment, error: fetchError } = await supabase
            .from('content_comments')
            .select('*, workspace_members!inner(role)')
            .eq('id', commentId)
            .single();

        if (fetchError || !existingComment) {
            return NextResponse.json(
                { error: 'Comment not found' },
                { status: 404 }
            );
        }

        // Check permissions
        const isAuthor = existingComment.author_id === user.id;
        const isAdmin = ['owner', 'admin', 'manager'].includes(
            existingComment.workspace_members?.role
        );

        // Only author can edit body (within 5 minutes)
        if (newBody !== undefined) {
            if (!isAuthor) {
                return NextResponse.json(
                    { error: 'Only the author can edit this comment' },
                    { status: 403 }
                );
            }

            const createdAt = new Date(existingComment.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (createdAt < fiveMinutesAgo) {
                return NextResponse.json(
                    { error: 'Comments can only be edited within 5 minutes of creation' },
                    { status: 403 }
                );
            }
        }

        // Build update object
        const updateData: any = {};

        if (newBody !== undefined) {
            updateData.body = newBody.trim();
        }

        // Resolving requires admin/manager permission
        if (is_resolved !== undefined) {
            if (!isAdmin && !isAuthor) {
                return NextResponse.json(
                    { error: 'Only admins or the author can resolve comments' },
                    { status: 403 }
                );
            }
            updateData.is_resolved = is_resolved;
            updateData.resolved_at = is_resolved ? new Date().toISOString() : null;
            updateData.resolved_by = is_resolved ? user.id : null;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Update comment
        const { data: updatedComment, error: updateError } = await supabase
            .from('content_comments')
            .update(updateData)
            .eq('id', commentId)
            .select(`
        *,
        author:profiles!author_id (
          id,
          full_name,
          avatar_url
        )
      `)
            .single();

        if (updateError) {
            console.error('Update comment error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update comment' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            comment: updatedComment,
            success: true,
        });

    } catch (error) {
        console.error('Comment PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update comment' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a comment
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

        const commentId = params.id;

        // Get the existing comment with workspace member info
        const { data: existingComment, error: fetchError } = await supabase
            .from('content_comments')
            .select(`
        *,
        workspace_members!inner(role, user_id)
      `)
            .eq('id', commentId)
            .single();

        if (fetchError || !existingComment) {
            return NextResponse.json(
                { error: 'Comment not found' },
                { status: 404 }
            );
        }

        // Check permissions
        const isAuthor = existingComment.author_id === user.id;

        // Check if user is admin in the workspace
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', existingComment.workspace_id)
            .eq('user_id', user.id)
            .single();

        const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

        // Authors can delete within 5 minutes, admins can always delete
        if (!isAdmin) {
            if (!isAuthor) {
                return NextResponse.json(
                    { error: 'You do not have permission to delete this comment' },
                    { status: 403 }
                );
            }

            const createdAt = new Date(existingComment.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (createdAt < fiveMinutesAgo) {
                return NextResponse.json(
                    { error: 'Comments can only be deleted within 5 minutes of creation' },
                    { status: 403 }
                );
            }
        }

        // Delete comment (will cascade to replies)
        const { error: deleteError } = await supabase
            .from('content_comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) {
            console.error('Delete comment error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete comment' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Comment deleted successfully',
        });

    } catch (error) {
        console.error('Comment DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete comment' },
            { status: 500 }
        );
    }
}
