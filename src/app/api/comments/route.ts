/**
 * Content Comments API
 * GET, POST /api/comments
 * 
 * CRUD operations for content comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch comments for a content item
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const contentItemId = searchParams.get('content_item_id');
        const workspaceId = searchParams.get('workspace_id');

        if (!contentItemId && !workspaceId) {
            return NextResponse.json(
                { error: 'content_item_id or workspace_id is required' },
                { status: 400 }
            );
        }

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
            .order('created_at', { ascending: true });

        if (contentItemId) {
            query = query.eq('content_item_id', contentItemId);
        }
        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId);
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
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            content_item_id,
            workspace_id,
            body: commentBody,
            parent_id,
            visibility = 'internal',
            mentions = [],
        } = body;

        if (!content_item_id || !workspace_id || !commentBody?.trim()) {
            return NextResponse.json(
                { error: 'content_item_id, workspace_id, and body are required' },
                { status: 400 }
            );
        }

        // Verify user has access to the workspace
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Create comment
        const { data: comment, error } = await supabase
            .from('content_comments')
            .insert({
                content_item_id,
                workspace_id,
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

        // TODO: Send notifications to mentioned users
        if (mentions.length > 0) {
            // Queue notification job
        }

        return NextResponse.json({
            comment,
            success: true,
        });

    } catch (error) {
        console.error('Comments POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create comment' },
            { status: 500 }
        );
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
