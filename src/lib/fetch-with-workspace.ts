/**
 * Workspace-aware fetch wrapper for client-side API calls
 * 
 * This utility ensures all API requests include the currently selected workspace ID,
 * preventing the "draft disappears" bug where posts are created in the default workspace
 * instead of the user's selected workspace.
 * 
 * Usage:
 * - Import `fetchWithWorkspace` for raw fetch calls
 * - Use `useFetchWithWorkspace` hook in React components
 */

import { useWorkspaceStore } from '@/store/workspaceStore';

export type FetchWithWorkspaceOptions = RequestInit & {
  /** Override workspace ID (bypasses store) */
  workspaceId?: string;
  /** Skip workspace header (for auth/public endpoints) */
  skipWorkspace?: boolean;
};

/**
 * Get the currently selected workspace ID from the store
 * Safe to call outside React components
 */
export function getSelectedWorkspaceId(): string | undefined {
  return useWorkspaceStore.getState().selectedWorkspace?.id;
}

/**
 * Add workspace headers to an existing Headers object or create new headers
 */
export function addWorkspaceHeaders(
  existingHeaders?: HeadersInit,
  workspaceId?: string
): Headers {
  const headers = new Headers(existingHeaders);
  
  const wsId = workspaceId || getSelectedWorkspaceId();
  if (wsId) {
    headers.set('x-workspace-id', wsId);
  }
  
  return headers;
}

/**
 * Fetch wrapper that automatically includes workspace context
 * 
 * @example
 * ```ts
 * // Basic usage
 * const response = await fetchWithWorkspace('/api/posts', {
 *   method: 'POST',
 *   body: JSON.stringify({ content: '...' }),
 * });
 * 
 * // With explicit workspace override
 * const response = await fetchWithWorkspace('/api/posts', {
 *   workspaceId: 'specific-workspace-id',
 * });
 * 
 * // Skip workspace header (for auth endpoints)
 * const response = await fetchWithWorkspace('/api/auth/session', {
 *   skipWorkspace: true,
 * });
 * ```
 */
export async function fetchWithWorkspace(
  input: RequestInfo | URL,
  options?: FetchWithWorkspaceOptions
): Promise<Response> {
  const { workspaceId, skipWorkspace, ...fetchOptions } = options || {};
  
  if (skipWorkspace) {
    return fetch(input, fetchOptions);
  }
  
  const headers = addWorkspaceHeaders(fetchOptions.headers, workspaceId);
  
  // Ensure Content-Type is set for JSON requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(input, {
    ...fetchOptions,
    headers,
  });
}

/**
 * JSON-specific fetch with workspace that handles JSON parsing
 */
export async function fetchJsonWithWorkspace<T = any>(
  input: RequestInfo | URL,
  options?: FetchWithWorkspaceOptions
): Promise<{ data: T; response: Response }> {
  const response = await fetchWithWorkspace(input, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(options?.headers).entries()),
    },
  });
  
  const data = await response.json();
  return { data, response };
}

/**
 * POST request with workspace context
 */
export async function postWithWorkspace<T = any>(
  url: string,
  body: unknown,
  options?: Omit<FetchWithWorkspaceOptions, 'method' | 'body'>
): Promise<{ data: T; response: Response; ok: boolean }> {
  const response = await fetchWithWorkspace(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
  
  const data = await response.json().catch(() => ({}));
  return { data, response, ok: response.ok };
}

/**
 * PATCH request with workspace context
 */
export async function patchWithWorkspace<T = any>(
  url: string,
  body: unknown,
  options?: Omit<FetchWithWorkspaceOptions, 'method' | 'body'>
): Promise<{ data: T; response: Response; ok: boolean }> {
  const response = await fetchWithWorkspace(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  });
  
  const data = await response.json().catch(() => ({}));
  return { data, response, ok: response.ok };
}

/**
 * DELETE request with workspace context
 */
export async function deleteWithWorkspace(
  url: string,
  options?: Omit<FetchWithWorkspaceOptions, 'method'>
): Promise<{ response: Response; ok: boolean }> {
  const response = await fetchWithWorkspace(url, {
    method: 'DELETE',
    ...options,
  });
  
  return { response, ok: response.ok };
}

/**
 * Build URL with workspace query parameter
 * Useful for GET requests where you want workspace in the URL
 */
export function buildUrlWithWorkspace(
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined>,
  workspaceId?: string
): string {
  const url = new URL(baseUrl, window.location.origin);
  
  const wsId = workspaceId || getSelectedWorkspaceId();
  if (wsId) {
    url.searchParams.set('workspaceId', wsId);
  }
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  
  return url.toString();
}

