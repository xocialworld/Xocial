'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Notification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

interface NotificationsResponse {
    data: {
        notifications: Notification[];
        total: number;
        unreadCount: number;
    };
}

export function useNotifications() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    const {
        data,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['notifications'],
        queryFn: async (): Promise<NotificationsResponse['data']> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { notifications: [], total: 0, unreadCount: 0 };

            const response = await fetch('/api/notifications?limit=20');
            if (!response.ok) throw new Error('Failed to fetch notifications');
            const json = await response.json();
            return json.data;
        },
        staleTime: Infinity, // Rely on realtime updates
    });

    // specific realtime subscription for notifications
    useEffect(() => {
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel(`notifications:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        // Optimally, we could update the cache directly, but invalidation is safer for consistency
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });

                        if (payload.eventType === 'INSERT') {
                            const newNotification = payload.new as Notification;
                            if (!newNotification.read) {
                                toast.info('New Notification', {
                                    description: 'You have a new unread notification.'
                                });
                            }
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const cleanupPromise = setupSubscription();

        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [queryClient, supabase]);

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllAsRead: true })
            });
            if (!response.ok) throw new Error('Failed to mark all as read');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('All notifications marked as read');
        },
        onError: () => {
            toast.error('Failed to update notifications');
        }
    });

    return {
        notifications: data?.notifications || [],
        unreadCount: data?.unreadCount || 0,
        isLoading,
        error,
        refetch,
        markAllAsRead: markAllReadMutation.mutateAsync,
        isMarkingRead: markAllReadMutation.isPending
    };
}
