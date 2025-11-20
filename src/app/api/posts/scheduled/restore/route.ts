/**
 * Post Restore API Route
 * POST /api/posts/scheduled/restore
 * Based on Xocial SRS Section 3.2.4
 * Restores a deleted post within the undo window
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
            throw APIError.unauthorized('You must be logged in to restore posts');
        }

        // 2. Parse and validate request body
        const body = await parseJSONBody<{
            post_id: string;
            restore_token: string;
        }>(request);

        validateRequiredFields(body, ['post_id', 'restore_token']);

        const { post_id, restore_token } = body;

        // 3. Get the post (including soft-deleted ones)
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*, workspace_id')
            .eq('id', post_id)
            .single();

        if (postError || !post) {
            throw APIError.notFound('Post', 'The post you are trying to restore does not exist');
        }

        // 4. Verify user has access to this workspace
        const { data: membership, error: membershipError } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', post.workspace_id)
            .eq('user_id', session.user.id)
            .single();

        if (membershipError || !membership) {
            throw APIError.forbidden('You do not have access to this workspace');
        }

        // 5. Verify restore token
        // In production, you'd store the token with expiry in the database or cache
        // For now, we'll use a simple time-based check
        const metadata = post.metadata as any;
        const storedToken = metadata?.restore_token;
        const deletedAt = metadata?.deleted_at;

        if (!storedToken || storedToken !== restore_token) {
            throw APIError.validation('Invalid restore token');
        }

        // Check if within 5-second undo window
        if (deletedAt) {
            const deletedTime = new Date(deletedAt).getTime();
            const now = Date.now();
            const timeDiff = now - deletedTime;

            if (timeDiff > 5000) {
                throw APIError.validation('Undo window expired', {
                    hint: 'Posts can only be restored within 5 seconds of deletion',
                });
            }
        }

        // 6. Restore the post (remove soft delete markers)
        const { data: restoredPost, error: restoreError } = await supabase
            .from('posts')
            .update({
                metadata: {
                    ...metadata,
                    restore_token: null,
                    deleted_at: null,
                    restored_at: new Date().toISOString(),
                },
            })
            .eq('id', post_id)
            .select()
            .single();

        if (restoreError) {
            console.error('Failed to restore post:', restoreError);
            throw APIError.internal('Failed to restore post');
        }

        // 7. Return success response
        return NextResponse.json(
            {
                post: restoredPost,
                message: 'Post restored successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        return handleAPIError(error);
    }
}
