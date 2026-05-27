'use client';

import { useMemo } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Platform, MediaFile } from '@/types';
import { getCompatiblePlatforms } from '@/lib/platforms/capabilities';

interface ContentCompatibilityWarningProps {
    selectedPlatforms: Platform[];
    media: MediaFile[];
    hasText: boolean;
    onRemovePlatform: (platform: Platform) => void;
}

export function ContentCompatibilityWarning({
    selectedPlatforms,
    media,
    hasText,
    onRemovePlatform,
}: ContentCompatibilityWarningProps) {
    const hasImages = media.some(m => m.type === 'image');
    const hasVideos = media.some(m => m.type === 'video');
    const imageCount = media.filter(m => m.type === 'image').length;
    const videoCount = media.filter(m => m.type === 'video').length;

    const { incompatible } = useMemo(() => {
        return getCompatiblePlatforms(selectedPlatforms, {
            hasText,
            hasImages,
            hasVideos,
            imageCount,
            videoCount,
        });
    }, [selectedPlatforms, hasText, hasImages, hasVideos, imageCount, videoCount]);

    // Show nothing if no warnings needed
    if (incompatible.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Incompatible Platforms Warning */}
            {incompatible.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-amber-800">
                                Content not compatible with all platforms
                            </h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Some platforms can&apos;t publish the current content type.
                                Remove them or adjust your content.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {incompatible.map(({ platform, reason }) => {
                            const platformInfo = getPlatformGuidance(platform, hasImages, hasVideos);

                            return (
                                <div
                                    key={platform}
                                    className="flex items-start justify-between gap-3 bg-white rounded-md border border-amber-100 p-3"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium capitalize text-amber-900">
                                                {platform}
                                            </span>
                                        </div>
                                        <p className="text-sm text-amber-700 mt-1">
                                            {reason}
                                        </p>
                                        {platformInfo && (
                                            <div className="mt-2 flex items-start gap-2 text-xs text-amber-600">
                                                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                                <span>{platformInfo}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRemovePlatform(platform)}
                                        className="flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Remove
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-xs text-amber-600 border-t border-amber-200 pt-3">
                        <strong>Tip:</strong> You can still publish to the compatible platforms.
                        Remove the incompatible ones above, or upload the required content type.
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Get platform-specific guidance for the user
 */
function getPlatformGuidance(
    platform: Platform,
    hasImages: boolean,
    hasVideos: boolean
): string | null {
    switch (platform) {
        case 'youtube':
            if (hasImages && !hasVideos) {
                return 'YouTube only accepts video uploads via API. Community Posts (which support images) cannot be created through the API. To post to YouTube, upload a video file instead.';
            }
            if (!hasImages && !hasVideos) {
                return 'YouTube requires a video file. Text-only posts are not supported. Upload a video to post to YouTube.';
            }
            return null;

        case 'tiktok':
            if (hasImages && !hasVideos) {
                return 'TikTok only accepts video uploads. Photo mode posts have limited API support. Upload a video to post to TikTok.';
            }
            if (!hasImages && !hasVideos) {
                return 'TikTok requires a video file. Upload a video to post to TikTok.';
            }
            return null;

        case 'instagram':
            if (!hasImages && !hasVideos) {
                return 'Instagram requires at least one image or video. Upload media to post to Instagram.';
            }
            return null;

        default:
            return null;
    }
}
