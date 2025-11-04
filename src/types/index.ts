// Database Types
export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  notification_preferences?: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  in_app: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'client';
  joined_at: string;
}

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';

export interface SocialAccount {
  id: string;
  workspace_id: string;
  platform: Platform;
  account_id: string;
  account_name: string;
  account_handle?: string;
  account_avatar?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  connected_at: string;
  is_active: boolean;
  follower_count?: number;
  post_count?: number;
  engagement_rate?: number;
  last_synced_at?: string;
}

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'failed';

export interface Post {
  id: string;
  workspace_id: string;
  content: PostContent;
  platforms: Platform[];
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  created_by?: string;
  campaign_id?: string;
  media?: Media[];
  tags?: string[];
  external_post_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PostContent {
  [platform: string]: {
    text: string;
    hashtags?: string[];
    mentions?: string[];
  };
}

export interface Media {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
  filename: string;
  size: number;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PostAnalytics {
  id: string;
  post_id: string;
  platform: Platform;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  fetched_at: string;
}

export interface AnalyticsMetric {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DashboardMetrics {
  impressions: AnalyticsMetric;
  engagement: AnalyticsMetric;
  followers: AnalyticsMetric;
  engagementRate: AnalyticsMetric;
}

