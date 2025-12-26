"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSelectedWorkspace } from "@/store/workspaceStore";

interface WorkspaceGuardProps {
    userId: string;
}

export function WorkspaceGuard({ userId }: WorkspaceGuardProps) {
    const router = useRouter();
    const supabase = createClient();
    const workspace = useSelectedWorkspace();

    useEffect(() => {
        if (!userId || !workspace?.id) return;
        const workspaceId = workspace.id;

        // Subscribe to deletion events on workspace_members for this user
        const channel = supabase
            .channel(`workspace_guard:${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "workspace_members",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    // Check if the deleted member is the current user
                    // payload.old contains the record before deletion
                    if (payload.old && payload.old.user_id === userId) {
                        toast.error("You have been removed from this workspace.");
                        // Redirect to a safe page (e.g., workspace selection or home)
                        // Using window.location to force full reload and clear any state
                        window.location.href = "/x";
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, workspace, router, supabase]);

    return null;
}
