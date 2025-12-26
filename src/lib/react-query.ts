/**
 * React Query Configuration
 * Centralized configuration for data fetching, caching, and state management
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for React Query
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Data is considered fresh for 2 minutes (reduced for better responsiveness)
    staleTime: 2 * 60 * 1000,

    // Cache data for 10 minutes
    gcTime: 10 * 60 * 1000,

    // Retry failed requests once
    retry: 1,

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,

    // Refetch on mount if data is stale
    refetchOnMount: true,

    // Refetch on reconnect for better offline handling
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations once
    retry: 1,

    // Retry delay for mutations
    retryDelay: 1000,
  },
};

/**
 * Create a new QueryClient instance with default configuration
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryConfig,
  });
}

/**
 * Query key factory for consistent cache keys
 * 
 * IMPORTANT: When invalidating queries, use the parent key to invalidate all children.
 * Example: queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
 * This will invalidate all post queries including lists, calendar, and details.
 */
export const queryKeys = {
  // Posts - Unified key structure for all post-related queries
  posts: {
    // Base key - invalidating this invalidates ALL post queries
    all: ['posts'] as const,
    
    // List queries (general posts list)
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.posts.lists(), filters] as const,
    
    // Calendar-specific queries (posts within date range)
    // NOTE: This is kept for backwards compatibility but new code uses calendar.entries
    calendar: () => [...queryKeys.posts.all, 'calendar'] as const,
    calendarRange: (params: { start: string; end: string; workspaceId?: string }) => 
      [...queryKeys.posts.calendar(), params] as const,
    
    // Single post details
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    
    // Unscheduled drafts (for sidebar/panel)
    unscheduled: (workspaceId: string) => [...queryKeys.posts.all, 'unscheduled', workspaceId] as const,
  },

  // Calendar - Separate key namespace for unified calendar entries
  // This includes posts, content_items, content_variants, and external_posts
  calendar: {
    all: ['calendar'] as const,
    entries: (params?: { start?: string; end?: string; workspaceId?: string }) => 
      params ? [...queryKeys.calendar.all, 'entries', params] as const : [...queryKeys.calendar.all, 'entries'] as const,
  },

  // Accounts
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (workspaceId?: string) =>
      workspaceId ? [...queryKeys.accounts.lists(), workspaceId] as const : queryKeys.accounts.lists(),
    details: () => [...queryKeys.accounts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
    // Platform-specific account queries
    platform: (platform: string, workspaceId?: string) => 
      [...queryKeys.accounts.all, 'platform', platform, workspaceId] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    overview: (params?: Record<string, any>) =>
      params ? [...queryKeys.analytics.all, 'overview', params] as const : [...queryKeys.analytics.all, 'overview'] as const,
    engagement: (params?: Record<string, any>) =>
      params ? [...queryKeys.analytics.all, 'engagement', params] as const : [...queryKeys.analytics.all, 'engagement'] as const,
    platformStats: (platform?: string) =>
      platform ? [...queryKeys.analytics.all, 'platform-stats', platform] as const : [...queryKeys.analytics.all, 'platform-stats'] as const,
    topPosts: (params?: Record<string, any>) =>
      params ? [...queryKeys.analytics.all, 'top-posts', params] as const : [...queryKeys.analytics.all, 'top-posts'] as const,
  },

  // Engagement
  engagement: {
    all: ['engagement'] as const,
    lists: () => [...queryKeys.engagement.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      filters ? [...queryKeys.engagement.lists(), filters] as const : queryKeys.engagement.lists(),
    stats: () => [...queryKeys.engagement.all, 'stats'] as const,
  },

  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      filters ? [...queryKeys.templates.lists(), filters] as const : queryKeys.templates.lists(),
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      filters ? [...queryKeys.media.lists(), filters] as const : queryKeys.media.lists(),
    details: () => [...queryKeys.media.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.media.details(), id] as const,
  },

  // Strategy
  strategy: {
    all: ['strategy'] as const,
    weekly: () => [...queryKeys.strategy.all, 'weekly'] as const,
    bestTimes: () => [...queryKeys.strategy.all, 'best-times'] as const,
    contentIdeas: () => [...queryKeys.strategy.all, 'content-ideas'] as const,
    insights: () => [...queryKeys.strategy.all, 'insights'] as const,
  },

  // Workspace
  workspace: {
    all: ['workspace'] as const,
    current: () => [...queryKeys.workspace.all, 'current'] as const,
    members: (workspaceId: string) => [...queryKeys.workspace.all, 'members', workspaceId] as const,
  },
};

/**
 * Helper to invalidate all post-related queries
 * Use this after creating, updating, or deleting posts
 * 
 * CRITICAL: This now also invalidates calendar queries since they share data
 */
export async function invalidateAllPostQueries(queryClient: QueryClient) {
  // Invalidate legacy post queries
  await queryClient.invalidateQueries({ 
    queryKey: queryKeys.posts.all,
    refetchType: 'all'
  });
  
  // Invalidate calendar queries (they use a separate key namespace)
  await queryClient.invalidateQueries({ 
    queryKey: queryKeys.calendar.all,
    refetchType: 'all'
  });
  
  console.log('[React Query] Invalidated all post and calendar queries');
}

/**
 * Helper to invalidate calendar-specific queries only
 */
export async function invalidateCalendarQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ 
    queryKey: queryKeys.calendar.all,
    refetchType: 'all'
  });
  
  // Also invalidate legacy calendar key under posts
  await queryClient.invalidateQueries({ 
    queryKey: queryKeys.posts.calendar(),
    refetchType: 'all'
  });
}

/**
 * Error handler for React Query
 */
export function handleQueryError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unexpected error occurred';
}
