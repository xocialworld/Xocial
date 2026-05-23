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

export interface NotificationChannelPreferences {
  email: boolean;
  push: boolean;
  in_app: boolean;
}

export interface NotificationPreferences {
  approvals: NotificationChannelPreferences;
  comments: NotificationChannelPreferences;
  publishing: NotificationChannelPreferences;
  analytics: NotificationChannelPreferences;
  marketing: NotificationChannelPreferences;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
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
  role: 'owner' | 'admin' | 'manager' | 'creator' | 'analyst';
  joined_at: string;
}

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';

export interface SocialAccountMetrics {
  postsPublished: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  avgEngagementRate: number;
  lastPublishedAt: string | null;
  lastSyncedAt: string | null;
  totalVideoViews: number;
}

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
  metadata?: Record<string, any> | null;
  metrics?: SocialAccountMetrics;
}

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'failed' | 'partial' | 'rejected';

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
  error_message?: string | null;
  social_account_id?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    views?: number;
    engagement_rate?: number;
  };
}

export interface PostContentEntry {
  text: string;
  hashtags?: string[];
  mentions?: string[];
  mediaUrls?: string[];
  link?: string;
}

export type PostContent = Record<string, PostContentEntry>;

export type PlatformAccountMap = Partial<Record<Platform, string>>;

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

// ═══════════════════════════════════════════════════════════════
// Approval Workflow Types
// ═══════════════════════════════════════════════════════════════

export interface ApprovalWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: 'single_step' | 'sequential' | 'parallel';
  is_default: boolean;
  created_at: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  required_role?: string;
  required_users?: string[];
  approval_rule: 'any' | 'all';
  created_at: string;
}

export interface ContentApprovalInstance {
  id: string;
  content_item_id: string;
  workflow_id: string;
  current_step_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ContentApprovalAction {
  id: string;
  approval_instance_id: string;
  step_id?: string;
  actor_id: string;
  action: 'approve' | 'reject' | 'comment';
  comment?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// AI Content Types
// ═══════════════════════════════════════════════════════════════

export type AISentiment = 'positive' | 'neutral' | 'negative';
export type AIReadability = 'easy' | 'moderate' | 'difficult';
export type AITone =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'enthusiastic'
  | 'informative'
  | 'playful'
  | 'inspirational'
  | 'educational';

export type AIStyle =
  | 'informative'
  | 'storytelling'
  | 'educational'
  | 'promotional'
  | 'playful';

export type AILength = 'short' | 'medium' | 'long';

export interface AIOptions {
  tone: AITone;
  style: AIStyle;
  audience?: string;
  length: AILength;
  addEmojis: boolean;
  addHashtags: boolean;
  addCTA: boolean;
  maxLength?: number;
  platforms: Platform[];
  model: string;
}

export interface PlatformPreview {
  platform: Platform;
  text: string;
  hashtags?: string[];
  mentions?: string[];
  callToAction?: string;
  summary?: string;
  recommendedPostTime?: string;
  keyPoints?: string[];
  tone?: string;
  style?: string;
  estimatedCharCount: number;
}

export interface AIAnalyticsSnapshot {
  totalCharCount: number;
  averageCharCount: number;
  perPlatform: Partial<
    Record<
      Platform,
      {
        charCount: number;
        hashtagCount: number;
        emojiCount: number;
      }
    >
  >;
}

export interface AISummary {
  tone?: string;
  style?: string;
  highlights?: string[];
}

export interface AIGenerationResult {
  platformContent: Partial<Record<Platform, PlatformPreview>>;
  hashtags: string[];
  summary: AISummary;
  analytics: AIAnalyticsSnapshot;
  generationId?: string;
  model?: string;
}

export interface ContentAnalysis {
  sentiment: AISentiment;
  readability: AIReadability;
  suggestions: string[];
  score?: number;
}

export interface AIGenerationHistoryEntry {
  id: string;
  prompt: string;
  platform: string;
  generated_content?: {
    platform_content?: Partial<Record<Platform, PlatformPreview>>;
    hashtags?: string[];
    summary?: AISummary;
    analytics?: AIAnalyticsSnapshot;
  };
  parameters?: Record<string, unknown> | null;
  created_at: string;
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


export interface StrategyRecommendation {
  id: string;
  workspace_id: string;
  type: 'content' | 'timing' | 'engagement' | 'growth' | 'hashtag' | 'topic';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  metrics?: Record<string, any>;
  action_items?: string[];
  status: 'pending' | 'active' | 'completed' | 'dismissed';
  valid_from: string;
  valid_until?: string;
  implemented_at?: string;
  implemented_by?: string;
  results?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

// ═══════════════════════════════════════════════════════════════
// Calendar Entry Types
// ═══════════════════════════════════════════════════════════════

/**
 * Source of a calendar entry
 * - internal: Created in the app (content_items/content_variants)
 * - external: Imported from a platform (external_posts)
 */
export type CalendarEntrySource = 'internal' | 'external' | 'legacy';

/**
 * Status for calendar entries
 */
export type CalendarEntryStatus =
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'partial'
  | 'failed'
  | 'rejected';

/**
 * Content variant for a specific platform (internal entries only)
 */
export interface CalendarVariant {
  id: string;
  platform: string;
  socialAccountId?: string;
  caption?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
}

/**
 * Unified calendar entry representing both internal and external content
 */
export interface CalendarEntry {
  id: string;
  source: CalendarEntrySource;
  /** Date used for calendar placement (status-aware bucketing) */
  calendarDate: string;
  // Content
  title?: string;
  brief?: string;
  caption?: string;
  content?: Record<string, unknown>;
  media?: unknown[];
  // Status
  status: CalendarEntryStatus | string;
  // Platforms
  platforms: string[];
  // Timestamps
  draftedAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  // References
  workspaceId: string;
  socialAccountId?: string;
  externalPostId?: string;
  permalink?: string;
  // For internal items
  contentItemId?: string;
  variants?: CalendarVariant[];
  // Approval
  approvalWorkflowId?: string;
  approvalStatus?: string;
  // Metrics (for external)
  metrics?: Record<string, unknown>;
  postType?: string;
}

/**
 * Response from /api/calendar
 */
export interface CalendarAPIResponse {
  entries: CalendarEntry[];
  count: number;
  meta: {
    workspaceId: string;
    from?: string;
    to?: string;
    platformFilter?: string;
  };
}
