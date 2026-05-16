'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import {
  useWorkspaceStore,
  useWorkspaceSwitchTransition,
} from '@/store/workspaceStore';

const SWITCH_TRANSITION_MS = 900;

export function WorkspaceSwitchTransition() {
  const transition = useWorkspaceSwitchTransition();
  const completeWorkspaceSwitch = useWorkspaceStore((state) => state.completeWorkspaceSwitch);

  useEffect(() => {
    if (!transition) return;

    const timeout = window.setTimeout(() => {
      completeWorkspaceSwitch(transition.startedAt);
    }, SWITCH_TRANSITION_MS);

    return () => window.clearTimeout(timeout);
  }, [completeWorkspaceSwitch, transition]);

  if (!transition) return null;

  const workspaceName = transition.target.name;
  const initials = workspaceName.slice(0, 2).toUpperCase();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4"
    >
      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex min-w-[280px] max-w-[min(420px,calc(100vw-2rem))] items-center gap-3 rounded-lg border border-secondary-200 bg-white/95 px-4 py-3 shadow-xl shadow-secondary-900/10 ring-1 ring-secondary-900/5 backdrop-blur-md">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-100 text-xs font-semibold text-primary-700">
            {transition.target.logo_url ? (
              <Image
                src={transition.target.logo_url}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-secondary-950">
              Switching to {workspaceName}
            </p>
            <p className="text-xs text-secondary-500">Updating accounts, content, and calendar</p>
          </div>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-600" />
        </div>
      </div>
    </div>
  );
}
