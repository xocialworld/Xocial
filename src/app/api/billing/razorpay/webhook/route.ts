/**
 * Razorpay Webhook Handler
 * POST /api/billing/razorpay/webhook
 * 
 * Handles Razorpay webhook events for subscription lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import type { RazorpayWebhookEvent } from '@/lib/razorpay/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing webhook signature' },
                { status: 400 }
            );
        }

        // Verify webhook signature
        const isValid = verifyWebhookSignature(body, signature);
        if (!isValid) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        const event: RazorpayWebhookEvent = JSON.parse(body);
        const supabase = await createClient();

        console.log('Razorpay webhook received:', event.event);

        switch (event.event) {
            case 'subscription.activated':
                await handleSubscriptionActivated(supabase, event);
                break;

            case 'subscription.charged':
                await handleSubscriptionCharged(supabase, event);
                break;

            case 'subscription.pending':
                await handleSubscriptionPending(supabase, event);
                break;

            case 'subscription.halted':
                await handleSubscriptionHalted(supabase, event);
                break;

            case 'subscription.cancelled':
                await handleSubscriptionCancelled(supabase, event);
                break;

            case 'subscription.completed':
                await handleSubscriptionCompleted(supabase, event);
                break;

            case 'payment.captured':
                await handlePaymentCaptured(supabase, event);
                break;

            case 'payment.failed':
                await handlePaymentFailed(supabase, event);
                break;

            default:
                console.log('Unhandled webhook event:', event.event);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

async function handleSubscriptionActivated(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) {
        console.error('Missing workspace_id in subscription notes');
        return;
    }

    await supabase
        .from('subscriptions')
        .update({
            status: 'active',
            current_period_start: new Date(subscription.current_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        })
        .eq('workspace_id', workspaceId);
}

async function handleSubscriptionCharged(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;

    if (!subscription || !payment) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) return;

    // Update subscription period
    await supabase
        .from('subscriptions')
        .update({
            status: 'active',
            current_period_start: new Date(subscription.current_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        })
        .eq('workspace_id', workspaceId);

    // Get subscription record for FK reference
    const { data: subRecord } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .single();

    // Record the payment
    await supabase.from('billing_history').insert({
        workspace_id: workspaceId,
        subscription_id: subRecord?.id,
        razorpay_payment_id: payment.id,
        amount_cents: payment.amount,
        currency: payment.currency,
        status: 'paid',
        description: 'Subscription renewal',
        paid_at: new Date(payment.created_at * 1000).toISOString(),
    });
}

async function handleSubscriptionPending(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) return;

    await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('workspace_id', workspaceId);
}

async function handleSubscriptionHalted(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) return;

    // After grace period, downgrade to free
    await supabase
        .from('subscriptions')
        .update({
            plan: 'free',
            status: 'active', // Active but on free plan
            razorpay_subscription_id: null,
        })
        .eq('workspace_id', workspaceId);

    // TODO: Send notification to workspace owner about downgrade
}

async function handleSubscriptionCancelled(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) return;

    await supabase
        .from('subscriptions')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);
}

async function handleSubscriptionCompleted(supabase: any, event: RazorpayWebhookEvent) {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const workspaceId = subscription.notes?.workspace_id;
    if (!workspaceId) return;

    // Subscription term completed, downgrade to free
    await supabase
        .from('subscriptions')
        .update({
            plan: 'free',
            status: 'active',
            razorpay_subscription_id: null,
            razorpay_plan_id: null,
        })
        .eq('workspace_id', workspaceId);
}

async function handlePaymentCaptured(supabase: any, event: RazorpayWebhookEvent) {
    const payment = event.payload.payment?.entity;
    if (!payment) return;

    const workspaceId = payment.notes?.workspace_id;
    if (!workspaceId) return;

    // Check if this payment is already recorded
    const { data: existing } = await supabase
        .from('billing_history')
        .select('id')
        .eq('razorpay_payment_id', payment.id)
        .single();

    if (existing) return; // Already recorded

    // Get subscription for FK reference
    const { data: subRecord } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .single();

    await supabase.from('billing_history').insert({
        workspace_id: workspaceId,
        subscription_id: subRecord?.id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount_cents: payment.amount,
        currency: payment.currency,
        status: 'paid',
        description: payment.description || 'Payment',
        paid_at: new Date(payment.created_at * 1000).toISOString(),
    });
}

async function handlePaymentFailed(supabase: any, event: RazorpayWebhookEvent) {
    const payment = event.payload.payment?.entity;
    if (!payment) return;

    const workspaceId = payment.notes?.workspace_id;
    if (!workspaceId) return;

    // Get subscription for FK reference
    const { data: subRecord } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .single();

    await supabase.from('billing_history').insert({
        workspace_id: workspaceId,
        subscription_id: subRecord?.id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount_cents: payment.amount,
        currency: payment.currency,
        status: 'failed',
        description: payment.error_description || 'Payment failed',
    });

    // Update subscription status to past_due if it's the first failure
    await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

    // TODO: Send notification about failed payment
}
