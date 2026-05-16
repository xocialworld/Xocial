import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

function parseFutureSchedule(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new APIError(400, 'Each schedule must be a valid future date');
  }

  const scheduledDate = new Date(value);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new APIError(400, 'Each schedule must be a valid future date');
  }

  if (scheduledDate <= new Date()) {
    throw new APIError(400, 'Scheduled time must be in the future');
  }

  return scheduledDate.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const body = await request.json();
    const { action, postIds, schedules } = body;

    if (!action || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new APIError(400, 'Invalid request');
    }

    const uniquePostIds = Array.from(
      new Set(postIds.filter((postId): postId is string => typeof postId === 'string'))
    );

    if (uniquePostIds.length === 0) {
      throw new APIError(400, 'Invalid request');
    }

    // Get user's workspace
    const { data: workspaceMember, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    // Verify all posts belong to user's workspace
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, workspace_id, status')
      .in('id', uniquePostIds);

    if (postsError) {
      throw new APIError(500, 'Failed to fetch posts');
    }

    if (!posts || posts.length !== uniquePostIds.length) {
      throw new APIError(404, 'Some posts were not found');
    }

    const invalidPosts = posts?.filter(
      (post) => post.workspace_id !== workspaceMember.workspace_id
    );

    if (invalidPosts && invalidPosts.length > 0) {
      throw new APIError(403, 'Some posts do not belong to your workspace');
    }

    // Perform bulk action
    switch (action) {
      case 'delete':
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('workspace_id', workspaceMember.workspace_id)
          .in('id', uniquePostIds);

        if (deleteError) {
          throw new APIError(500, 'Failed to delete posts');
        }
        break;

      case 'archive':
        const { error: archiveError } = await supabase
          .from('posts')
          .update({ status: 'archived' })
          .eq('workspace_id', workspaceMember.workspace_id)
          .in('id', uniquePostIds);

        if (archiveError) {
          throw new APIError(500, 'Failed to archive posts');
        }
        break;

      case 'publish':
        const nonQueueablePosts = posts.filter(
          (post) => !['draft', 'approved'].includes(post.status)
        );

        if (nonQueueablePosts.length > 0) {
          throw new APIError(400, 'Only draft or approved posts can be queued for bulk publish');
        }

        const queuedAt = new Date().toISOString();
        const { data: queuedPosts, error: publishError } = await supabase
          .from('posts')
          .update({
            status: 'scheduled',
            scheduled_at: queuedAt,
            published_at: null,
            error_message: null,
            updated_at: queuedAt,
          })
          .eq('workspace_id', workspaceMember.workspace_id)
          .in('id', uniquePostIds)
          .in('status', ['draft', 'approved'])
          .select('id');

        if (publishError) {
          throw new APIError(500, 'Failed to queue posts for publishing');
        }

        if (!queuedPosts || queuedPosts.length !== uniquePostIds.length) {
          throw new APIError(409, 'Some posts changed status before they could be queued');
        }
        break;

      case 'schedule':
        if (!schedules || !Array.isArray(schedules) || schedules.length !== uniquePostIds.length) {
          throw new APIError(400, 'Invalid schedules');
        }

        const normalizedSchedules = schedules.map(parseFutureSchedule);

        // Update each post with its corresponding schedule
        const updatePromises = uniquePostIds.map((postId, index) => {
          return supabase
            .from('posts')
            .update({
              status: 'scheduled',
              scheduled_at: normalizedSchedules[index],
              updated_at: new Date().toISOString(),
            })
            .eq('id', postId)
            .eq('workspace_id', workspaceMember.workspace_id);
        });

        const results = await Promise.all(updatePromises);
        const errors = results.filter((result) => result.error);

        if (errors.length > 0) {
          throw new APIError(500, 'Failed to schedule some posts');
        }
        break;

      default:
        throw new APIError(400, 'Invalid action');
    }

    const message =
      action === 'publish'
        ? `Successfully queued ${uniquePostIds.length} post(s) for publishing`
        : `Successfully performed ${action} on ${uniquePostIds.length} post(s)`;

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
