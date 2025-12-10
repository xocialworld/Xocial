/**
 * Platform Content Type Configuration
 * Defines what types of content each platform supports
 */

import type { Platform } from '@/types';

export interface PlatformContentCapabilities {
    supportsTextOnly: boolean;
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsMultipleImages: boolean; // Carousel/Album
    maxImages: number;
    maxVideos: number;
    maxTextLength: number;
    requiresMedia: boolean;
    notes?: string[];
}

export const PLATFORM_CAPABILITIES: Record<Platform, PlatformContentCapabilities> = {
    twitter: {
        supportsTextOnly: true,
        supportsImages: true,
        supportsVideos: true,
        supportsMultipleImages: true,
        maxImages: 4,
        maxVideos: 1,
        maxTextLength: 280,
        requiresMedia: false,
        notes: [
            'Maximum 4 images or 1 video per post',
            'Videos up to 2:20 for most accounts',
            '⚠️ Image uploads require Twitter API access being updated (Q1 2025)',
        ],
    },

    facebook: {
        supportsTextOnly: true,
        supportsImages: true,
        supportsVideos: true,
        supportsMultipleImages: true,
        maxImages: 10,
        maxVideos: 1,
        maxTextLength: 63206,
        requiresMedia: false,
        notes: [
            'Up to 10 images in a photo album',
            'Videos can be scheduled for later',
            'Supports link previews',
        ],
    },

    instagram: {
        supportsTextOnly: false,
        supportsImages: true,
        supportsVideos: true,
        supportsMultipleImages: true,
        maxImages: 10,
        maxVideos: 1,
        maxTextLength: 2200,
        requiresMedia: true,
        notes: [
            'Media is required for all posts',
            'Up to 10 images in a carousel',
            'Videos must be 3-60 seconds for Reels',
            'Images should be square (1:1) or portrait (4:5)',
        ],
    },

    linkedin: {
        supportsTextOnly: true,
        supportsImages: true,
        supportsVideos: true,
        supportsMultipleImages: true,
        maxImages: 9,
        maxVideos: 1,
        maxTextLength: 3000,
        requiresMedia: false,
        notes: [
            'Professional content performs best',
            'Up to 9 images per post',
            'Articles can include external links',
        ],
    },

    youtube: {
        supportsTextOnly: false,
        supportsImages: false, // YouTube API doesn't support image posts
        supportsVideos: true,
        supportsMultipleImages: false,
        maxImages: 0,
        maxVideos: 1,
        maxTextLength: 5000, // For description
        requiresMedia: true,
        notes: [
            '⚠️ Only video uploads are supported via API',
            'Images and text-only posts are NOT supported',
            'Community Posts cannot be created via API',
            'For Shorts: add #Shorts to description, video must be < 60 sec with 9:16 aspect ratio',
            'Title limited to 100 characters',
        ],
    },

    tiktok: {
        supportsTextOnly: false,
        supportsImages: false, // TikTok photos are a newer feature with limited API support
        supportsVideos: true,
        supportsMultipleImages: false,
        maxImages: 0,
        maxVideos: 1,
        maxTextLength: 2200,
        requiresMedia: true,
        notes: [
            'Only video uploads are supported',
            'Videos should be 9:16 aspect ratio',
            'Duration: 1 second to 10 minutes',
            'Photo mode posts have limited API support',
        ],
    },
};

/**
 * Check if a platform can handle the given content
 */
export function canPlatformHandleContent(
    platform: Platform,
    options: {
        hasText: boolean;
        hasImages: boolean;
        hasVideos: boolean;
        imageCount?: number;
        videoCount?: number;
    }
): { canHandle: boolean; reason?: string } {
    const caps = PLATFORM_CAPABILITIES[platform];

    if (!caps) {
        return { canHandle: false, reason: 'Unknown platform' };
    }

    // Check if media is required
    if (caps.requiresMedia && !options.hasImages && !options.hasVideos) {
        return {
            canHandle: false,
            reason: `${platform} requires media. Please add an image or video.`
        };
    }

    // Check text-only support
    if (options.hasText && !options.hasImages && !options.hasVideos) {
        if (!caps.supportsTextOnly) {
            return {
                canHandle: false,
                reason: `${platform} doesn't support text-only posts. Please add media.`
            };
        }
    }

    // Check image support
    if (options.hasImages && !caps.supportsImages) {
        return {
            canHandle: false,
            reason: `${platform} doesn't support image posts via API. Please add a video instead.`
        };
    }

    // Check video support
    if (options.hasVideos && !caps.supportsVideos) {
        return {
            canHandle: false,
            reason: `${platform} doesn't support video posts.`
        };
    }

    // Check image count
    if (options.imageCount && options.imageCount > caps.maxImages) {
        return {
            canHandle: false,
            reason: `${platform} only supports up to ${caps.maxImages} images. You have ${options.imageCount}.`
        };
    }

    // Check video count
    if (options.videoCount && options.videoCount > caps.maxVideos) {
        return {
            canHandle: false,
            reason: `${platform} only supports up to ${caps.maxVideos} video(s). You have ${options.videoCount}.`
        };
    }

    return { canHandle: true };
}

/**
 * Get platforms that can handle the given content
 */
export function getCompatiblePlatforms(
    selectedPlatforms: Platform[],
    options: {
        hasText: boolean;
        hasImages: boolean;
        hasVideos: boolean;
        imageCount?: number;
        videoCount?: number;
    }
): { compatible: Platform[]; incompatible: { platform: Platform; reason: string }[] } {
    const compatible: Platform[] = [];
    const incompatible: { platform: Platform; reason: string }[] = [];

    for (const platform of selectedPlatforms) {
        const result = canPlatformHandleContent(platform, options);
        if (result.canHandle) {
            compatible.push(platform);
        } else {
            incompatible.push({ platform, reason: result.reason || 'Content not supported' });
        }
    }

    return { compatible, incompatible };
}

/**
 * Get user-friendly description of platform capabilities
 */
export function getPlatformCapabilitiesDescription(platform: Platform): string[] {
    const caps = PLATFORM_CAPABILITIES[platform];
    if (!caps) return [];

    const descriptions: string[] = [];

    if (caps.supportsTextOnly) {
        descriptions.push('✅ Text-only posts');
    } else {
        descriptions.push('❌ Text-only posts (requires media)');
    }

    if (caps.supportsImages) {
        descriptions.push(`✅ Images (max ${caps.maxImages})`);
    } else {
        descriptions.push('❌ Image posts');
    }

    if (caps.supportsVideos) {
        descriptions.push(`✅ Videos (max ${caps.maxVideos})`);
    } else {
        descriptions.push('❌ Video posts');
    }

    if (caps.notes) {
        descriptions.push(...caps.notes);
    }

    return descriptions;
}
