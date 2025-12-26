/**
 * Notification System
 * Helper functions for creating and sending notifications
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationPreferences, NotificationChannelPreferences } from '@/types';

export type NotificationType =
  | 'post_published'
  | 'post_failed'
  | 'account_connected'
  | 'account_disconnected'
  | 'team_invitation'
  | 'team_member_joined'
  | 'comment_received'
  | 'comment_reply'
  | 'mention'
  | 'milestone_reached'
  | 'strategy_recommendation'
  | 'system_alert'
  | 'post_approval_requested'
  | 'post_approved'
  | 'post_rejected';

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

// Map notification types to preference categories
const TYPE_TO_CATEGORY: Record<NotificationType, keyof NotificationPreferences> = {
  'post_published': 'publishing',
  'post_failed': 'publishing',
  'account_connected': 'marketing', // System updates/marketing
  'account_disconnected': 'marketing',
  'team_invitation': 'approvals', // Treated as important admin action
  'team_member_joined': 'marketing',
  'comment_received': 'comments',
  'comment_reply': 'comments',
  'mention': 'comments',
  'milestone_reached': 'analytics',
  'strategy_recommendation': 'analytics',
  'system_alert': 'marketing',
  'post_approval_requested': 'approvals',
  'post_approved': 'approvals',
  'post_rejected': 'approvals'
};

const defaultPreferences: NotificationPreferences = {
  approvals: { email: true, push: true, in_app: true },
  comments: { email: true, push: true, in_app: true },
  publishing: { email: true, push: false, in_app: true },
  analytics: { email: true, push: false, in_app: false },
  marketing: { email: true, push: false, in_app: false },
  digest_frequency: 'weekly'
};

/**
 * Check if a user should be notified based on their preferences
 */
async function shouldNotify(
  userId: string,
  type: NotificationType,
  channel: keyof NotificationChannelPreferences = 'in_app'
): Promise<boolean> {
  try {
    const category = TYPE_TO_CATEGORY[type];
    if (!category) return true; // Default to allow if no category mapping

    // Use admin client to bypass RLS and read other user's profile
    const supabase = createAdminClient();

    // We only need the specific preference category, but fetching the whole object is safer JSON parsing
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (!profile?.notification_preferences) {
      // If no preferences set, use defaults
      const defaultCategory = defaultPreferences[category];
      if (typeof defaultCategory === 'string') return true; // Should not happen based on TYPE_TO_CATEGORY
      return defaultCategory[channel];
    }

    const preferences = profile.notification_preferences as unknown as NotificationPreferences;
    const categoryPrefs = preferences[category];

    if (!categoryPrefs) {
      const defaultCategory = defaultPreferences[category];
      if (typeof defaultCategory === 'string') return true;
      return defaultCategory[channel];
    }

    if (typeof categoryPrefs === 'string') return true; // Should not happen
    return categoryPrefs[channel];
  } catch (error) {
    console.error('[Notifications] Error checking preferences:', error);
    // Fail safe: allow notification if check fails
    return true;
  }
}

/**
 * Create a notification
 */
// channel argument allows us to check for specific channels (email, push) later
// for now we only check for in-app notifications creation
export async function createNotification(payload: NotificationPayload): Promise<Notification | null> {
  try {
    // Check if user wants to receive this notification
    const shouldSend = await shouldNotify(payload.userId, payload.type, 'in_app');

    if (!shouldSend) {
      console.log(`[Notifications] Skipped ${payload.type} notification for ${payload.userId} based on preferences`);
      return null;
    }

    const supabase = createAdminClient();

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

