'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useSelectedWorkspace,
  WorkspaceSummary,
} from '@/store/workspaceStore';

type ApiResponse = {
  workspaces: {
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    role: string;
  }[];
};

export function WorkspaceSwitcher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace);
  const selected = useSelectedWorkspace();

  useEffect(() => {
    if (workspaces.length > 0 || loading) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch('/api/workspaces?include_members=false')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as ApiResponse;
        if (cancelled) return;
        const entries: WorkspaceSummary[] = (payload.workspaces || []).map((entry) => ({
          id: entry.workspace.id,
          name: entry.workspace.name,
          slug: entry.workspace.slug,
          role: entry.role,
        }));
        setWorkspaces(entries);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, setWorkspaces, workspaces.length]);

  const buttonLabel = useMemo(() => {
    if (loading && !selected) {
      return 'Loading workspaces...';
    }
    if (selected) {
      return selected.name;
    }
    if (error) {
      return 'Retry loading workspaces';
    }
    return 'Select workspace';
  }, [error, loading, selected]);

  const handleToggle = () => {
    if (loading || workspaces.length === 0) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (workspaceId: string) => {
    selectWorkspace(workspaceId);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={loading || workspaces.length === 0}
        className="w-56 justify-between"
      >
        <div className="flex items-center gap-2 truncate text-left">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span className="truncate text-sm">{buttonLabel}</span>
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
              <div>
                <p className="font-medium">{workspace.name}</p>
                <p className="text-xs text-secondary-500">
                  {workspace.role === 'owner' ? 'Owner' : workspace.role}
                </p>
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
        </div>
      )}
    </div>
  );
}

