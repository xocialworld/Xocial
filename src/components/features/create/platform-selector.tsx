"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Platform } from '@/types';
import { Instagram, Twitter, Linkedin, Youtube, Facebook } from 'lucide-react';

type PlatformSelectorProps = {
    selectedPlatforms: Platform[];
    onToggle: (platform: Platform) => void;
    connectedPlatforms: Platform[];
    isLoading?: boolean;
    onRefresh?: () => void;
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
    color: string;
    gradient: string;
}> = [
        {
            id: 'instagram',
            name: 'Instagram',
            icon: Instagram,
            color: 'text-pink-600',
            gradient: 'from-pink-500 to-purple-600',
        },
        {
            id: 'facebook',
            name: 'Facebook',
            icon: Facebook,
            color: 'text-blue-600',
            gradient: 'from-blue-600 to-blue-700',
        },
        {
            id: 'twitter',
            name: 'Twitter',
            icon: Twitter,
            color: 'text-sky-500',
            gradient: 'from-sky-400 to-sky-600',
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            icon: Linkedin,
            color: 'text-blue-700',
            gradient: 'from-blue-600 to-blue-800',
        },
        {
            id: 'youtube',
            name: 'YouTube',
            icon: Youtube,
            color: 'text-red-600',
            gradient: 'from-red-600 to-red-700',
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: TikTokIcon,
            color: 'text-black',
            gradient: 'from-black to-gray-800',
        },
    ];

export function PlatformSelector({
    selectedPlatforms,
    onToggle,
    connectedPlatforms,
    isLoading = false,
    onRefresh
}: PlatformSelectorProps) {
    return (
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-secondary-900">Select Platforms</h3>
                    <p className="mt-1 text-xs text-secondary-500">
                        Choose where you want to publish this content
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={cn("mr-1", isLoading && "animate-spin")}
                            >
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                            Sync
                        </Button>
                    )}
                    {isLoading && !onRefresh && (
                        <span className="text-xs text-secondary-400 animate-pulse">Loading accounts...</span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);
                    const isConnected = connectedPlatforms.some(
                        p => p.toLowerCase() === platform.id.toLowerCase()
                    );
                    const isDisabled = isLoading;

                    return (
                        <div key={platform.id} className="relative group">
                            <Button
                                type="button"
                                onClick={() => !isDisabled && onToggle(platform.id)}
                                variant={isSelected ? 'primary' : 'outline'}
                                disabled={isDisabled}
                                className={cn(
                                    "gap-2 transition-all duration-200",
                                    isSelected
                                        ? `bg-gradient-to-r ${platform.gradient} text-white border-transparent hover:opacity-90`
                                        : "border-secondary-300 hover:border-secondary-400 hover:bg-secondary-50",
                                    !isConnected && !isSelected && "opacity-70 border-dashed",
                                    isDisabled && "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                <Icon className={cn(
                                    "h-4 w-4",
                                    isSelected ? "text-white" : platform.color,
                                    !isConnected && !isSelected && "text-secondary-400"
                                )} />
                                {platform.name}
                            </Button>
                            {!isConnected && !isLoading && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-secondary-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    Not connected (Draft only)
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
                    Select at least one platform to continue
                </p>
            )}
        </div>
    );
}
