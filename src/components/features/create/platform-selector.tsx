"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Platform } from '@/types';
import { Instagram, Twitter, Linkedin, Youtube, Facebook } from 'lucide-react';

type PlatformSelectorProps = {
    selectedPlatforms: Platform[];
    onToggle: (platform: Platform) => void;
};

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
    ];

export function PlatformSelector({ selectedPlatforms, onToggle }: PlatformSelectorProps) {
    return (
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-900">Select Platforms</h3>
                <p className="mt-1 text-xs text-secondary-500">
                    Choose where you want to publish this content
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);

                    return (
                        <Button
                            key={platform.id}
                            onClick={() => onToggle(platform.id)}
                            variant={isSelected ? 'primary' : 'outline'}
                            className={cn(
                                "gap-2 transition-all duration-200",
                                isSelected
                                    ? `bg-gradient-to-r ${platform.gradient} text-white border-transparent hover:opacity-90`
                                    : "border-secondary-300 hover:border-secondary-400 hover:bg-secondary-50"
                            )}
                        >
                            <Icon className={cn(
                                "h-4 w-4",
                                isSelected ? "text-white" : platform.color
                            )} />
                            {platform.name}
                        </Button>
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
