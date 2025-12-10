import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { Post } from '@/types';
import { useSelectedWorkspace } from '@/store/workspaceStore';

/**
 * Hook to fetch posts for a calendar date range
 * Uses the /api/posts endpoint with date filtering
 */
export function useCalendarPosts(start: Date, end: Date) {
  const workspace = useSelectedWorkspace();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: [
      ...queryKeys.posts.list({
        start: start.toISOString(),
        end: end.toISOString(),
        workspaceId
      })
    ],
    queryFn: async (): Promise<Post[]> => {
      const params = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
        limit: '200', // Reasonable limit for calendar view
      });

      if (workspaceId) {
        params.set('workspaceId', workspaceId);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch posts');
      }

      const data = await response.json();
      return data.data?.posts || data.posts || [];
    },
    enabled: Boolean(workspaceId),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
