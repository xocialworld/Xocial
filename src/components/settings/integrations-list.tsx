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
    XCircle,
    AlertCircle,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

// Mock data - in production, fetch from API
const mockIntegrations = [
    { id: "1", platform: "instagram", connected: true, account: "@xocial_app", lastSync: new Date(Date.now() - 1000 * 60 * 30) },
    { id: "2", platform: "youtube", connected: true, account: "Xocial Official", lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    { id: "3", platform: "facebook", connected: false },
    { id: "4", platform: "twitter", connected: false },
    { id: "5", platform: "linkedin", connected: false },
    { id: "6", platform: "tiktok", connected: false },
];

function formatLastSync(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function IntegrationsList({ workspaceId }: IntegrationsListProps) {
    const [syncing, setSyncing] = useState<string | null>(null);

    const handleSync = async (id: string) => {
        setSyncing(id);
        // Simulate sync
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSyncing(null);
    };

    const connected = mockIntegrations.filter(i => i.connected);
    const available = mockIntegrations.filter(i => !i.connected);

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
                        {connected.map((integration) => {
                            const config = platformConfig[integration.platform as keyof typeof platformConfig];
                            const Icon = config?.icon || AlertCircle;

                            return (
                                <div
                                    key={integration.id}
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
                                                    {config?.name || integration.platform}
                                                </p>
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Connected
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-secondary-500">
                                                <span>{integration.account}</span>
                                                {integration.lastSync && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Synced {formatLastSync(integration.lastSync)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSync(integration.id)}
                                            disabled={syncing === integration.id}
                                            className="h-9 px-3"
                                        >
                                            <RefreshCw className={cn(
                                                "h-4 w-4 mr-2",
                                                syncing === integration.id && "animate-spin"
                                            )} />
                                            Sync
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                            Disconnect
                                        </Button>
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
                    Available Platforms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {available.map((integration) => {
                        const config = platformConfig[integration.platform as keyof typeof platformConfig];
                        const Icon = config?.icon || AlertCircle;

                        return (
                            <div
                                key={integration.id}
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
                                            {config?.name || integration.platform}
                                        </p>
                                        <p className="text-xs text-secondary-500">Not connected</p>
                                    </div>
                                </div>

                                <Button size="sm" variant="outline" className="h-8">
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Connect
                                </Button>
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
