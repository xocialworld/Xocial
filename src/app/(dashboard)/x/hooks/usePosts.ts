'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Post } from '@/types';
import { toast } from 'sonner';

export function usePosts(workspaceId?: string, accountId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const supabase = createClient();
  const POSTS_PER_PAGE = 12;

  const fetchPosts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get workspace ID if not provided
      let wsId = workspaceId;
      if (!wsId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        wsId = workspace?.id;
      }

      if (!wsId) {
        throw new Error('No workspace found');
      }

      // Build query
      let query = supabase
        .from('posts')
        .select(`
          *,
          post_analytics(*)
        `)
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE - 1);

      // Filter by account if provided
      if (accountId) {
        query = query.eq('social_account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (append) {
        setPosts((prev) => [...prev, ...(data || [])]);
      } else {
        setPosts(data || []);
      }

      setHasMore(data && data.length === POSTS_PER_PAGE);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const deletePost = async (postId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      toast.success('Post deleted');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      toast.error('Failed to delete post');
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [workspaceId, accountId]);

  return {
    posts,
    loading,
    error,
    hasMore,
    refetch: fetchPosts,
    loadMore,
    deletePost,
  };
}

