'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useSelectedWorkspace,
  WorkspaceSummary,
} from '@/store/workspaceStore';
import { createClient } from '@/lib/supabase/client';

type ApiResponse = {
  success: boolean;
  data: {
    workspaces: {
      workspace: {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
      };
      role: string;
    }[];
  };
};

export function WorkspaceSwitcher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const _hasHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const touchLastFetched = useWorkspaceStore((state) => state.touchLastFetched);
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace);
  const selected = useSelectedWorkspace();
  const supabase = useMemo(() => createClient(), []);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces?include_members=false&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as ApiResponse;
      const ws = payload?.data?.workspaces ?? [];
      if (!Array.isArray(ws) || ws.length === 0) {
        setError('No workspaces available');
        setWorkspaces([]); // Clear if none
        return;
      }
      const entries: WorkspaceSummary[] = ws.map((entry) => ({
        id: entry.workspace.id,
        name: entry.workspace.name,
        slug: entry.workspace.slug,
        role: entry.role,
        logo_url: entry.workspace.logo_url as string | null,
      }));
      setWorkspaces(entries);

      // Validate that the currently selected workspace still exists
      const currentSelectedId = useWorkspaceStore.getState().selectedWorkspace?.id;
      const isValid = entries.some(w => w.id === currentSelectedId);

      if (!isValid && entries.length > 0) {
        // Auto-select the first available workspace if current one is invalid/missing
        selectWorkspace(entries[0].id);
      } else if (entries.length === 0) {
        // If no workspaces left (should trigger existing 'No workspaces' UI), ensure store is clear
        // selectWorkspace handles undefined/null reset implicitly via logic or we can rely on setWorkspaces doing it?
        // setWorkspaces already handles clearing if entries is empty.
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load workspaces');
      touchLastFetched(); // Prevent immediate retry loops on error
    } finally {
      setLoading(false);
    }
  }, [selectWorkspace, setWorkspaces, touchLastFetched]);

  // Wait for hydration before fetching
  useEffect(() => {
    // Only fetch if hydrated.
    // We removed the stale check to force consistency with the DB on mount
    if (!_hasHydrated) return;

    fetchWorkspaces();
  }, [_hasHydrated, fetchWorkspaces]); // Run once when hydrated

  // Also validate selection after fetch in fetchWorkspaces function above (need to modify that too)

  // Realtime subscription for workspace membership changes
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`user-workspaces:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workspace_members',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchWorkspaces();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setupSubscription();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [fetchWorkspaces, supabase]);


  const buttonLabel = useMemo(() => {
    if (loading && !selected) {
      return 'Loading...';
    }
    if (selected) {
      return selected.name;
    }
    if (error) {
      return 'Retry';
    }
    return 'Select workspace';
  }, [error, loading, selected]);

  const handleToggle = () => {
    if (loading && workspaces.length === 0) return; // Allow opening if we have workspaces even if loading (refreshing)
    setOpen((prev) => !prev);
  };

  const handleSelect = (workspaceId: string) => {
    selectWorkspace(workspaceId);
    setOpen(false);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchWorkspaces();
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={error ? handleRetry : handleToggle}
        disabled={loading && workspaces.length === 0}
        className={cn(
          "w-56 justify-between",
          error && "border-error-300 text-error-600 hover:bg-error-50"
        )}
      >
        <div className="flex items-center gap-2 truncate text-left">
          {selected && (
            <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
              {selected.logo_url ? (
                <Image src={selected.logo_url} alt={selected.name} fill className="rounded-full object-cover" />
              ) : (
                selected.name.substring(0, 2).toUpperCase()
              )}
            </div>
          )}
          {loading && !selected && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{buttonLabel}</span>
            {selected && (
              <span className="text-[10px] text-secondary-400 font-mono leading-none">
                {selected.id.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-secondary-500" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 max-h-64 w-72 overflow-y-auto rounded-md border border-secondary-200 bg-white shadow-lg">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-secondary-50',
                selected?.id === workspace.id && 'bg-primary-50 text-primary-900'
              )}
              onClick={() => handleSelect(workspace.id)}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-secondary-100 text-[10px] font-bold text-secondary-700">
                  {workspace.logo_url ? (
                    <Image src={workspace.logo_url} alt={workspace.name} fill className="rounded-full object-cover" />
                  ) : (
                    workspace.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{workspace.name}</p>
                    <span className="text-[10px] text-secondary-400 font-mono" title="Workspace ID">
                      {workspace.id.slice(0, 8)}...
                    </span>
                  </div>
                  <p className="text-xs text-secondary-500">
                    {workspace.role === 'owner' ? 'Owner' : workspace.role}
                  </p>
                </div>
              </div>
              {selected?.id === workspace.id && (
                <Check className="h-4 w-4 text-primary-600" />
              )}
            </button>
          ))}

          {workspaces.length === 0 && (
            <div className="px-4 py-3 text-sm text-secondary-500">
              {error || 'No workspaces found'}
            </div>
          )}
          <div className="border-t border-secondary-100 p-2">
            <a
              href="/settings/workspace/create"
              className="flex w-full items-center justify-center rounded-md bg-secondary-50 px-4 py-2 text-sm font-medium text-secondary-900 hover:bg-secondary-100"
            >
              Create New Workspace
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
