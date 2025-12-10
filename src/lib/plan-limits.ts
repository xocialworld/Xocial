/**
 * Plan Limits Enforcement Middleware
 * 
 * Checks subscription plan limits for various features
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface PlanLimits {
    plan: string;
    max_users: number;
    max_workspaces: number;
    max_social_profiles: number;
    max_scheduled_posts: number | null;
    ai_enabled: boolean;
    advanced_analytics: boolean;
    approval_workflows: boolean;
    engagement_inbox: boolean;
    custom_branding: boolean;
}

export interface UsageStats {
    users_count: number;
    workspaces_count: number;
    social_profiles_count: number;
    scheduled_posts_count: number;
}

export type LimitCheckResult = {
    allowed: boolean;
    reason?: string;
    current?: number;
    limit?: number;
    upgradeRequired?: boolean;
};

/**
 * Get the current subscription and plan limits for a workspace
 */
export async function getWorkspaceLimits(workspaceId: string): Promise<{
    subscription: any;
    limits: PlanLimits | null;
    usage: UsageStats;
}> {
    const supabase = await createClient();

    // Get subscription with plan limits
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
      *,
      plan_limits!inner (*)
    `)
        .eq('workspace_id', workspaceId)
        .single();

    // Get current usage
    const [usersResult, profilesResult, scheduledResult] = await Promise.all([
        supabase
            .from('workspace_members')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId),
        supabase
            .from('social_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId),
        supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('status', 'scheduled'),
    ]);

    // Get workspaces count for user
    const { data: { user } } = await supabase.auth.getUser();
    let workspacesCount = 1;
    if (user) {
        const { count } = await supabase
            .from('workspace_members')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
        workspacesCount = count || 1;
    }

    const usage: UsageStats = {
        users_count: usersResult.count || 0,
        workspaces_count: workspacesCount,
        social_profiles_count: profilesResult.count || 0,
        scheduled_posts_count: scheduledResult.count || 0,
    };

    // Default free plan limits if no subscription
    const defaultLimits: PlanLimits = {
        plan: 'free',
        max_users: 1,
        max_workspaces: 1,
        max_social_profiles: 3,
        max_scheduled_posts: 10,
        ai_enabled: false,
        advanced_analytics: false,
        approval_workflows: false,
        engagement_inbox: false,
        custom_branding: false,
    };

    return {
        subscription,
        limits: subscription?.plan_limits || defaultLimits,
        usage,
    };
}

/**
 * Check if adding a user is allowed
 */
export async function checkUserLimit(workspaceId: string): Promise<LimitCheckResult> {
    const { limits, usage } = await getWorkspaceLimits(workspaceId);

    if (!limits) {
        return { allowed: false, reason: 'No subscription found' };
    }

    if (usage.users_count >= limits.max_users) {
        return {
            allowed: false,
            reason: `User limit reached (${usage.users_count}/${limits.max_users})`,
            current: usage.users_count,
            limit: limits.max_users,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

/**
 * Check if adding a social profile is allowed
 */
export async function checkSocialProfileLimit(workspaceId: string): Promise<LimitCheckResult> {
    const { limits, usage } = await getWorkspaceLimits(workspaceId);

    if (!limits) {
        return { allowed: false, reason: 'No subscription found' };
    }

    if (usage.social_profiles_count >= limits.max_social_profiles) {
        return {
            allowed: false,
            reason: `Social profile limit reached (${usage.social_profiles_count}/${limits.max_social_profiles})`,
            current: usage.social_profiles_count,
            limit: limits.max_social_profiles,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

/**
 * Check if scheduling a post is allowed
 */
export async function checkScheduledPostLimit(workspaceId: string): Promise<LimitCheckResult> {
    const { limits, usage } = await getWorkspaceLimits(workspaceId);

    if (!limits) {
        return { allowed: false, reason: 'No subscription found' };
    }

    // null means unlimited
    if (limits.max_scheduled_posts === null) {
        return { allowed: true };
    }

    if (usage.scheduled_posts_count >= limits.max_scheduled_posts) {
        return {
            allowed: false,
            reason: `Scheduled post limit reached (${usage.scheduled_posts_count}/${limits.max_scheduled_posts})`,
            current: usage.scheduled_posts_count,
            limit: limits.max_scheduled_posts,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

/**
 * Check if a feature is enabled for the workspace plan
 */
export async function checkFeatureAccess(
    workspaceId: string,
    feature: 'ai_enabled' | 'advanced_analytics' | 'approval_workflows' | 'engagement_inbox' | 'custom_branding'
): Promise<LimitCheckResult> {
    const { limits } = await getWorkspaceLimits(workspaceId);

    if (!limits) {
        return { allowed: false, reason: 'No subscription found' };
    }

    if (!limits[feature]) {
        return {
            allowed: false,
            reason: `${feature.replace(/_/g, ' ')} is not available on your plan`,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

/**
 * Middleware helper to enforce limits on API routes
 */
export function withLimitCheck(
    checkFn: (workspaceId: string) => Promise<LimitCheckResult>
) {
    return async (request: NextRequest, workspaceId: string) => {
        const result = await checkFn(workspaceId);

        if (!result.allowed) {
            return NextResponse.json(
                {
                    error: result.reason,
                    upgradeRequired: result.upgradeRequired,
                    current: result.current,
                    limit: result.limit,
                },
                { status: 403 }
            );
        }

        return null; // Continue with request
    };
}

/**
 * Get usage summary for UI display
 */
export async function getUsageSummary(workspaceId: string) {
    const { limits, usage } = await getWorkspaceLimits(workspaceId);

    if (!limits) {
        return null;
    }

    return {
        plan: limits.plan,
        users: {
            current: usage.users_count,
            limit: limits.max_users,
            percentage: (usage.users_count / limits.max_users) * 100,
        },
        socialProfiles: {
            current: usage.social_profiles_count,
            limit: limits.max_social_profiles,
            percentage: (usage.social_profiles_count / limits.max_social_profiles) * 100,
        },
        scheduledPosts: limits.max_scheduled_posts
            ? {
                current: usage.scheduled_posts_count,
                limit: limits.max_scheduled_posts,
                percentage: (usage.scheduled_posts_count / limits.max_scheduled_posts) * 100,
            }
            : null,
        features: {
            ai_enabled: limits.ai_enabled,
            advanced_analytics: limits.advanced_analytics,
            approval_workflows: limits.approval_workflows,
            engagement_inbox: limits.engagement_inbox,
            custom_branding: limits.custom_branding,
        },
    };
}
