"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Share2,
    Calendar,
    Sparkles,
    BarChart3,
    GitBranch,
    MessageSquare,
    Paintbrush,
    ArrowRight,
    Loader2,
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageSummary {
    plan: string;
    users: { current: number; limit: number; percentage: number };
    socialProfiles: { current: number; limit: number; percentage: number };
    scheduledPosts: { current: number; limit: number; percentage: number } | null;
    features: {
        ai_enabled: boolean;
        advanced_analytics: boolean;
        approval_workflows: boolean;
        engagement_inbox: boolean;
        custom_branding: boolean;
    };
}

interface UsageDisplayProps {
    workspaceId: string;
    compact?: boolean;
}

export function UsageDisplay({ workspaceId, compact = false }: UsageDisplayProps) {
    const [usage, setUsage] = useState<UsageSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, [workspaceId]);

    const fetchUsage = async () => {
        try {
            const res = await fetch(`/api/billing/usage?workspace_id=${workspaceId}`);
            const data = await res.json();
            if (res.ok && data.usage) {
                setUsage(data.usage);
            }
        } catch (error) {
            console.error("Failed to fetch usage:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-secondary-400" />
            </div>
        );
    }

    if (!usage) return null;

    const getStatusColor = (percentage: number) => {
        if (percentage >= 100) return "text-red-600";
        if (percentage >= 80) return "text-amber-600";
        return "text-green-600";
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return "bg-red-500";
        if (percentage >= 80) return "bg-amber-500";
        return "bg-primary-500";
    };

    if (compact) {
        return (
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-secondary-400" />
                    <span className={getStatusColor(usage.users.percentage)}>
                        {usage.users.current}/{usage.users.limit}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-secondary-400" />
                    <span className={getStatusColor(usage.socialProfiles.percentage)}>
                        {usage.socialProfiles.current}/{usage.socialProfiles.limit}
                    </span>
                </div>
                {usage.users.percentage >= 80 && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                        Upgrade
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Usage & Limits</CardTitle>
                    <Badge variant="outline" className="capitalize">
                        {usage.plan} Plan
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Usage Meters */}
                <div className="grid gap-4">
                    {/* Users */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm font-medium">Team Members</span>
                            </div>
                            <span className={cn("text-sm font-medium", getStatusColor(usage.users.percentage))}>
                                {usage.users.current} / {usage.users.limit}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all", getProgressColor(usage.users.percentage))}
                                style={{ width: `${Math.min(usage.users.percentage, 100)}%` }}
                            />
                        </div>
                        {usage.users.percentage >= 100 && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                User limit reached
                            </p>
                        )}
                    </div>

                    {/* Social Profiles */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm font-medium">Social Profiles</span>
                            </div>
                            <span className={cn("text-sm font-medium", getStatusColor(usage.socialProfiles.percentage))}>
                                {usage.socialProfiles.current} / {usage.socialProfiles.limit}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all", getProgressColor(usage.socialProfiles.percentage))}
                                style={{ width: `${Math.min(usage.socialProfiles.percentage, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Scheduled Posts */}
                    {usage.scheduledPosts && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-secondary-500" />
                                    <span className="text-sm font-medium">Scheduled Posts</span>
                                </div>
                                <span className={cn("text-sm font-medium", getStatusColor(usage.scheduledPosts.percentage))}>
                                    {usage.scheduledPosts.current} / {usage.scheduledPosts.limit}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all", getProgressColor(usage.scheduledPosts.percentage))}
                                    style={{ width: `${Math.min(usage.scheduledPosts.percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Features */}
                <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-secondary-900 mb-3">Features</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <FeatureItem
                            icon={Sparkles}
                            label="AI Assistant"
                            enabled={usage.features.ai_enabled}
                        />
                        <FeatureItem
                            icon={BarChart3}
                            label="Advanced Analytics"
                            enabled={usage.features.advanced_analytics}
                        />
                        <FeatureItem
                            icon={GitBranch}
                            label="Approval Workflows"
                            enabled={usage.features.approval_workflows}
                        />
                        <FeatureItem
                            icon={MessageSquare}
                            label="Engagement Inbox"
                            enabled={usage.features.engagement_inbox}
                        />
                    </div>
                </div>

                {/* Upgrade CTA */}
                {usage.plan === "free" && (
                    <div className="pt-4 border-t">
                        <Button className="w-full gap-2" onClick={() => window.location.href = "/settings/billing"}>
                            Upgrade for More
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FeatureItem({
    icon: Icon,
    label,
    enabled,
}: {
    icon: any;
    label: string;
    enabled: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            enabled ? "bg-green-50 text-green-700" : "bg-secondary-50 text-secondary-400"
        )}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {!enabled && (
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5">
                    Pro
                </Badge>
            )}
        </div>
    );
}
