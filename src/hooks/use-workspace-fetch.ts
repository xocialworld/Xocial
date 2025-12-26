'use client';

import { useCallback } from 'react';
import { useSelectedWorkspace, useHasHydrated } from '@/store/workspaceStore';
import {
  fetchWithWorkspace,
  postWithWorkspace,
  patchWithWorkspace,
  deleteWithWorkspace,
  buildUrlWithWorkspace,
  type FetchWithWorkspaceOptions,
} from '@/lib/fetch-with-workspace';

/**
 * React hook for workspace-aware fetch operations
 * 
 * This hook provides fetch utilities that automatically include the currently
 * selected workspace ID in all requests. Use this in React components instead
 * of raw fetch calls to ensure workspace context is always included.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { post, patch, del, isReady } = useWorkspaceFetch();
 *   
 *   const handleCreate = async () => {
 *     if (!isReady) return;
 *     const { data, ok } = await post('/api/posts', { content: '...' });
 *   };
 * }
 * ```
 */
export function useWorkspaceFetch() {
  const selectedWorkspace = useSelectedWorkspace();
  const hasHydrated = useHasHydrated();
  
  const workspaceId = selectedWorkspace?.id;
  const isReady = hasHydrated && !!workspaceId;
  
  /**
   * Fetch with workspace context
   */
  const fetch = useCallback(
    async (input: RequestInfo | URL, options?: FetchWithWorkspaceOptions) => {
      return fetchWithWorkspace(input, { ...options, workspaceId });
    },
    [workspaceId]
  );
  
  /**
   * POST with workspace context
   */
  const post = useCallback(
    async <T = any>(url: string, body: unknown, options?: Omit<FetchWithWorkspaceOptions, 'method' | 'body'>) => {
      return postWithWorkspace<T>(url, body, { ...options, workspaceId });
    },
    [workspaceId]
  );
  
  /**
   * PATCH with workspace context
   */
  const patch = useCallback(
    async <T = any>(url: string, body: unknown, options?: Omit<FetchWithWorkspaceOptions, 'method' | 'body'>) => {
      return patchWithWorkspace<T>(url, body, { ...options, workspaceId });
    },
    [workspaceId]
  );
  
  /**
   * DELETE with workspace context
   */
  const del = useCallback(
    async (url: string, options?: Omit<FetchWithWorkspaceOptions, 'method'>) => {
      return deleteWithWorkspace(url, { ...options, workspaceId });
    },
    [workspaceId]
  );
  
  /**
   * Build URL with workspace query parameter
   */
  const buildUrl = useCallback(
    (baseUrl: string, params?: Record<string, string | number | boolean | undefined>) => {
      return buildUrlWithWorkspace(baseUrl, params, workspaceId);
    },
    [workspaceId]
  );
  
  return {
    /** The current workspace ID */
    workspaceId,
    /** Whether the workspace store has hydrated and a workspace is selected */
    isReady,
    /** Workspace-aware fetch */
    fetch,
    /** Workspace-aware POST */
    post,
    /** Workspace-aware PATCH */
    patch,
    /** Workspace-aware DELETE */
    del,
    /** Build URL with workspace query param */
    buildUrl,
  };
}

/**
 * Hook that returns just the workspace context for components that only need to check readiness
 */
export function useWorkspaceContext() {
  const selectedWorkspace = useSelectedWorkspace();
  const hasHydrated = useHasHydrated();
  
  return {
    workspaceId: selectedWorkspace?.id,
    workspaceName: selectedWorkspace?.name,
    workspaceSlug: selectedWorkspace?.slug,
    isReady: hasHydrated && !!selectedWorkspace?.id,
    hasHydrated,
  };
}

