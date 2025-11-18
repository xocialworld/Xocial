"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore, type WorkspaceSummary } from "@/store/workspaceStore";
import type { AuthUser, UserProfile } from "@/types/auth";

type SessionContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  selectedWorkspace?: WorkspaceSummary;
  setActiveWorkspace: (workspaceId: string) => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedWorkspace = useWorkspaceStore((s) => s.selectedWorkspace);
  const setActiveWorkspace = useAuthStore((s) => s.setActiveWorkspace);

  const value = useMemo(
    () => ({ user, profile, isAuthenticated, selectedWorkspace, setActiveWorkspace }),
    [user, profile, isAuthenticated, selectedWorkspace, setActiveWorkspace]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}