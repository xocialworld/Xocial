import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface WorkspaceMember {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profile: {
        email: string;
        name: string;
        avatar_url: string | null;
    };
}

export function useWorkspaceMembers(workspaceId: string) {
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchMembers = useCallback(async () => {
        if (!workspaceId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("workspace_members")
                .select(`
          id,
          user_id,
          role,
          joined_at,
          profile:profiles (
            email,
            name,
            avatar_url
          )
        `)
                .eq("workspace_id", workspaceId);

            if (error) throw error;

            setMembers(data as unknown as WorkspaceMember[]);
        } catch (error) {
            console.error("Error fetching members:", error);
            toast.error("Failed to load team members");
        } finally {
            setLoading(false);
        }
    }, [workspaceId, supabase]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const inviteMember = async (email: string, role: string = "viewer") => {
        try {
            // 1. Check if user exists
            const { data: users, error: userError } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", email)
                .single();

            if (userError || !users) {
                // In a real app, we would create an invite record here
                toast.error("User not found. Invite by email not fully implemented yet.");
                return;
            }

            // 2. Add to workspace
            const { error: insertError } = await supabase
                .from("workspace_members")
                .insert({
                    workspace_id: workspaceId,
                    user_id: users.id,
                    role: role,
                });

            if (insertError) {
                if (insertError.code === "23505") {
                    toast.error("User is already a member");
                } else {
                    throw insertError;
                }
                return;
            }

            toast.success("Member added successfully");
            fetchMembers();
        } catch (error) {
            console.error("Error inviting member:", error);
            toast.error("Failed to invite member");
        }
    };

    const removeMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from("workspace_members")
                .delete()
                .eq("workspace_id", workspaceId)
                .eq("user_id", userId);

            if (error) throw error;

            toast.success("Member removed");
            fetchMembers();
        } catch (error) {
            console.error("Error removing member:", error);
            toast.error("Failed to remove member");
        }
    };

    return {
        members,
        loading,
        inviteMember,
        removeMember,
        refresh: fetchMembers,
    };
}
