import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { Post } from '@/types';

// Mock data generator for development
const generateMockPosts = (start: Date, end: Date): Post[] => {
  const posts: Post[] = [];
  const platforms = ['instagram', 'facebook', 'twitter', 'linkedin'] as const;
  const statuses = ['draft', 'scheduled', 'published'] as const;

  // Generate some random posts
  for (let i = 0; i < 20; i++) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    posts.push({
      id: `mock-${i}`,
      content: { text: `Mock post content ${i}` } as any,
      platforms: [platform],
      status: status,
      scheduled_at: date.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workspace_id: 'workspace-1',
    });
  }

  return posts;
};

export function useCalendarPosts(start: Date, end: Date) {
  return useQuery({
    queryKey: [...queryKeys.posts.list({ start: start.toISOString(), end: end.toISOString() })],
    queryFn: async () => {
      // In a real app, this would fetch from the API
      // const response = await fetch(`/api/posts?start=${start.toISOString()}&end=${end.toISOString()}`);
      // if (!response.ok) throw new Error('Failed to fetch posts');
      // return response.json();

      // Return mock data for now
      return new Promise<Post[]>((resolve) => {
        setTimeout(() => {
          resolve(generateMockPosts(start, end));
        }, 500);
      });
    },
  });
}
