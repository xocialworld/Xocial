"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Workspace, WorkspaceMember } from "@/types";
import { slugify } from "@/lib/utils";
import { useSelectedWorkspace, useWorkspaceStore, useHasHydrated } from "@/store/workspaceStore";

type WorkspaceWithRole = Workspace & { role?: WorkspaceMember["role"] };

export function useWorkspace() {
  const [workspaceDetails, setWorkspaceDetails] = useState<WorkspaceWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Use global state for selection
  const selectedWorkspace = useSelectedWorkspace();
  const hasHydrated = useHasHydrated();
  const invalidateWorkspaces = useWorkspaceStore((state) => state.invalidateWorkspaces);

  const linkMembership = useCallback(
    async (workspaceId: string, userId: string, role: WorkspaceMember["role"] = "owner") => {
      const { error: membershipError } = await supabase
        .from("workspace_members")
        .upsert(
          { workspace_id: workspaceId, user_id: userId, role },
          { onConflict: "workspace_id,user_id" }
        );

      if (membershipError) {
        throw membershipError;
      }
    },
    [supabase]
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Not authenticated");
        }

        const slugBase = slugify(name) || "workspace";
        const slug = `${slugBase}-${user.id.replace(/-/g, "").slice(0, 6)}-${Date.now()
          .toString(36)
          .slice(-4)}`;

        const { data, error: createError } = await supabase
          .from("workspaces")
          .insert({
            name,
            slug,
            owner_id: user.id,
          })
          .select()
          .single();

        if (createError || !data) {
          throw createError || new Error("Unable to create workspace");
        }

        await linkMembership(data.id, user.id, "owner");

        // Update local state
        setWorkspaceDetails({ ...data, role: "owner" });
        setError(null);

        // Trigger global refresh so switcher sees it
        invalidateWorkspaces();

        return data;
      } catch (err: any) {
        setError(err.message || "Unable to create workspace");
        throw err;
      }
    },
    [linkMembership, supabase, invalidateWorkspaces]
  );

  // Fetch full details for the globally selected workspace
  const fetchWorkspaceDetails = useCallback(async () => {
    if (!hasHydrated) return;

    // If no workspace is selected globally, we can't fetch details.
    // However, if the user has no workspaces, selectedWorkspace will be undefined.
    if (!selectedWorkspace) {
      setWorkspaceDetails(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // We already have the ID and Role from the store, but we might need full settings/details
      const { data: fullWorkspace, error: fetchError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", selectedWorkspace.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setWorkspaceDetails({
        ...fullWorkspace,
        role: selectedWorkspace.role as WorkspaceMember["role"] // Trust the role from the store/switcher logic or fetch it again if paranoid
      });
      setError(null);
    } catch (err: any) {
      console.error("Error fetching workspace details:", err);
      setError(err.message);
      // If we fail to find it, maybe it was deleted? 
      // We might want to clear the selection in the store, but let's be passive for now.
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace, supabase, hasHydrated]);

  useEffect(() => {
    fetchWorkspaceDetails();
  }, [fetchWorkspaceDetails]);

  // Compatibility: if we are loading hydration, return true
  const effectiveLoading = !hasHydrated || loading;

  return {
    workspace: workspaceDetails,
    loading: effectiveLoading,
    error,
    fetchWorkspace: fetchWorkspaceDetails,
    createWorkspace,
  };
}

