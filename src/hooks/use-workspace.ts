"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/types";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error: createError } = await supabase
        .from("workspaces")
        .insert({
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          owner_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      setWorkspace(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  return {
    workspace,
    loading,
    error,
    fetchWorkspace,
    createWorkspace,
  };
}

