import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'creator' | 'analyst';

export interface WorkspaceMember {
    id: string; // The workspace_member id
    user_id: string; // The user's id
    role: WorkspaceRole;
    joined_at: string;
    profile: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface MembersResponse {
    success: boolean;
    data: {
        members: WorkspaceMember[];
    };
}

interface InviteMemberPayload {
    email: string;
    role: WorkspaceRole;
    workspaceId: string;
    message?: string;
}

export function useWorkspaceMembers(workspaceId: string) {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const queryKey = ['workspace-members', workspaceId];

    // Realtime subscription
    useEffect(() => {
        if (!workspaceId) return;

        const channel = supabase
            .channel(`workspace-members-realtime:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workspace_members',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    // Use literal key or reconstruct it to avoid dependency on unstable object
                    queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, queryClient, supabase]);

    // Fetch members
    const {
        data: members,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch members');
            }
            const result = await response.json();
            return result.data.members as WorkspaceMember[];
        },
        enabled: !!workspaceId,
        staleTime: Infinity, // Rely on realtime
    });

    // Remove member
    const { mutate: removeMember, isPending: isRemoving } = useMutation({
        mutationFn: async (memberId: string) => {
            const response = await fetch(`/api/team/members/${memberId}?workspaceId=${workspaceId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to remove member');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Member removed successfully');
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Update member role
    const { mutate: updateRole, isPending: isUpdating } = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => {
            const response = await fetch(`/api/team/members/${memberId}?workspaceId=${workspaceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to update role');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Role updated successfully');
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Invite member
    const { mutate: inviteMember, isPending: isInviting } = useMutation({
        mutationFn: async (payload: Omit<InviteMemberPayload, 'workspaceId'>) => {
            const response = await fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, workspaceId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to send invitation');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Invitation sent successfully');
            // Ideally we might refetch invitations list here if we had one
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        members,
        isLoading,
        error,
        refetch,
        removeMember,
        isRemoving,
        updateRole,
        isUpdating,
        inviteMember,
        isInviting,
    };
}
