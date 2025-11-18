"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Workspace, WorkspaceMember } from "@/types";
import { slugify } from "@/lib/utils";

type WorkspaceWithRole = Workspace & { role?: WorkspaceMember["role"] };

interface WorkspaceMembershipRow {
  role: WorkspaceMember["role"];
  workspace: Workspace | null;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

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
        setWorkspace({ ...data, role: "owner" });
        setError(null);
        return data;
      } catch (err: any) {
        setError(err.message || "Unable to create workspace");
        throw err;
      }
    },
    [linkMembership, supabase]
  );

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("workspace_members")
        .select("role, workspace:workspace_id (*)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });

      if (membershipError) {
        throw membershipError;
      }

      const membershipList: WorkspaceMembershipRow[] = (memberships ?? []).map(
        (member: any) => ({
          role: member.role as WorkspaceMember["role"],
          workspace: member.workspace as Workspace | null,
        })
      );
      const primaryMembership = membershipList.find((member) => member.workspace);
      if (primaryMembership?.workspace) {
        setWorkspace({ ...primaryMembership.workspace, role: primaryMembership.role });
        setError(null);
        return;
      }

      const { data: ownedWorkspace, error: ownedError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ownedError && ownedError.code !== "PGRST116") {
        throw ownedError;
      }

      if (ownedWorkspace) {
        await linkMembership(ownedWorkspace.id, user.id, "owner");
        setWorkspace({ ...ownedWorkspace, role: "owner" });
        setError(null);
        return;
      }

      const fallbackName = user.email?.split("@")[0] || "Workspace";
      await createWorkspace(`${fallbackName}'s Workspace`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [createWorkspace, linkMembership, supabase]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return {
    workspace,
    loading,
    error,
    fetchWorkspace,
    createWorkspace,
  };
}

