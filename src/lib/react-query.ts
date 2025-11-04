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
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    
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
    
    // Don't refetch on reconnect by default
    refetchOnReconnect: false,
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
 */
export const queryKeys = {
  // Posts
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
  
  // Accounts
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (workspaceId?: string) => 
      workspaceId ? [...queryKeys.accounts.lists(), workspaceId] as const : queryKeys.accounts.lists(),
    details: () => [...queryKeys.accounts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
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

