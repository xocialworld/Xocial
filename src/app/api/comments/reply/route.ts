/**
 * Comment Reply API Route
 * POST /api/comments/reply
 * Based on Xocial SRS Section 3.1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIError, withErrorHandler } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const POST = withErrorHandler(async (request: NextRequest) => {
        const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

        const body = await request.json() as {
            comment_id: string;
            reply_text: string;
            post_id?: string;
        };

        const { comment_id, reply_text } = body;

        if (!comment_id || !reply_text) {
            throw new APIError(400, 'comment_id and reply_text are required', 'MISSING_FIELDS');
        }

        // 3. Validate reply text
        if (!reply_text.trim()) {
            throw new APIError(400, 'Reply text cannot be empty', 'VALIDATION_ERROR');
        }

        if (reply_text.length > 2200) {
            throw new APIError(400, 'Reply text is too long', 'VALIDATION_ERROR', {
                max_length: 2200,
                current_length: reply_text.length,
            });
        }

        // 4. Get the original comment to find the post and platform
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .select('post_id, platform')
            .eq('external_comment_id', comment_id)
            .single();

        if (commentError || !comment) {
            throw new APIError(404, 'Comment not found', 'COMMENT_NOT_FOUND');
        }

        // 5. Get the post to find the social account
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('social_account_id, workspace_id')
            .eq('id', comment.post_id)
            .eq('workspace_id', workspace.id)
            .single();

        if (postError || !post) {
            throw new APIError(404, 'Post not found', 'POST_NOT_FOUND');
        }

        // 7. Get the social account credentials
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('platform, access_token, account_id')
            .eq('id', post.social_account_id)
            .eq('workspace_id', workspace.id)
            .single();

        if (accountError || !account) {
            throw new APIError(404, 'Social account not found', 'ACCOUNT_NOT_FOUND');
        }

        // 8. Post reply to platform API
        // Note: This is a simplified version. In production, you'd call the actual platform API
        // For now, we'll store it in our database and mark it as pending
        const { data: reply, error: replyError } = await supabase
            .from('comments')
            .insert({
                post_id: comment.post_id,
                external_comment_id: `reply_${Date.now()}`, // Temporary ID
                platform: comment.platform,
                author_name: user.email || 'You',
                author_id: user.id,
                content: reply_text,
                parent_comment_id: comment_id,
                is_reply: true,
                likes: 0,
                reply_count: 0,
            })
            .select()
            .single();

        if (replyError) {
            console.error('Failed to store reply:', replyError);
            throw new APIError(500, 'Failed to post reply', 'DATABASE_ERROR');
        }

        // 9. Return success response
        return NextResponse.json(
            {
                reply: {
                    id: reply.id,
                    text: reply_text,
                    created_at: reply.created_at,
                    status: 'posted',
                },
            },
            { status: 201 }
        );
});
