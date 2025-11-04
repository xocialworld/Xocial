import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

/**
 * Get engagement history for a specific post across all platforms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const postId = params.id;

    // Verify user has access to this post
    const { data: post } = await supabase
      .from('posts')
      .select('workspace_id')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new APIError(404, 'Post not found');
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', post.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      throw new APIError(403, 'Access denied');
    }

    // Get all platform posts for this post
    const { data: platformPosts } = await supabase
      .from('platform_posts')
      .select('*')
      .eq('post_id', postId);

    if (!platformPosts || platformPosts.length === 0) {
      return NextResponse.json({
        data: {
          platforms: [],
          totalEngagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            saves: 0,
          },
        },
      });
    }

    // Get engagement history for each platform post
    const platformEngagement = await Promise.all(
      platformPosts.map(async (platformPost) => {
        const { data: history } = await supabase
          .from('engagement_history')
          .select('*')
          .eq('platform_post_id', platformPost.id)
          .order('recorded_at', { ascending: true });

        const latest = history && history.length > 0 ? history[history.length - 1] : null;

        return {
          platform: platformPost.platform,
          platformPostId: platformPost.platform_post_id,
          permalink: platformPost.permalink,
          history: history || [],
          current: latest || {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            saves: 0,
          },
        };
      })
    );

    // Calculate total engagement across all platforms
    const totalEngagement = platformEngagement.reduce(
      (total, platform) => ({
        likes: total.likes + (platform.current.likes || 0),
        comments: total.comments + (platform.current.comments || 0),
        shares: total.shares + (platform.current.shares || 0),
        views: total.views + (platform.current.views || 0),
        saves: total.saves + (platform.current.saves || 0),
      }),
      { likes: 0, comments: 0, shares: 0, views: 0, saves: 0 }
    );

    return NextResponse.json({
      data: {
        platforms: platformEngagement,
        totalEngagement,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

