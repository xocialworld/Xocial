/**
 * Notification Center Component
 * Displays user notifications with real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/notifications';

/**
 * Fetch notifications
 */
async function fetchNotifications() {
  const response = await fetch('/api/notifications?limit=50');
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

/**
 * Mark notifications as read
 */
async function markAsRead(notificationIds?: string[], markAll = false) {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationIds,
      markAllAsRead: markAll,
    }),
  });
  
  if (!response.ok) throw new Error('Failed to mark as read');
  return response.json();
}

/**
 * Delete notifications
 */
async function deleteNotifications(notificationIds?: string[], deleteAll = false) {
  const response = await fetch('/api/notifications', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationIds,
      deleteAll,
    }),
  });
  
  if (!response.ok) throw new Error('Failed to delete notifications');
  return response.json();
}

/**
 * Notification Center Component
 */
export function NotificationCenter() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, supabase]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({ ids, all }: { ids?: string[]; all?: boolean }) =>
      markAsRead(ids, all),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ ids, all }: { ids?: string[]; all?: boolean }) =>
      deleteNotifications(ids, all),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification(s) deleted');
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ ids: [id] });
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate({ all: true });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ ids: [id] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="error"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-primary-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                          className="h-7 w-7 p-0"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 p-0"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;

