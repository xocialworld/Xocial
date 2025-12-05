/**
 * Notification Center Component
 * Displays user notifications with real-time updates and integrated Inbox features
 */

'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Bell, Check, Trash2, MessageSquare, AtSign, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/notifications';
import { CommentItem, type Comment } from './notifications/comment-item';

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
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  // Mock comments for the "Comments" tab until backend integration
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // Simulate fetching comments
    // In real app, this would be a separate query or part of notifications
    const mockComments: Comment[] = [
      {
        id: '1',
        author_name: 'Sarah Wilson',
        content: 'Great post! Looking forward to more.',
        platform: 'instagram',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        author_name: 'Tech Daily',
        content: 'Can we collaborate on this?',
        platform: 'twitter',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      }
    ];
    setComments(mockComments);
  }, []);

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

  const handleReply = async (text: string) => {
    toast.success("Reply sent!");
  };

  const renderNotificationList = (filterFn: (n: Notification) => boolean) => {
    const filtered = notifications.filter(filterFn);

    if (isLoading) {
      return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    if (filtered.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No notifications</p>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {filtered.map((notification: Notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-primary-50/30' : ''
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
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
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5 text-secondary-600" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-error-500 ring-2 ring-white" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-auto py-1"
            >
              Mark all read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <div className="px-4 pt-2">
            <TabsList className="w-full justify-start h-9 bg-transparent p-0 border-b rounded-none">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-600 rounded-none px-4 pb-2"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-600 rounded-none px-4 pb-2"
              >
                Unread
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-600 rounded-none px-4 pb-2"
              >
                Comments
              </TabsTrigger>
              <TabsTrigger
                value="mentions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-600 rounded-none px-4 pb-2"
              >
                Mentions
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="m-0">
              {renderNotificationList(() => true)}
            </TabsContent>

            <TabsContent value="unread" className="m-0">
              {renderNotificationList((n) => !n.read)}
            </TabsContent>

            <TabsContent value="comments" className="m-0">
              {comments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No new comments</p>
                </div>
              ) : (
                <div className="divide-y">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mentions" className="m-0">
              <div className="p-8 text-center text-muted-foreground">
                <AtSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No mentions yet</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
