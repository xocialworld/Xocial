/**
 * Create Razorpay Order API
 * POST /api/billing/razorpay/create-order
 * 
 * Creates a Razorpay order for plan upgrade or subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder, createSubscription, createCustomer, getPlanId, PLAN_DETAILS } from '@/lib/razorpay';
import type { PlanType, BillingPeriod } from '@/lib/razorpay/types';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { workspace_id, plan, billing_period = 'monthly' } = body as {
            workspace_id: string;
            plan: PlanType;
            billing_period: BillingPeriod;
        };

        if (!workspace_id || !plan) {
            return NextResponse.json(
                { error: 'workspace_id and plan are required' },
                { status: 400 }
            );
        }

        // Verify user has access to the workspace
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

        // Get user profile for customer creation
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

        // Get or create subscription record
        let { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('workspace_id', workspace_id)
            .single();

        if (!subscription) {
            // Create a free subscription record
            const { data: newSubscription, error: createError } = await supabase
                .from('subscriptions')
                .insert({
                    workspace_id,
                    plan: 'free',
                    status: 'active',
                })
                .select()
                .single();

            if (createError) {
                console.error('Failed to create subscription record:', createError);
                return NextResponse.json(
                    { error: 'Failed to initialize subscription' },
                    { status: 500 }
                );
            }
            subscription = newSubscription;
        }

        // If upgrading to free (downgrade), just update the record
        if (plan === 'free') {
            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    plan: 'free',
                    cancel_at_period_end: true,
                })
                .eq('id', subscription.id);

            if (updateError) {
                return NextResponse.json(
                    { error: 'Failed to update subscription' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Subscription will be downgraded at the end of the billing period',
            });
        }

        // For paid plans, get the Razorpay plan ID
        const razorpayPlanId = getPlanId(plan, billing_period);

        if (!razorpayPlanId) {
            // If no subscription plan is configured, create a one-time order
            const planDetails = PLAN_DETAILS[plan];
            const amount = billing_period === 'yearly'
                ? planDetails.price_yearly
                : planDetails.price_monthly;

            if (amount === 0) {
                return NextResponse.json(
                    { error: 'Invalid plan configuration' },
                    { status: 400 }
                );
            }

            // Create a one-time order
            const order = await createOrder({
                amount,
                currency: 'INR',
                receipt: `order_${workspace_id}_${Date.now()}`,
                notes: {
                    workspace_id,
                    plan,
                    billing_period,
                    user_id: user.id,
                },
            });

            return NextResponse.json({
                success: true,
                type: 'order',
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID,
                prefill: {
                    name: profile?.full_name || '',
                    email: profile?.email || user.email || '',
                },
                notes: order.notes,
            });
        }

        // Create or get Razorpay customer
        let customerId = subscription.razorpay_customer_id;

        if (!customerId) {
            const customer = await createCustomer({
                name: profile?.full_name || 'Xocial User',
                email: profile?.email || user.email || '',
                notes: {
                    user_id: user.id,
                    workspace_id,
                },
            });
            customerId = customer.id;

            // Update subscription with customer ID
            await supabase
                .from('subscriptions')
                .update({ razorpay_customer_id: customerId })
                .eq('id', subscription.id);
        }

        // Create subscription
        const razorpaySubscription = await createSubscription({
            plan_id: razorpayPlanId,
            customer_id: customerId,
            total_count: billing_period === 'yearly' ? 1 : 12,
            notes: {
                workspace_id,
                plan,
                billing_period,
                user_id: user.id,
            },
        });

        // Update subscription record with pending status
        await supabase
            .from('subscriptions')
            .update({
                razorpay_subscription_id: razorpaySubscription.id,
                razorpay_plan_id: razorpayPlanId,
            })
            .eq('id', subscription.id);

        return NextResponse.json({
            success: true,
            type: 'subscription',
            subscription_id: razorpaySubscription.id,
            key_id: process.env.RAZORPAY_KEY_ID,
            prefill: {
                name: profile?.full_name || '',
                email: profile?.email || user.email || '',
            },
        });

    } catch (error) {
        console.error('Create order error:', error);
        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
