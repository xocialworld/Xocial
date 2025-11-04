import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

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
      .select('id, workspace_id')
      .in('id', postIds);

    if (postsError) {
      throw new APIError(500, 'Failed to fetch posts');
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
          .in('id', postIds);

        if (deleteError) {
          throw new APIError(500, 'Failed to delete posts');
        }
        break;

      case 'archive':
        const { error: archiveError } = await supabase
          .from('posts')
          .update({ status: 'archived' })
          .in('id', postIds);

        if (archiveError) {
          throw new APIError(500, 'Failed to archive posts');
        }
        break;

      case 'publish':
        const { error: publishError } = await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .in('id', postIds);

        if (publishError) {
          throw new APIError(500, 'Failed to publish posts');
        }
        break;

      case 'schedule':
        if (!schedules || !Array.isArray(schedules) || schedules.length !== postIds.length) {
          throw new APIError(400, 'Invalid schedules');
        }

        // Update each post with its corresponding schedule
        const updatePromises = postIds.map((postId, index) => {
          return supabase
            .from('posts')
            .update({
              status: 'scheduled',
              scheduled_for: schedules[index],
            })
            .eq('id', postId);
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

    return NextResponse.json({
      success: true,
      message: `Successfully performed ${action} on ${postIds.length} post(s)`,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

