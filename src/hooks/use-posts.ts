'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys, invalidateAllPostQueries } from '@/lib/react-query';
import type { Post } from '@/types';
import { toast } from 'sonner';
import { useEffect, useRef, useCallback } from 'react';
import { useSelectedWorkspace } from '@/store/workspaceStore';

/**
 * Fetch posts for the current workspace
 */
async function fetchPosts(workspaceId?: string, filters?: Record<string, any>): Promise<Post[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Determine workspace
  let targetWorkspaceId = workspaceId;

  if (!targetWorkspaceId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .maybeSingle();

    if (membership?.workspace_id) {
      targetWorkspaceId = membership.workspace_id;
    } else {
      const { data: fallbackWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!fallbackWorkspace) {
        throw new Error('No workspace found');
      }
      targetWorkspaceId = fallbackWorkspace.id;
    }
  }

  // Build query
  let query = supabase
    .from('posts')
    .select(`
      *,
      post_analytics(*)
    `)
    .eq('workspace_id', targetWorkspaceId)
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
 * Create a new post via API (to get proper validation)
 */
async function createPostViaAPI(postData: Partial<Post>): Promise<Post> {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to create post');
  }

  const result = await response.json();
  return result.data?.post || result.post;
}

/**
 * Update an existing post
 */
async function updatePost({ id, updates }: { id: string; updates: Partial<Post> }): Promise<Post> {
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
async function deletePostFn(id: string): Promise<{ id: string }> {
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
 * Includes real-time subscriptions and optimistic updates
 */
export function usePosts(filters?: Record<string, any>) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const selectedWorkspace = useSelectedWorkspace();
  const activeWorkspaceId = selectedWorkspace?.id;
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Build the query key for this specific filter set
  const currentQueryKey = queryKeys.posts.list({ 
    ...(filters || {}), 
    workspaceId: activeWorkspaceId 
  });

  // Fetch posts with React Query
  const {
    data: posts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: currentQueryKey,
    queryFn: () => fetchPosts(activeWorkspaceId, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!activeWorkspaceId,
  });

  // Set up real-time subscription with proper cleanup
  useEffect(() => {
    if (!activeWorkspaceId) {
      return;
    }

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `posts_changes_${activeWorkspaceId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        (payload) => {
          console.log('[Posts Realtime] Change detected:', payload.eventType);
          // Invalidate ALL post queries to ensure calendar and list views are in sync
          invalidateAllPostQueries(queryClient);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [queryClient, supabase, activeWorkspaceId]);

  // Helper to optimistically update all relevant caches
  const optimisticUpdateAllCaches = useCallback((
    updater: (posts: Post[]) => Post[]
  ) => {
    // Update all post list queries
    queryClient.setQueriesData<Post[]>(
      { queryKey: queryKeys.posts.lists() },
      (old) => old ? updater(old) : old
    );
    // Also update calendar queries
    queryClient.setQueriesData<Post[]>(
      { queryKey: queryKeys.posts.calendar() },
      (old) => old ? updater(old) : old
    );
  }, [queryClient]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: createPostViaAPI,
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Snapshot previous values for rollback
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.posts.all });

      // Optimistically add the new post with a temporary ID
      const optimisticPost = {
        ...newPost,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Post;

      optimisticUpdateAllCaches((old) => [optimisticPost, ...old]);

      return { previousData, optimisticId: optimisticPost.id };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback all caches on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      console.error('[usePosts] Create failed:', error);
    },
    onSuccess: (newPost, _variables, context) => {
      // Replace the optimistic post with the real one
      if (context?.optimisticId && newPost?.id) {
        optimisticUpdateAllCaches((old) => 
          old.map((post) => 
            post.id === context.optimisticId ? newPost : post
          )
        );
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      invalidateAllPostQueries(queryClient);
    },
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: updatePost,
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Snapshot for rollback
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.posts.all });

      // Optimistically update across all caches
      optimisticUpdateAllCaches((old) =>
        old.map((post) => (post.id === id ? { ...post, ...updates } : post))
      );

      return { previousData };
    },
    onError: (_error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('Failed to update post');
    },
    onSettled: () => {
      invalidateAllPostQueries(queryClient);
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: deletePostFn,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Snapshot for rollback
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.posts.all });

      // Optimistically remove across all caches
      optimisticUpdateAllCaches((old) => old.filter((post) => post.id !== id));

      return { previousData };
    },
    onError: (_error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('Failed to delete post');
    },
    onSettled: () => {
      invalidateAllPostQueries(queryClient);
    },
  });

  // Update status mutation (uses server action)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Post['status'] }) => {
      if (!activeWorkspaceId) throw new Error('No workspace selected');
      const { updatePostStatus } = await import('@/app/actions/post-actions');
      return updatePostStatus(id, status, activeWorkspaceId);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });
      
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.posts.all });
      
      // Optimistic update
      optimisticUpdateAllCaches((old) =>
        old.map((post) => (post.id === id ? { ...post, status } : post))
      );
      
      return { previousData };
    },
    onError: (_error: Error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('Failed to update status');
    },
    onSuccess: () => {
      toast.success('Status updated');
    },
    onSettled: () => {
      invalidateAllPostQueries(queryClient);
    }
  });

  return {
    posts,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    createPost: createMutation.mutate,
    createPostAsync: createMutation.mutateAsync,
    updatePost: (id: string, updates: Partial<Post>) => updateMutation.mutate({ id, updates }),
    updatePostAsync: (id: string, updates: Partial<Post>) =>
      updateMutation.mutateAsync({ id, updates }),
    deletePost: deleteMutation.mutate,
    updateStatus: updateStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending
  };
}
