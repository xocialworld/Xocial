/**
 * Verify Razorpay Payment API
 * POST /api/billing/razorpay/verify
 * 
 * Verifies payment after Razorpay checkout and updates subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPaymentSignature, PLAN_DETAILS } from '@/lib/razorpay';
import type { PlanType, BillingPeriod } from '@/lib/razorpay/types';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_subscription_id,
            razorpay_signature,
            workspace_id,
            plan,
            billing_period = 'monthly',
        } = body as {
            razorpay_payment_id: string;
            razorpay_order_id?: string;
            razorpay_subscription_id?: string;
            razorpay_signature: string;
            workspace_id: string;
            plan: PlanType;
            billing_period: BillingPeriod;
        };

        if (!razorpay_payment_id || !razorpay_signature || !workspace_id || !plan) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // Verify the payment signature
        const isValid = verifyPaymentSignature({
            order_id: razorpay_order_id,
            subscription_id: razorpay_subscription_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature,
        });

        if (!isValid) {
            console.error('Invalid payment signature');
            return NextResponse.json(
                { error: 'Payment verification failed' },
                { status: 400 }
            );
        }

        // Calculate billing period dates
        const now = new Date();
        const periodEnd = new Date(now);
        if (billing_period === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Update subscription
        const { data: subscription, error: updateError } = await supabase
            .from('subscriptions')
            .update({
                plan,
                status: 'active',
                razorpay_subscription_id: razorpay_subscription_id || null,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                cancel_at_period_end: false,
                cancelled_at: null,
                metadata: {
                    last_payment_id: razorpay_payment_id,
                    billing_period,
                },
            })
            .eq('workspace_id', workspace_id)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to update subscription:', updateError);
            return NextResponse.json(
                { error: 'Failed to update subscription' },
                { status: 500 }
            );
        }

        // Record billing history
        const planDetails = PLAN_DETAILS[plan];
        const amount = billing_period === 'yearly'
            ? planDetails.price_yearly
            : planDetails.price_monthly;

        await supabase.from('billing_history').insert({
            workspace_id,
            subscription_id: subscription.id,
            razorpay_payment_id,
            razorpay_order_id: razorpay_order_id || null,
            amount_cents: amount,
            currency: 'INR',
            status: 'paid',
            description: `${planDetails.name} Plan - ${billing_period === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
            paid_at: now.toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Payment verified and subscription activated',
            subscription: {
                id: subscription.id,
                plan: subscription.plan,
                status: subscription.status,
                current_period_end: subscription.current_period_end,
            },
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return NextResponse.json(
            { error: 'Payment verification failed' },
            { status: 500 }
        );
    }
}
