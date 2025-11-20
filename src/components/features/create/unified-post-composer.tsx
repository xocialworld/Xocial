"use client";

import { useState, useCallback } from 'react';
import { ComposerInput } from './composer-input';
import { PlatformSelector } from './platform-selector';
import { PlatformPreviews } from './platform-previews';
import { MediaUploadZone } from './media-upload-zone';
import { SchedulingControls } from './scheduling-controls';
import type { Platform } from '@/types';
import { toast } from 'sonner';

export type CreateContent = {
    text: string;
    platforms: Platform[];
    media: MediaFile[];
    platformContent: Record<Platform, string>; // Platform-specific generated content
};

export type MediaFile = {
    id: string;
    url: string;
    type: 'image' | 'video';
    name: string;
    size: number;
};

export type AIGenerationOptions = {
    tone?: string;
    audience?: string;
    style?: string;
    length?: string;
};

export function UnifiedPostComposer() {
    // Core content state
    const [content, setContent] = useState<CreateContent>({
        text: '',
        platforms: [],
        media: [],
        platformContent: {} as Record<Platform, string>,
    });

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [showMediaUpload, setShowMediaUpload] = useState(false);
    const [aiOptions, setAIOptions] = useState<AIGenerationOptions>({});

    // Handle text input changes
    const handleTextChange = useCallback((text: string) => {
        setContent(prev => ({ ...prev, text }));
    }, []);

    // Handle platform selection
    const handlePlatformToggle = useCallback((platform: Platform) => {
        setContent(prev => {
            const platforms = prev.platforms.includes(platform)
                ? prev.platforms.filter(p => p !== platform)
                : [...prev.platforms, platform];
            return { ...prev, platforms };
        });
    }, []);

    // Handle AI generation
    const handleAIGenerate = useCallback(async () => {
        if (!content.text.trim()) {
            toast.error('Please write a brief or caption first');
            return;
        }

        if (content.platforms.length === 0) {
            toast.error('Please select at least one platform');
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brief: content.text,
                    platforms: content.platforms,
                    ...aiOptions,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate content');
            }

            const data = await response.json();

            // Update platform-specific content
            const platformContent: Record<Platform, string> = {} as Record<Platform, string>;
            content.platforms.forEach(platform => {
                platformContent[platform] = data.content[platform] || content.text;
            });

            setContent(prev => ({ ...prev, platformContent }));
            toast.success('Content generated successfully! ✨');
        } catch (error) {
            console.error('AI generation error:', error);
            toast.error('Failed to generate content. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [content.text, content.platforms, aiOptions]);

    // Handle AI refine for specific platform
    const handleAIRefine = useCallback(async (platform: Platform, instruction: string) => {
        const currentContent = content.platformContent[platform] || content.text;

        try {
            const response = await fetch('/api/ai/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentCaption: currentContent,
                    platform,
                    instruction,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to refine content');
            }

            const data = await response.json();

            setContent(prev => ({
                ...prev,
                platformContent: {
                    ...prev.platformContent,
                    [platform]: data.refinedContent,
                },
            }));

            toast.success(`${platform} content refined`);
        } catch (error) {
            console.error('AI refine error:', error);
            toast.error('Failed to refine content');
        }
    }, [content]);

    // Handle media upload
    const handleMediaUpload = useCallback(async (files: File[]) => {
        const uploadedMedia: MediaFile[] = [];

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/media/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }

                const data = await response.json();

                uploadedMedia.push({
                    id: data.id,
                    url: data.url,
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    name: file.name,
                    size: file.size,
                });
            } catch (error) {
                console.error(`Upload error for ${file.name}:`, error);
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        if (uploadedMedia.length > 0) {
            setContent(prev => ({
                ...prev,
                media: [...prev.media, ...uploadedMedia],
            }));
            toast.success(`${uploadedMedia.length} file(s) uploaded`);
        }
    }, []);

    // Handle media removal
    const handleMediaRemove = useCallback((mediaId: string) => {
        setContent(prev => ({
            ...prev,
            media: prev.media.filter(m => m.id !== mediaId),
        }));
    }, []);

    // Handle platform-specific content edit
    const handlePlatformContentChange = useCallback((platform: Platform, text: string) => {
        setContent(prev => ({
            ...prev,
            platformContent: {
                ...prev.platformContent,
                [platform]: text,
            },
        }));
    }, []);

    // Calculate if AI can be used (enough content)
    const canUseAI = content.text.trim().length >= 20 && content.platforms.length > 0;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Main Composer Input */}
            <ComposerInput
                value={content.text}
                onChange={handleTextChange}
                onAIGenerate={handleAIGenerate}
                onMediaUploadToggle={() => setShowMediaUpload(!showMediaUpload)}
                aiOptions={aiOptions}
                onAIOptionsChange={setAIOptions}
                canUseAI={canUseAI}
                isGenerating={isGenerating}
                showMediaUpload={showMediaUpload}
            />

            {/* Platform Selector */}
            <PlatformSelector
                selectedPlatforms={content.platforms}
                onToggle={handlePlatformToggle}
            />

            {/* Platform Previews (only show if platforms selected) */}
            {content.platforms.length > 0 && (
                <PlatformPreviews
                    platforms={content.platforms}
                    baseContent={content.text}
                    platformContent={content.platformContent}
                    media={content.media}
                    onContentChange={handlePlatformContentChange}
                    onAIRefine={handleAIRefine}
                />
            )}

            {/* Media Upload Zone */}
            {showMediaUpload && (
                <MediaUploadZone
                    media={content.media}
                    onUpload={handleMediaUpload}
                    onRemove={handleMediaRemove}
                />
            )}

            {/* Scheduling Controls (only show if we have content) */}
            {(content.text.trim() || content.media.length > 0) && (
                <SchedulingControls
                    content={content}
                    onDraft={() => console.log('Save draft')}
                    onSchedule={() => console.log('Schedule')}
                    onPublish={() => console.log('Publish')}
                />
            )}
        </div>
    );
}
