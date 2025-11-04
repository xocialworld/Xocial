import { create } from 'zustand';
import { Post, PostStatus, Platform } from '@/types';

interface PostsFilter {
  status?: PostStatus[];
  platforms?: Platform[];
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
  campaignId?: string;
}

interface PostsState {
  posts: Post[];
  selectedPost: Post | null;
  filters: PostsFilter;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setFilters: (filters: Partial<PostsFilter>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  incrementPage: () => void;
  getFilteredPosts: () => Post[];
  reset: () => void;
}

const initialState = {
  posts: [],
  selectedPost: null,
  filters: {},
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,
};

export const usePostsStore = create<PostsState>((set, get) => ({
  ...initialState,

  setPosts: (posts) =>
    set({ posts }),

  addPost: (post) =>
    set((state) => ({
      posts: [post, ...state.posts],
    })),

  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === id ? { ...post, ...updates } : post
      ),
      selectedPost:
        state.selectedPost?.id === id
          ? { ...state.selectedPost, ...updates }
          : state.selectedPost,
    })),

  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
      selectedPost: state.selectedPost?.id === id ? null : state.selectedPost,
    })),

  setSelectedPost: (post) =>
    set({ selectedPost: post }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1, // Reset page when filters change
    })),

  resetFilters: () =>
    set({ filters: {}, page: 1 }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  setHasMore: (hasMore) =>
    set({ hasMore }),

  setPage: (page) =>
    set({ page }),

  incrementPage: () =>
    set((state) => ({ page: state.page + 1 })),

  getFilteredPosts: () => {
    const state = get();
    let filtered = [...state.posts];

    // Filter by status
    if (state.filters.status && state.filters.status.length > 0) {
      filtered = filtered.filter((post) =>
        state.filters.status!.includes(post.status)
      );
    }

    // Filter by platforms
    if (state.filters.platforms && state.filters.platforms.length > 0) {
      filtered = filtered.filter((post) =>
        post.platforms.some((platform) =>
          state.filters.platforms!.includes(platform)
        )
      );
    }

    // Filter by date range
    if (state.filters.dateRange) {
      filtered = filtered.filter((post) => {
        const postDate = new Date(post.created_at);
        return (
          postDate >= state.filters.dateRange!.start &&
          postDate <= state.filters.dateRange!.end
        );
      });
    }

    // Filter by search query
    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase();
      filtered = filtered.filter((post) => {
        const contentText = Object.values(post.content)
          .map((c) => c.text)
          .join(' ')
          .toLowerCase();
        return contentText.includes(query);
      });
    }

    // Filter by campaign
    if (state.filters.campaignId) {
      filtered = filtered.filter(
        (post) => post.campaign_id === state.filters.campaignId
      );
    }

    return filtered;
  },

  reset: () =>
    set(initialState),
}));

