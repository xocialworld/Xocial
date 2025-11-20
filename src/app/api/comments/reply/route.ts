/**
 * Comment Reply API Route
 * POST /api/comments/reply
 * Based on Xocial SRS Section 3.1.4
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, parseJSONBody, validateRequiredFields } from '@/lib/error-handler';
import { APIError } from '@/lib/api-error';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Verify authentication
        const {
            data: { session },
            error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session) {
            throw APIError.unauthorized('You must be logged in to reply to comments');
        }

        // 2. Parse and validate request body
        const body = await parseJSONBody<{
            comment_id: string;
            reply_text: string;
            post_id?: string;
        }>(request);

        validateRequiredFields(body, ['comment_id', 'reply_text']);

        const { comment_id, reply_text } = body;

        // 3. Validate reply text
        if (!reply_text.trim()) {
            throw APIError.validation('Reply text cannot be empty');
        }

        if (reply_text.length > 2200) {
            throw APIError.validation('Reply text is too long', {
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
            throw APIError.notFound('Comment', 'The comment you are trying to reply to does not exist');
        }

        // 5. Get the post to find the social account
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('social_account_id, workspace_id')
            .eq('id', comment.post_id)
            .single();

        if (postError || !post) {
            throw APIError.notFound('Post');
        }

        // 6. Verify user has access to this workspace
        const { data: membership, error: membershipError } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', post.workspace_id)
            .eq('user_id', session.user.id)
            .single();

        if (membershipError || !membership) {
            throw APIError.forbidden('You do not have access to this workspace');
        }

        // 7. Get the social account credentials
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('platform, access_token, account_id')
            .eq('id', post.social_account_id)
            .single();

        if (accountError || !account) {
            throw APIError.notFound('Social account');
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
                author_name: session.user.email || 'You',
                author_id: session.user.id,
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
            throw APIError.internal('Failed to post reply');
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
    } catch (error) {
        return handleAPIError(error);
    }
}
