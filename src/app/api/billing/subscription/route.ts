/**
 * Subscription Management API
 * GET, POST /api/billing/subscription
 * 
 * Get current subscription and manage subscription actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelSubscription, pauseSubscription, resumeSubscription } from '@/lib/razorpay';
import { getConfiguredDevAdminPlan } from '@/lib/dev-admin-entitlements';

function getFallbackDevAdminLimits(plan: string) {
    return {
        plan,
        max_users: plan === 'enterprise' ? 999 : 1,
        max_workspaces: plan === 'enterprise' ? 999 : 1,
        max_social_profiles: plan === 'enterprise' ? 999 : 3,
        max_scheduled_posts: plan === 'enterprise' ? null : 10,
        ai_enabled: plan === 'enterprise',
        advanced_analytics: plan === 'enterprise',
        approval_workflows: plan === 'enterprise',
        engagement_inbox: plan === 'enterprise',
        custom_branding: plan === 'enterprise',
    };
}

// GET - Fetch current subscription for workspace
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspace_id');

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        // Verify user has access to the workspace
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        const devAdminPlan = getConfiguredDevAdminPlan(user);
        if (devAdminPlan) {
            const { data: planLimits } = await supabase
                .from('plan_limits')
                .select('*')
                .eq('plan', devAdminPlan)
                .maybeSingle();

            return NextResponse.json({
                subscription: {
                    plan: devAdminPlan,
                    status: 'active',
                    limits: planLimits || getFallbackDevAdminLimits(devAdminPlan),
                    dev_admin_override: true,
                },
            });
        }

        // Get subscription with plan limits
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select(`
        *,
        plan_limits!inner (
          max_users,
          max_workspaces,
          max_social_profiles,
          max_scheduled_posts,
          ai_enabled,
          advanced_analytics,
          approval_workflows,
          engagement_inbox,
          custom_branding,
          price_monthly_cents,
          price_yearly_cents
        )
      `)
            .eq('workspace_id', workspaceId)
            .single();

        if (error) {
            // If no subscription exists, return free plan defaults
            const { data: freePlanLimits } = await supabase
                .from('plan_limits')
                .select('*')
                .eq('plan', 'free')
                .single();

            return NextResponse.json({
                subscription: {
                    plan: 'free',
                    status: 'active',
                    limits: freePlanLimits,
                },
            });
        }

        return NextResponse.json({ subscription });

    } catch (error) {
        console.error('Get subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription' },
            { status: 500 }
        );
    }
}

// POST - Manage subscription (cancel, pause, resume)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { workspace_id, action } = body as {
            workspace_id: string;
            action: 'cancel' | 'pause' | 'resume';
        };

        if (!workspace_id || !action) {
            return NextResponse.json(
                { error: 'workspace_id and action are required' },
                { status: 400 }
            );
        }

        // Verify user is owner/admin
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Only workspace owners can manage billing' },
                { status: 403 }
            );
        }

        // Get current subscription
        const { data: subscription, error: fetchError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('workspace_id', workspace_id)
            .single();

        if (fetchError || !subscription) {
            return NextResponse.json(
                { error: 'Subscription not found' },
                { status: 404 }
            );
        }

        if (!subscription.razorpay_subscription_id) {
            return NextResponse.json(
                { error: 'No active Razorpay subscription to manage' },
                { status: 400 }
            );
        }

        let result;
        let updateData: Record<string, any> = {};

        switch (action) {
            case 'cancel':
                result = await cancelSubscription(subscription.razorpay_subscription_id, true);
                updateData = {
                    cancel_at_period_end: true,
                    cancelled_at: new Date().toISOString(),
                };
                break;

            case 'pause':
                result = await pauseSubscription(subscription.razorpay_subscription_id);
                updateData = { status: 'paused' };
                break;

            case 'resume':
                result = await resumeSubscription(subscription.razorpay_subscription_id);
                updateData = {
                    status: 'active',
                    cancel_at_period_end: false,
                    cancelled_at: null,
                };
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        // Update local subscription record
        await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('id', subscription.id);

        return NextResponse.json({
            success: true,
            action,
            message: `Subscription ${action} successful`,
        });

    } catch (error) {
        console.error('Subscription action error:', error);
        return NextResponse.json(
            { error: 'Failed to perform subscription action' },
            { status: 500 }
        );
    }
}
