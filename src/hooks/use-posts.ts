'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/react-query';
import type { Post } from '@/types';
import { toast } from 'sonner';
import { useEffect } from 'react';

/**
 * Fetch posts for the current workspace
 */
async function fetchPosts(filters?: Record<string, any>) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!workspace) {
    throw new Error('No workspace found');
  }

  // Build query
  let query = supabase
    .from('posts')
    .select(`
      *,
      post_analytics(*)
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.platform) {
    query = query.contains('platforms', [filters.platform]);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

/**
 * Create a new post
 */
async function createPost(postData: Partial<Post>) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing post
 */
async function updatePost({ id, updates }: { id: string; updates: Partial<Post> }) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a post
 */
async function deletePost(id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { id };
}

/**
 * Hook to fetch and manage posts with React Query
 */
export function usePosts(filters?: Record<string, any>) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch posts with React Query
  const {
    data: posts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.posts.list(filters || {}),
    queryFn: () => fetchPosts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes for posts
  });

  // Set up real-time subscription
  useEffect(() => {
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
          // Invalidate and refetch posts when changes occur
          queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, supabase]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: createPost,
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(queryKeys.posts.list(filters || {}));

      // Optimistically update
      if (previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), (old: Post[] = []) => [
          { ...newPost, id: `temp-${Date.now()}`, created_at: new Date().toISOString() } as Post,
          ...old,
        ]);
      }

      return { previousPosts };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), context.previousPosts);
      }
      toast.error('Failed to create post');
    },
    onSuccess: () => {
      toast.success('Post created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: updatePost,
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      const previousPosts = queryClient.getQueryData(queryKeys.posts.list(filters || {}));

      // Optimistically update
      if (previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), (old: Post[] = []) =>
          old.map((post) => (post.id === id ? { ...post, ...updates } : post))
        );
      }

      return { previousPosts };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), context.previousPosts);
      }
      toast.error('Failed to update post');
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      const previousPosts = queryClient.getQueryData(queryKeys.posts.list(filters || {}));

      // Optimistically remove
      if (previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), (old: Post[] = []) =>
          old.filter((post) => post.id !== id)
        );
      }

      return { previousPosts };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKeys.posts.list(filters || {}), context.previousPosts);
      }
      toast.error('Failed to delete post');
    },
    onSuccess: () => {
      toast.success('Post deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  return {
    posts,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    createPost: createMutation.mutate,
    updatePost: (id: string, updates: Partial<Post>) => updateMutation.mutate({ id, updates }),
    deletePost: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
