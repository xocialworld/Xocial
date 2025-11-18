/**
 * Notification System
 * Helper functions for creating and sending notifications
 */

import { createClient } from '@/lib/supabase/server';

export type NotificationType =
  | 'post_published'
  | 'post_failed'
  | 'account_connected'
  | 'account_disconnected'
  | 'team_invitation'
  | 'team_member_joined'
  | 'comment_received'
  | 'milestone_reached'
  | 'strategy_recommendation'
  | 'system_alert';

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface NotificationPayload {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Create a notification
 */
export async function createNotification(payload: NotificationPayload): Promise<Notification | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        workspace_id: payload.workspaceId,
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Failed to create notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error);
    return null;
  }
}

/**
 * Send notification to multiple users
 */
export async function notifyUsers(
  userIds: string[],
  workspaceId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const promises = userIds.map((userId) =>
    createNotification({
      workspaceId,
      userId,
      type,
      title,
      message,
      data,
    })
  );

  await Promise.allSettled(promises);
}

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  postPublished: (postId: string, platforms: string[]) => ({
    type: 'post_published' as NotificationType,
    title: 'Post Published',
    message: `Your post has been successfully published to ${platforms.join(', ')}`,
    data: { postId, platforms },
  }),

  postFailed: (postId: string, error: string) => ({
    type: 'post_failed' as NotificationType,
    title: 'Post Failed',
    message: `Failed to publish post: ${error}`,
    data: { postId, error },
  }),

  accountConnected: (platform: string, accountName: string) => ({
    type: 'account_connected' as NotificationType,
    title: 'Account Connected',
    message: `Successfully connected ${platform} account: ${accountName}`,
    data: { platform, accountName },
  }),

  accountDisconnected: (platform: string) => ({
    type: 'account_disconnected' as NotificationType,
    title: 'Account Disconnected',
    message: `${platform} account has been disconnected`,
    data: { platform },
  }),

  teamInvitation: (workspaceName: string, inviterName: string) => ({
    type: 'team_invitation' as NotificationType,
    title: 'Team Invitation',
    message: `${inviterName} invited you to join ${workspaceName}`,
    data: { workspaceName, inviterName },
  }),

  milestoneReached: (milestone: string, value: number) => ({
    type: 'milestone_reached' as NotificationType,
    title: 'Milestone Reached!',
    message: `Congratulations! You've reached ${value} ${milestone}`,
    data: { milestone, value },
  }),

  strategyRecommendation: (title: string, priority: string) => ({
    type: 'strategy_recommendation' as NotificationType,
    title: 'New Strategy Recommendation',
    message: `${priority} priority: ${title}`,
    data: { recommendationTitle: title, priority },
  }),
};

/**
 * Send notification using template
 */
export async function sendNotification(
  userId: string,
  workspaceId: string,
  template: ReturnType<typeof NotificationTemplates[keyof typeof NotificationTemplates]>
): Promise<void> {
  await createNotification({
    userId,
    workspaceId,
    ...template,
  });
}

const NotificationsService = {
  createNotification,
  notifyUsers,
  NotificationTemplates,
  sendNotification,
};

export default NotificationsService;

