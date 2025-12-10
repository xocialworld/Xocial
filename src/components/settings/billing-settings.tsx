"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Building, CreditCard, AlertCircle, Loader2, History, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BillingSettingsProps {
    workspaceId: string;
}

interface Subscription {
    plan: 'free' | 'pro' | 'growth' | 'enterprise';
    status: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'paused';
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    plan_limits?: {
        max_users: number;
        max_workspaces: number;
        max_social_profiles: number;
        ai_enabled: boolean;
        advanced_analytics: boolean;
        approval_workflows: boolean;
        engagement_inbox: boolean;
        price_monthly_cents: number;
        price_yearly_cents: number;
    };
}

interface BillingHistoryItem {
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    description: string;
    paid_at: string;
    created_at: string;
}

const PLAN_FEATURES = {
    free: {
        name: 'Free',
        description: 'For solo creators',
        price: 0,
        icon: Shield,
        features: ['1 Workspace', '3 Social Profiles', 'Basic Analytics', 'Single-step Approvals'],
    },
    pro: {
        name: 'Pro',
        description: 'For small teams',
        price: 3249,
        icon: Zap,
        popular: true,
        features: ['1 Workspace', '10 Social Profiles', 'AI Assistant', 'Multi-step Approvals', 'Comments & Collaboration'],
    },
    growth: {
        name: 'Growth',
        description: 'For agencies',
        price: 8249,
        icon: Building,
        features: ['3 Workspaces', '30 Social Profiles', 'Advanced Analytics', 'Engagement Inbox', 'Priority Support'],
    },
};

export function BillingSettings({ workspaceId }: BillingSettingsProps) {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchSubscription();
    }, [workspaceId]);

    const fetchSubscription = async () => {
        try {
            const res = await fetch(`/api/billing/subscription?workspace_id=${workspaceId}`);
            const data = await res.json();
            if (data.subscription) {
                setSubscription(data.subscription);
            }
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
            toast.error('Failed to load subscription details');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`/api/billing/history?workspace_id=${workspaceId}`);
            const data = await res.json();
            setHistory(data.history || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Failed to fetch billing history:', error);
            toast.error('Failed to load billing history');
        }
    };

    const handleUpgrade = async (plan: 'pro' | 'growth') => {
        setUpgrading(plan);

        try {
            const res = await fetch('/api/billing/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    plan,
                    billing_period: 'monthly',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create order');
            }

            // Load Razorpay checkout
            const options: any = {
                key: data.key_id,
                name: 'Xocial',
                description: `${PLAN_FEATURES[plan].name} Plan - Monthly`,
                image: '/logo.png',
                prefill: data.prefill,
                theme: {
                    color: '#6366f1',
                },
                handler: async function (response: any) {
                    // Verify payment
                    const verifyRes = await fetch('/api/billing/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_signature: response.razorpay_signature,
                            workspace_id: workspaceId,
                            plan,
                            billing_period: 'monthly',
                        }),
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.success) {
                        toast.success('Subscription upgraded successfully!');
                        fetchSubscription();
                    } else {
                        toast.error(verifyData.error || 'Payment verification failed');
                    }
                },
                modal: {
                    ondismiss: function () {
                        setUpgrading(null);
                    },
                },
            };

            if (data.type === 'order') {
                options.order_id = data.order_id;
                options.amount = data.amount;
                options.currency = data.currency;
            } else if (data.type === 'subscription') {
                options.subscription_id = data.subscription_id;
            }

            // @ts-ignore
            const razorpay = new window.Razorpay(options);
            razorpay.open();

        } catch (error: any) {
            console.error('Upgrade error:', error);
            toast.error(error.message || 'Failed to initiate upgrade');
        } finally {
            setUpgrading(null);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
            return;
        }

        try {
            const res = await fetch('/api/billing/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    action: 'cancel',
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success('Subscription will be cancelled at the end of the billing period');
                fetchSubscription();
            } else {
                toast.error(data.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            toast.error('Failed to cancel subscription');
        }
    };

    const formatCurrency = (cents: number, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
        );
    }

    const currentPlan = subscription?.plan || 'free';

    return (
        <div className="space-y-6">
            {/* Razorpay Script */}
            <script src="https://checkout.razorpay.com/v1/checkout.js" async />

            {/* Current Plan Status */}
            <Card className={cn(
                "border-2",
                subscription?.status === 'past_due' ? "border-red-200 bg-red-50/50" : "border-primary-100 bg-primary-50/50"
            )}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-primary-900">Current Plan</CardTitle>
                            <CardDescription className="text-primary-700">
                                You are on the <strong className="capitalize">{currentPlan}</strong> plan
                            </CardDescription>
                        </div>
                        <Badge className={cn(
                            "text-sm px-3 py-1",
                            currentPlan === 'pro' && "bg-primary-600 hover:bg-primary-700",
                            currentPlan === 'growth' && "bg-purple-600 hover:bg-purple-700",
                            currentPlan === 'free' && "bg-secondary-500 hover:bg-secondary-600",
                        )}>
                            {PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES]?.name || currentPlan}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-primary-900">Status</p>
                            <div className="flex items-center gap-2">
                                {subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Active
                                    </Badge>
                                )}
                                {subscription?.status === 'past_due' && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Payment Failed
                                    </Badge>
                                )}
                                {subscription?.cancel_at_period_end && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        Cancelling
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {subscription?.current_period_end && currentPlan !== 'free' && (
                            <div className="space-y-1 text-right">
                                <p className="text-sm font-medium text-primary-900">
                                    {subscription?.cancel_at_period_end ? 'Access Until' : 'Renews On'}
                                </p>
                                <p className="text-sm text-primary-700">
                                    {formatDate(subscription.current_period_end)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-primary-200">
                        <Button variant="outline" size="sm" onClick={fetchHistory}>
                            <History className="h-4 w-4 mr-2" />
                            Billing History
                        </Button>
                        {currentPlan !== 'free' && !subscription?.cancel_at_period_end && (
                            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                Cancel Subscription
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Billing History Modal */}
            {showHistory && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Billing History</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                            Close
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-secondary-500 text-center py-4">No billing history yet</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div>
                                            <p className="font-medium text-secondary-900">{item.description}</p>
                                            <p className="text-sm text-secondary-500">
                                                {formatDate(item.paid_at || item.created_at)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{formatCurrency(item.amount_cents, item.currency)}</p>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    item.status === 'paid' && "bg-green-50 text-green-700",
                                                    item.status === 'failed' && "bg-red-50 text-red-700"
                                                )}
                                            >
                                                {item.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Available Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free */}
                <Card className={cn("relative", currentPlan === 'free' && "ring-2 ring-primary-500")}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-secondary-500" />
                            <CardTitle>Free</CardTitle>
                        </div>
                        <CardDescription>For solo creators</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">₹0</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            {PLAN_FEATURES.free.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" className="w-full" disabled={currentPlan === 'free'}>
                            {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Pro */}
                <Card className={cn(
                    "relative border-2",
                    currentPlan === 'pro' ? "ring-2 ring-primary-500" : "border-primary-200 shadow-md"
                )}>
                    {PLAN_FEATURES.pro.popular && currentPlan !== 'pro' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Popular
                        </div>
                    )}
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary-500" />
                            <CardTitle>Pro</CardTitle>
                        </div>
                        <CardDescription>For small teams</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">₹3,249</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            {PLAN_FEATURES.pro.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <Button
                            className="w-full"
                            onClick={() => handleUpgrade('pro')}
                            disabled={currentPlan === 'pro' || currentPlan === 'growth' || upgrading !== null}
                        >
                            {upgrading === 'pro' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {currentPlan === 'pro' ? 'Current Plan' : currentPlan === 'growth' ? 'Downgrade' : 'Upgrade to Pro'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Growth */}
                <Card className={cn("relative", currentPlan === 'growth' && "ring-2 ring-primary-500")}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-purple-500" />
                            <CardTitle>Growth</CardTitle>
                        </div>
                        <CardDescription>For agencies</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">₹8,249</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            {PLAN_FEATURES.growth.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleUpgrade('growth')}
                            disabled={currentPlan === 'growth' || upgrading !== null}
                        >
                            {upgrading === 'growth' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {currentPlan === 'growth' ? 'Current Plan' : 'Upgrade to Growth'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Enterprise CTA */}
            <Card className="bg-gradient-to-r from-secondary-900 to-secondary-800 text-white">
                <CardContent className="flex items-center justify-between py-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-1">Need a custom plan?</h3>
                        <p className="text-secondary-300">
                            Get SSO, SLAs, custom limits, and dedicated support for your enterprise.
                        </p>
                    </div>
                    <Button variant="outline" className="bg-white text-secondary-900 hover:bg-secondary-50">
                        Contact Sales
                        <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
