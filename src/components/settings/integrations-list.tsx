"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Facebook,
    Instagram,
    Linkedin,
    Twitter,
    Youtube,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Plus,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";

interface IntegrationsListProps {
    workspaceId: string;
}

const platformConfig = {
    instagram: {
        name: "Instagram",
        icon: Instagram,
        color: "from-pink-500 to-purple-500",
        bgColor: "bg-gradient-to-br from-pink-500 to-purple-500"
    },
    facebook: {
        name: "Facebook",
        icon: Facebook,
        color: "from-blue-600 to-blue-500",
        bgColor: "bg-blue-600"
    },
    twitter: {
        name: "X (Twitter)",
        icon: Twitter,
        color: "from-gray-900 to-gray-800",
        bgColor: "bg-black"
    },
    linkedin: {
        name: "LinkedIn",
        icon: Linkedin,
        color: "from-blue-700 to-blue-600",
        bgColor: "bg-blue-700"
    },
    youtube: {
        name: "YouTube",
        icon: Youtube,
        color: "from-red-600 to-red-500",
        bgColor: "bg-red-600"
    },
    tiktok: {
        name: "TikTok",
        icon: () => <span className="text-lg font-bold">T</span>,
        color: "from-pink-500 via-black to-cyan-400",
        bgColor: "bg-black"
    },
};

function formatLastSync(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function IntegrationsList({ workspaceId }: IntegrationsListProps) {
    const { accounts, loading, refetch } = useAccounts();
    const [syncing, setSyncing] = useState<string | null>(null);

    const handleSync = async (account: any) => {
        setSyncing(account.id);
        try {
            const response = await fetch(`/api/accounts/${account.id}/sync-posts`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Sync failed');
            toast.success(`Synced ${account.platform} successfully`);
            refetch();
        } catch (error) {
            toast.error('Failed to sync account');
            console.error(error);
        } finally {
            setSyncing(null);
        }
    };

    const connectedPlatforms = new Set(accounts.map(acc => acc.platform.toLowerCase()));

    // Connected accounts from API
    const connected = accounts.filter(acc => acc.is_active);

    // Available platforms are those in config NOT in connected list
    // Note: This logic assumes one account per platform per workspace. 
    // If multiple accounts per platform are allowed, 'available' should always show all supported platforms or a 'Add new' button.
    // For now, let's assume we list unconnected platforms as recommendations.
    // We allow multiple accounts per platform, so show all supported platforms in the 'Add' section
    const available = Object.keys(platformConfig);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
                <h3 className="font-semibold text-secondary-900">Connected Channels</h3>
                <p className="text-sm text-secondary-500 mt-1">
                    Manage your social media platform connections
                </p>
            </div>

            {/* Connected Integrations */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-secondary-700">
                        Active Connections ({connected.length})
                    </h4>
                    <Link href="/x">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                            Manage All
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                    </Link>
                </div>

                {connected.length === 0 ? (
                    <div className="text-center py-8 bg-secondary-50 rounded-xl">
                        <AlertCircle className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
                        <p className="text-secondary-600 font-medium">No connections yet</p>
                        <p className="text-sm text-secondary-500 mt-1">
                            Connect a social platform to get started
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {connected.map((account) => {
                            const config = platformConfig[account.platform.toLowerCase() as keyof typeof platformConfig];
                            const Icon = config?.icon || AlertCircle;

                            return (
                                <div
                                    key={account.id}
                                    className="flex items-center justify-between p-4 bg-white border border-secondary-100 rounded-xl hover:border-secondary-200 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-11 w-11 rounded-xl flex items-center justify-center text-white",
                                            config?.bgColor || "bg-secondary-500"
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-secondary-900">
                                                    {config?.name || account.platform}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-secondary-500">
                                                <span>{account.account_name}</span>
                                                {account.last_synced_at && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Synced {formatLastSync(account.last_synced_at)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSync(account)}
                                            disabled={syncing === account.id}
                                            className="h-9 px-3"
                                        >
                                            <RefreshCw className={cn(
                                                "h-4 w-4 mr-2",
                                                syncing === account.id && "animate-spin"
                                            )} />
                                            Sync
                                        </Button>
                                        <Link href={`/x/settings/${account.id}`}>
                                            <Button variant="outline" size="sm" className="h-9 text-secondary-600 hover:text-red-600 hover:bg-red-50 border-secondary-200">
                                                Settings
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Available Platforms */}
            <div className="pt-4 border-t border-secondary-100">
                <h4 className="text-sm font-medium text-secondary-700 mb-3">
                    Connect New Channel
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {available.map((platformKey) => {
                        const config = platformConfig[platformKey as keyof typeof platformConfig];
                        const Icon = config?.icon || AlertCircle;

                        return (
                            <div
                                key={platformKey}
                                className="flex items-center justify-between p-3 bg-secondary-50 border border-secondary-100 rounded-xl hover:bg-secondary-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center text-white opacity-60",
                                        config?.bgColor || "bg-secondary-500"
                                    )}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-secondary-700">
                                            {config?.name || platformKey}
                                        </p>
                                        <p className="text-xs text-secondary-500">Not connected</p>
                                    </div>
                                </div>

                                <Link href={`/api/auth/connect?platform=${platformKey}&workspaceId=${workspaceId}`}>
                                    <Button size="sm" variant="outline" className="h-8">
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Connect
                                    </Button>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Tip */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Head to the{" "}
                    <Link href="/x" className="font-medium underline hover:no-underline">
                        Accounts page
                    </Link>
                    {" "}for full control over your connected social media profiles.
                </p>
            </div>
        </div>
    );
}
