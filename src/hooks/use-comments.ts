import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  content_item_id: string;
  workspace_id: string;
  author_id: string;
  body: string;
  visibility: 'internal' | 'external';
  mentions: string[];
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar_url: string;
  };
}

async function fetchComments(contentId: string, workspaceId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('content_comments')
    .select(`
      *,
      author:profiles(name, avatar_url)
    `)
    .eq('content_item_id', contentId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
  return data as Comment[];
}

async function createComment({ contentId, workspaceId, body }: { contentId: string; workspaceId: string; body: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_comments')
    .insert({
      content_item_id: contentId,
      workspace_id: workspaceId,
      author_id: user.id,
      body,
      visibility: 'internal',
    })
    .select(`
      *,
      author:profiles(name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as Comment;
}

export function useComments(contentId: string) {
  const queryClient = useQueryClient();
  const selectedWorkspace = useSelectedWorkspace();
  const workspaceId = selectedWorkspace?.id;
  const supabase = createClient();

  const queryKey = useMemo(() => ['comments', contentId], [contentId]);

  // Realtime subscription
  useEffect(() => {
    if (!contentId || !workspaceId) return;

    const channel = supabase
      .channel(`comments:${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_comments',
          filter: `content_item_id=eq.${contentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, queryKey, workspaceId, queryClient, supabase]);

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchComments(contentId, workspaceId!),
    enabled: !!contentId && !!workspaceId,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: (body: string) => createComment({ contentId, workspaceId: workspaceId!, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  return {
    comments,
    isLoading,
    addComment: createMutation.mutateAsync,
    isAdding: createMutation.isPending,
  };
}
