"use client";

import { PlatformPreviewCard } from './platform-preview-card';
import type { Platform } from '@/types';
import type { MediaFile } from './unified-post-composer';

type PlatformPreviewsProps = {
    platforms: Platform[];
    baseContent: string;
    platformContent: Record<Platform, string>;
    media: MediaFile[];
    onContentChange: (platform: Platform, content: string) => void;
    onAIRefine: (platform: Platform, instruction: string) => void;
};

export function PlatformPreviews({
    platforms,
    baseContent,
    platformContent,
    media,
    onContentChange,
    onAIRefine,
}: PlatformPreviewsProps) {
    if (platforms.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium text-secondary-900">Platform Previews</h3>
                <p className="mt-1 text-xs text-secondary-500">
                    See how your content will look on each platform. Click to edit individually.
                </p>
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
