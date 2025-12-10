/**
 * Razorpay Integration Library
 * Handles all Razorpay-related operations for Xocial billing
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay API keys are not configured');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

// Plan IDs mapping (these should match your Razorpay dashboard plans)
export const RAZORPAY_PLAN_IDS = {
    pro_monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || '',
    pro_yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY || '',
    growth_monthly: process.env.RAZORPAY_PLAN_GROWTH_MONTHLY || '',
    growth_yearly: process.env.RAZORPAY_PLAN_GROWTH_YEARLY || '',
} as const;

// Plan details with pricing (in paise for INR)
export const PLAN_DETAILS = {
    free: {
        name: 'Free',
        price_monthly: 0,
        price_yearly: 0,
        features: {
            max_users: 1,
            max_workspaces: 1,
            max_social_profiles: 3,
            ai_enabled: false,
            advanced_analytics: false,
            approval_workflows: false,
            engagement_inbox: false,
        },
    },
    pro: {
        name: 'Pro',
        price_monthly: 324900, // ₹3,249
        price_yearly: 3249000, // ₹32,490 (₹2,707.50/mo)
        features: {
            max_users: 3,
            max_workspaces: 1,
            max_social_profiles: 10,
            ai_enabled: true,
            advanced_analytics: false,
            approval_workflows: true,
            engagement_inbox: false,
        },
    },
    growth: {
        name: 'Growth',
        price_monthly: 824900, // ₹8,249
        price_yearly: 8249000, // ₹82,490 (₹6,874.17/mo)
        features: {
            max_users: 10,
            max_workspaces: 3,
            max_social_profiles: 30,
            ai_enabled: true,
            advanced_analytics: true,
            approval_workflows: true,
            engagement_inbox: true,
        },
    },
    enterprise: {
        name: 'Enterprise',
        price_monthly: 0, // Custom pricing
        price_yearly: 0,
        features: {
            max_users: 999,
            max_workspaces: 999,
            max_social_profiles: 999,
            ai_enabled: true,
            advanced_analytics: true,
            approval_workflows: true,
            engagement_inbox: true,
        },
    },
} as const;

export type PlanType = keyof typeof PLAN_DETAILS;
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Create a Razorpay order for one-time payment
 */
export async function createOrder(params: {
    amount: number; // in paise
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}) {
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
        amount: params.amount,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
    });

    return order;
}

/**
 * Create a Razorpay subscription
 */
export async function createSubscription(params: {
    plan_id: string;
    customer_id?: string;
    total_count?: number;
    quantity?: number;
    notes?: Record<string, string>;
}) {
    const razorpay = getRazorpayInstance();

    // Build subscription params - customer_id is optional for subscription links
    const subscriptionParams: Record<string, any> = {
        plan_id: params.plan_id,
        total_count: params.total_count || 12,
        quantity: params.quantity || 1,
        notes: params.notes || {},
    };

    // Only include customer_id if provided
    if (params.customer_id) {
        subscriptionParams.customer_id = params.customer_id;
    }

    const subscription = await razorpay.subscriptions.create(subscriptionParams as any);

    return subscription;
}

/**
 * Create a Razorpay customer
 */
export async function createCustomer(params: {
    name: string;
    email: string;
    contact?: string;
    notes?: Record<string, string>;
}) {
    const razorpay = getRazorpayInstance();

    const customer = await razorpay.customers.create({
        name: params.name,
        email: params.email,
        contact: params.contact,
        notes: params.notes || {},
    });

    return customer;
}

/**
 * Fetch subscription details
 */
export async function fetchSubscription(subscriptionId: string) {
    const razorpay = getRazorpayInstance();
    return razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd = true) {
    const razorpay = getRazorpayInstance();
    return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: string) {
    const razorpay = getRazorpayInstance();
    return razorpay.subscriptions.pause(subscriptionId);
}

/**
 * Resume a subscription
 */
export async function resumeSubscription(subscriptionId: string) {
    const razorpay = getRazorpayInstance();
    return razorpay.subscriptions.resume(subscriptionId);
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(params: {
    order_id?: string;
    subscription_id?: string;
    payment_id: string;
    signature: string;
}): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new Error('Razorpay key secret not configured');
    }

    let expectedSignature: string;

    if (params.subscription_id) {
        // For subscription payments
        const body = `${params.payment_id}|${params.subscription_id}`;
        expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');
    } else if (params.order_id) {
        // For one-time payments
        const body = `${params.order_id}|${params.payment_id}`;
        expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');
    } else {
        throw new Error('Either order_id or subscription_id is required');
    }

    return expectedSignature === params.signature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
    body: string,
    signature: string
): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('Razorpay webhook secret not configured');
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
}

/**
 * Get the plan ID for a given plan and billing period
 */
export function getPlanId(plan: PlanType, period: BillingPeriod): string | null {
    if (plan === 'free' || plan === 'enterprise') {
        return null;
    }

    const key = `${plan}_${period}` as keyof typeof RAZORPAY_PLAN_IDS;
    return RAZORPAY_PLAN_IDS[key] || null;
}

/**
 * Calculate prorated amount for plan upgrade
 */
export function calculateProration(params: {
    currentPlan: PlanType;
    newPlan: PlanType;
    period: BillingPeriod;
    daysRemaining: number;
    totalDaysInPeriod: number;
}): number {
    const currentPrice = PLAN_DETAILS[params.currentPlan][`price_${params.period}`];
    const newPrice = PLAN_DETAILS[params.newPlan][`price_${params.period}`];

    const dailyCurrentPrice = currentPrice / params.totalDaysInPeriod;
    const dailyNewPrice = newPrice / params.totalDaysInPeriod;

    const creditRemaining = dailyCurrentPrice * params.daysRemaining;
    const costForRemaining = dailyNewPrice * params.daysRemaining;

    return Math.max(0, Math.round(costForRemaining - creditRemaining));
}

export default {
    createOrder,
    createSubscription,
    createCustomer,
    fetchSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    verifyPaymentSignature,
    verifyWebhookSignature,
    getPlanId,
    calculateProration,
    PLAN_DETAILS,
    RAZORPAY_PLAN_IDS,
};
