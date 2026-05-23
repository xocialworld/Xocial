"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Platform } from '@/types';
import { Instagram, Twitter, Linkedin, Youtube, Facebook, RefreshCw } from 'lucide-react';

type PlatformSelectorProps = {
    selectedPlatforms: Platform[];
    onToggle: (platform: Platform) => void;
    connectedPlatforms: Platform[];
    accounts?: Account[];
    accountSelections?: Partial<Record<Platform, string>>;
    onAccountSelect?: (platform: Platform, accountId: string) => void;
    isLoading?: boolean;
    onRefresh?: () => void;
};

type Account = {
    id: string;
    platform: Platform;
    account_name: string;
    account_avatar?: string;
    is_active: boolean;
};

// TikTok SVG Icon component
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

const PLATFORMS: Array<{
    id: Platform;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
}> = [
        {
            id: 'instagram',
            name: 'Instagram',
            icon: Instagram,
            gradient: 'from-pink-500 to-purple-600',
        },
        {
            id: 'facebook',
            name: 'Facebook',
            icon: Facebook,
            gradient: 'from-blue-600 to-blue-700',
        },
        {
            id: 'twitter',
            name: 'Twitter',
            icon: Twitter,
            gradient: 'from-sky-400 to-sky-600',
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            icon: Linkedin,
            gradient: 'from-blue-600 to-blue-800',
        },
        {
            id: 'youtube',
            name: 'YouTube',
            icon: Youtube,
            gradient: 'from-red-600 to-red-700',
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: TikTokIcon,
            gradient: 'from-black to-gray-800',
        },
    ];

export function PlatformSelector({
    selectedPlatforms,
    onToggle,
    connectedPlatforms,
    accounts = [],
    accountSelections = {},
    onAccountSelect,
    isLoading = false,
    onRefresh
}: PlatformSelectorProps) {
    return (
        <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-secondary-900">Destinations</h3>
                    <p className="mt-1 text-xs text-secondary-500">
                        Choose workspace accounts for this post.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="h-8 px-2 text-xs text-secondary-500 hover:text-secondary-900"
                            title="Refresh connected accounts"
                        >
                            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                    )}
                    {isLoading && !onRefresh && (
                        <span className="text-xs text-secondary-400 animate-pulse">Loading accounts...</span>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);
                    const platformAccounts = accounts.filter(
                        (account) => account.platform?.toLowerCase() === platform.id.toLowerCase()
                    );
                    const isConnected = connectedPlatforms.some(
                        p => p.toLowerCase() === platform.id.toLowerCase()
                    ) || platformAccounts.length > 0;
                    const isDisabled = isLoading;
                    const selectedAccountId = accountSelections[platform.id] || '';

                    return (
                        <div
                            key={platform.id}
                            className={cn(
                                "rounded-lg border p-3 transition-all",
                                isSelected
                                    ? "border-primary-300 bg-primary-50/70 shadow-sm"
                                    : "border-secondary-200 bg-white hover:border-secondary-300",
                                isDisabled && "opacity-60"
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => !isDisabled && onToggle(platform.id)}
                                disabled={isDisabled}
                                className={cn(
                                    "flex w-full items-center justify-between gap-3 text-left",
                                    isDisabled && "cursor-not-allowed"
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    <span className={cn(
                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                                        platform.gradient
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-secondary-900">
                                            {platform.name}
                                        </span>
                                        <span className="block text-xs text-secondary-500">
                                            {platformAccounts.length > 0
                                                ? `${platformAccounts.length} account${platformAccounts.length > 1 ? 's' : ''} connected`
                                                : 'Draft only until connected'}
                                        </span>
                                    </span>
                                </span>
                                <Badge variant={isSelected ? 'primary' : isConnected ? 'success' : 'outline'} size="sm">
                                    {isSelected ? 'Selected' : isConnected ? 'Connected' : 'No account'}
                                </Badge>
                            </button>

                            {isSelected && platformAccounts.length > 0 && (
                                <div className="mt-3 space-y-2 border-t border-primary-100 pt-3">
                                    {platformAccounts.map((account) => {
                                        const checked = selectedAccountId === account.id;
                                        return (
                                            <button
                                                key={account.id}
                                                type="button"
                                                onClick={() => onAccountSelect?.(platform.id, account.id)}
                                                className={cn(
                                                    "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                                                    checked
                                                        ? "border-primary-300 bg-white"
                                                        : "border-secondary-200 bg-white/70 hover:bg-white"
                                                )}
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={account.account_avatar} alt={account.account_name} />
                                                    <AvatarFallback className="text-xs">
                                                        {account.account_name?.slice(0, 1).toUpperCase() || platform.name.slice(0, 1)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-secondary-900">
                                                        {account.account_name}
                                                    </span>
                                                    <span className={cn(
                                                        "block text-xs",
                                                        account.is_active ? "text-emerald-600" : "text-amber-600"
                                                    )}>
                                                        {account.is_active ? 'Ready to publish' : 'Reconnect before publishing'}
                                                    </span>
                                                </span>
                                                <span className={cn(
                                                    "h-3 w-3 rounded-full border",
                                                    checked ? "border-primary-600 bg-primary-600" : "border-secondary-300"
                                                )} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedPlatforms.length > 0 && (
                <p className="mt-3 text-xs text-secondary-600">
                    {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} selected
                </p>
            )}

            {selectedPlatforms.length === 0 && (
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Select at least one destination to continue.
                </p>
            )}
        </div>
    );
}
