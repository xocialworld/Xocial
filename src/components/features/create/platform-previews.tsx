"use client";

import { PlatformPreviewCard } from './platform-preview-card';
import type { Platform, MediaFile } from '@/types';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

type PlatformPreviewsProps = {
    platforms: Platform[];
    baseContent: string;
    platformContent: Record<Platform, string>;
    media: MediaFile[];
    onContentChange: (platform: Platform, content: string) => void;
    onAIRefine: (platform: Platform, instruction: string) => void;
    onClearAI: () => void;
};

export function PlatformPreviews({
    platforms,
    baseContent,
    platformContent,
    media,
    onContentChange,
    onAIRefine,
    onClearAI,
}: PlatformPreviewsProps) {
    if (platforms.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-secondary-900">Platform Previews</h3>
                    <p className="mt-1 text-xs text-secondary-500">
                        See how your content will look on each platform. Click to edit individually.
                    </p>
                </div>
                {Object.keys(platformContent).length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAI}
                        className="text-secondary-500 hover:text-secondary-900"
                    >
                        <RotateCcw className="mr-2 h-3 w-3" />
                        Revert to Original
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {platforms.map((platform) => (
                    <PlatformPreviewCard
                        key={platform}
                        platform={platform}
                        content={platformContent[platform] || baseContent}
                        media={media}
                        onChange={(content) => onContentChange(platform, content)}
                        onAIRefine={(instruction) => onAIRefine(platform, instruction)}
                    />
                ))}
            </div>
        </div>
    );
}
