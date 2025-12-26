import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkspace } from './use-workspace';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export type MediaAsset = {
    id: string;
    filename: string;
    original_filename: string;
    file_type: string;
    mime_type: string;
    file_size: number;
    url: string;
    thumbnail_url: string | null;
    created_at: string;
    uploaded_by: string;
    source: 'media_assets' | 'media';
};

type MediaResponse = {
    success: boolean;
    data: {
        media: MediaAsset[];
    };
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
};

export function useMediaAssets(type?: 'image' | 'video') {
    const { workspace } = useWorkspace();
    const workspaceId = workspace?.id;
    const queryClient = useQueryClient();
    const supabase = createClient();

    // Realtime subscription
    useEffect(() => {
        if (!workspaceId) return;

        const channel = supabase
            .channel(`media-realtime:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'media_assets',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['media'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, queryClient, supabase]);

    return useQuery({
        queryKey: ['media', workspaceId, type],
        queryFn: async (): Promise<MediaAsset[]> => {
            if (!workspaceId) return [];

            const params = new URLSearchParams({
                limit: '50',
            });

            if (type) {
                params.set('type', type);
            }
            if (workspaceId) {
                params.set('workspaceId', workspaceId);
            }

            const response = await fetch(`/api/media?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch media');
            }

            const data: MediaResponse = await response.json();
            return data.data.media || [];
        },
        enabled: !!workspaceId,
        staleTime: Infinity, // Rely on realtime
    });
}

export function useUploadMedia() {
    const queryClient = useQueryClient();
    const { workspace } = useWorkspace();
    const workspaceId = workspace?.id;

    return useMutation({
        mutationFn: async (file: File) => {
            if (!workspaceId) throw new Error('No workspace selected');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', workspaceId);

            const response = await fetch('/api/media', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload media');
            }

            return response.json();
        },
        onSuccess: () => {
            // Subscription handles invalidation, but immediate invalidation is good for UX
            queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
            toast.success('Media uploaded successfully');
        },
        onError: (error) => {
            toast.error('Failed to upload media');
            console.error(error);
        },
    });
}

export function useDeleteMedia() {
    const queryClient = useQueryClient();
    const { workspace } = useWorkspace();
    const workspaceId = workspace?.id;

    return useMutation({
        mutationFn: async (id: string) => {
            if (!workspaceId) throw new Error('No workspace selected');

            const response = await fetch('/api/media', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete media');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
            toast.success('Media deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete media');
        },
    });
}
