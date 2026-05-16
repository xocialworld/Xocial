/**
 * Content Comments API
 * GET, POST /api/comments
 * 
 * CRUD operations for content comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

async function assertCommentTargetInWorkspace(
    supabase: any,
    workspaceId: string,
    contentItemId: string
) {
    const { data: contentItem, error: contentItemError } = await supabase
        .from('content_items')
        .select('id')
        .eq('id', contentItemId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (contentItemError && contentItemError.code !== '42P01') {
        throw new APIError(500, contentItemError.message, 'DATABASE_ERROR');
    }

    if (contentItem) {
        return;
    }

    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id')
        .eq('id', contentItemId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (postError && postError.code !== '42P01') {
        throw new APIError(500, postError.message, 'DATABASE_ERROR');
    }

    if (!post) {
        throw new APIError(
            400,
            'Comment target does not belong to the selected workspace',
            'INVALID_WORKSPACE_RESOURCE'
        );
    }
}

// GET - Fetch comments for a content item
export async function GET(request: NextRequest) {
    try {
        const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

        const searchParams = request.nextUrl.searchParams;
        const contentItemId = searchParams.get('content_item_id');
        const commentId = searchParams.get('id');

        // Build query
        let query = supabase
            .from('content_comments')
            .select(`
        *,
        author:profiles!author_id (
          id,
          full_name,
          avatar_url
        ),
        resolved_by_user:profiles!resolved_by (
          id,
          full_name
        )
      `)
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: true });

        if (commentId) {
            query = query.eq('id', commentId);
        }
        if (contentItemId) {
            query = query.eq('content_item_id', contentItemId);
        }
        const { data: comments, error } = await query;

        if (error) {
            console.error('Fetch comments error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch comments' },
                { status: 500 }
            );
        }

        // Organize comments into threads (parent + replies)
        const threads = organizeThreads(comments || []);

        return NextResponse.json({
            comments,
            threads,
            total: comments?.length || 0,
        });

    } catch (error) {
        console.error('Comments GET error:', error);
        return handleAPIError(error);
    }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
    try {
        const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

        const body = await request.json();
        const {
            content_item_id,
            workspace_id,
            body: commentBody,
            parent_id,
            visibility = 'internal',
            mentions = [],
        } = body;

        if (!content_item_id || !commentBody?.trim()) {
            return NextResponse.json(
                { error: 'content_item_id and body are required' },
                { status: 400 }
            );
        }

        if (workspace_id && workspace_id !== workspace.id) {
            throw new APIError(400, 'workspace_id must match the selected workspace');
        }

        await assertCommentTargetInWorkspace(supabase, workspace.id, content_item_id);

        if (parent_id) {
            const { data: parentComment, error: parentError } = await supabase
                .from('content_comments')
                .select('id')
                .eq('id', parent_id)
                .eq('workspace_id', workspace.id)
                .eq('content_item_id', content_item_id)
                .maybeSingle();

            if (parentError || !parentComment) {
                throw new APIError(400, 'Parent comment does not belong to the selected workspace');
            }
        }

        // Create comment
        const { data: comment, error } = await supabase
            .from('content_comments')
            .insert({
                content_item_id,
                workspace_id: workspace.id,
                author_id: user.id,
                body: commentBody.trim(),
                parent_id: parent_id || null,
                visibility,
                mentions,
            })
            .select(`
        *,
        author:profiles!author_id (
          id,
          full_name,
          avatar_url
        )
      `)
            .single();

        if (error) {
            console.error('Create comment error:', error);
            return NextResponse.json(
                { error: 'Failed to create comment' },
                { status: 500 }
            );
        }

        // Send notifications
        // 1. Notify mentioned users
        // Assuming simple mentions array is passed or we parse body. 
        // The frontend passes 'mentions' array in body, let's use that for reliability if available.
        const mentionedUserIds = Array.isArray(mentions) ? mentions : [];

        // Also parse body for @mentions if frontend doesn't send explicit array, 
        // or just rely on explicit array to avoid parsing issues.
        // Let's stick to the explicit 'mentions' array from request body for now.

        if (mentionedUserIds.length > 0) {
            const { createNotification } = await import('@/lib/notifications');

            await Promise.all(mentionedUserIds.map(async (mentionedUserId: string) => {
                if (mentionedUserId === user.id) return; // Don't notify self

                await createNotification({
                    workspaceId: workspace.id,
                    userId: mentionedUserId,
                    type: 'mention',
                    title: 'You were mentioned',
                    message: `${user.user_metadata.full_name || 'Someone'} mentioned you in a comment`,
                    data: {
                        commentId: comment.id,
                        contentItemId: content_item_id,
                        actorId: user.id
                    }
                });
            }));
        }

        // 2. Notify post author (if not self and not already mentioned)
        // We need to fetch post author
        const { data: post } = await supabase
            .from('posts')
            .select('created_by')
            .eq('id', content_item_id)
            .eq('workspace_id', workspace.id)
            .single();

        if (post && post.created_by && post.created_by !== user.id && !mentionedUserIds.includes(post.created_by)) {
            const { createNotification } = await import('@/lib/notifications');
            await createNotification({
                workspaceId: workspace.id,
                userId: post.created_by,
                type: 'comment_received',
                title: 'New Comment',
                message: `${user.user_metadata.full_name || 'Someone'} commented on your post`,
                data: {
                    commentId: comment.id,
                    contentItemId: content_item_id,
                    actorId: user.id
                }
            });
        }

        // 3. Notify parent comment author if reply (if not self, post author, or mentioned)
        if (parent_id) {
            const { data: parentComment } = await supabase
                .from('content_comments')
                .select('author_id')
                .eq('id', parent_id)
                .eq('workspace_id', workspace.id)
                .single();

            if (parentComment &&
                parentComment.author_id !== user.id &&
                parentComment.author_id !== post?.created_by &&
                !mentionedUserIds.includes(parentComment.author_id)) {

                const { createNotification } = await import('@/lib/notifications');
                await createNotification({
                    workspaceId: workspace.id,
                    userId: parentComment.author_id,
                    type: 'comment_reply',
                    title: 'New Reply',
                    message: `${user.user_metadata.full_name || 'Someone'} replied to your comment`,
                    data: {
                        commentId: comment.id,
                        contentItemId: content_item_id,
                        actorId: user.id
                    }
                });
            }
        }

        return NextResponse.json({
            comment,
            success: true,
        });

    } catch (error) {
        console.error('Comments POST error:', error);
        return handleAPIError(error);
    }
}

// Helper function to organize comments into threads
function organizeThreads(comments: any[]) {
    const threads: any[] = [];
    const commentMap = new Map<string, any>();

    // First pass: index all comments
    comments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into threads
    comments.forEach(comment => {
        if (comment.parent_id) {
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
                parent.replies.push(commentMap.get(comment.id));
            }
        } else {
            threads.push(commentMap.get(comment.id));
        }
    });

    return threads;
}
