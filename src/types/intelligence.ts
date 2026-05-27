import type { Platform } from '@/types';

export type LearningEventType =
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'post_content_edited'
  | 'post_scheduled'
  | 'post_published'
  | 'post_status_changed'
  | 'platform_variant_created'
  | 'platform_variant_edited'
  | 'approval_requested'
  | 'ai_generated'
  | 'ai_regenerated'
  | 'hashtag_generated'
  | 'strategy_generated'
  | 'recommendation_accepted'
  | 'recommendation_dismissed'
  | 'recommendation_completed'
  | 'brand_profile_updated'
  | 'metric_synced'
  | 'comment_received'
  | 'comment_replied'
  | 'approval_approved'
  | 'approval_rejected'
  | 'publish_started'
  | 'publish_succeeded'
  | 'publish_partial'
  | 'publish_failed'
  | 'publish_retry_scheduled'
  | 'prediction_generated'
  | 'calendar_ai_draft_created'
  | 'content_classified'
  | 'agent_task_queued'
  | 'agent_task_succeeded'
  | 'agent_task_failed'
  | 'agent_task_retry_scheduled'
  | 'agent_task_recovered'
  | 'agent_tasks_manual_process';

export type BrandProfile = {
  id?: string;
  workspace_id?: string;
  voice: string;
  audience: string;
  products_offers: string[];
  content_pillars: string[];
  competitors: string[];
  do_rules: string[];
  dont_rules: string[];
  approved_examples: string[];
  rejected_examples: string[];
  platform_preferences: Partial<Record<Platform, string>>;
  knowledge_settings?: Record<string, unknown>;
  confidence_score?: number;
  updated_at?: string;
};

export type LeverageInsight = {
  id: string;
  type: 'growth' | 'content' | 'timing' | 'brand' | 'risk' | 'learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  actionLabel: string;
  action: 'create_draft' | 'push_calendar' | 'review_brand' | 'run_audit' | 'view_analytics';
};

export type ContentScore = {
  overall: number;
  brandFit: number;
  platformFit: Partial<Record<Platform, number>>;
  engagementPotential: number;
  safety: number;
  blockers: string[];
  suggestions: string[];
  explanation: string;
};

export type IntelligenceContext = {
  brandProfile: BrandProfile;
  selectedPlatforms: Platform[];
  campaignGoal?: string;
  contentPillars: string[];
  platformRules: Record<string, unknown>;
  recentTopPosts: unknown[];
  recentFailedPosts: unknown[];
  approvalPreferences: unknown[];
  similarPastExamples: unknown[];
  currentPerformanceSummary: Record<string, unknown>;
  audienceLanguage: string[];
  activeKnowledgeSources: unknown[];
};
