/**
 * Razorpay Type Definitions
 */

export interface RazorpayOrder {
    id: string;
    entity: 'order';
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: 'created' | 'attempted' | 'paid';
    notes: Record<string, string>;
    created_at: number;
}

export interface RazorpaySubscription {
    id: string;
    entity: 'subscription';
    plan_id: string;
    customer_id: string;
    status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';
    current_start: number;
    current_end: number;
    ended_at: number | null;
    quantity: number;
    notes: Record<string, string>;
    charge_at: number;
    offer_id: string | null;
    short_url: string;
    has_scheduled_changes: boolean;
    change_scheduled_at: number | null;
    source: string;
    payment_method: string;
    created_at: number;
}

export interface RazorpayCustomer {
    id: string;
    entity: 'customer';
    name: string;
    email: string;
    contact: string;
    gstin: string | null;
    notes: Record<string, string>;
    created_at: number;
}

export interface RazorpayPayment {
    id: string;
    entity: 'payment';
    amount: number;
    currency: string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    order_id: string;
    invoice_id: string | null;
    international: boolean;
    method: string;
    amount_refunded: number;
    refund_status: string | null;
    captured: boolean;
    description: string;
    card_id: string | null;
    bank: string | null;
    wallet: string | null;
    vpa: string | null;
    email: string;
    contact: string;
    customer_id: string;
    notes: Record<string, string>;
    fee: number;
    tax: number;
    error_code: string | null;
    error_description: string | null;
    error_source: string | null;
    error_step: string | null;
    error_reason: string | null;
    acquirer_data: Record<string, any>;
    created_at: number;
}

export interface RazorpayWebhookEvent {
    entity: 'event';
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        subscription?: {
            entity: RazorpaySubscription;
        };
        payment?: {
            entity: RazorpayPayment;
        };
        order?: {
            entity: RazorpayOrder;
        };
    };
    created_at: number;
}

// Plan and subscription types for the application
export type PlanType = 'free' | 'pro' | 'growth' | 'enterprise';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'paused';

export interface Subscription {
    id: string;
    workspace_id: string;
    plan: PlanType;
    status: SubscriptionStatus;
    razorpay_subscription_id: string | null;
    razorpay_customer_id: string | null;
    razorpay_plan_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean;
    cancelled_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface BillingHistoryItem {
    id: string;
    workspace_id: string;
    subscription_id: string | null;
    razorpay_payment_id: string | null;
    razorpay_order_id: string | null;
    amount_cents: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    description: string | null;
    invoice_url: string | null;
    receipt_url: string | null;
    paid_at: string | null;
    created_at: string;
}

export interface PlanLimits {
    plan: PlanType;
    max_users: number;
    max_workspaces: number;
    max_social_profiles: number;
    max_scheduled_posts: number | null;
    ai_enabled: boolean;
    advanced_analytics: boolean;
    approval_workflows: boolean;
    engagement_inbox: boolean;
    custom_branding: boolean;
    price_monthly_cents: number;
    price_yearly_cents: number;
    extra_seat_price_cents: number;
    extra_workspace_price_cents: number;
}
