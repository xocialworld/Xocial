import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

/**
 * Get real-time engagement metrics for recent posts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get user's workspace
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    // Get recent platform posts with latest engagement
    const { data: platformPosts, error: postsError } = await supabase
      .from('platform_posts')
      .select(`
        id,
        platform,
        platform_post_id,
        permalink,
        published_at,
        posts!inner(
          id,
          workspace_id,
          content,
          platforms
        )
      `)
      .eq('posts.workspace_id', workspaceMember.workspace_id)
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })
      .limit(50);

    if (postsError) {
      throw new APIError(500, 'Failed to fetch platform posts');
    }

    // Get latest engagement for each platform post
    const postsWithEngagement = await Promise.all(
      (platformPosts || []).map(async (platformPost: any) => {
        const { data: latestEngagement } = await supabase
          .from('engagement_history')
          .select('*')
          .eq('platform_post_id', platformPost.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...platformPost,
          engagement: latestEngagement || {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            saves: 0,
          },
        };
      })
    );

    return NextResponse.json({
      data: postsWithEngagement,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

