"use client";

import { useState, useCallback, useEffect } from 'react';
import { ComposerInput } from './composer-input';
import { PlatformSelector } from './platform-selector';
import { PlatformPreviews } from './platform-previews';
import { MediaLibraryModal } from './media-library-modal';
import { SchedulingControls } from './scheduling-controls';
import type { Platform, MediaFile } from '@/types';
import { toast } from 'sonner';
import { useAccounts } from '@/app/(dashboard)/x/hooks/useAccounts';
import { logger } from '@/lib/logger';

export type CreateContent = {
    text: string;
    platforms: Platform[];
    media: MediaFile[];
    platformContent: Record<Platform, string>; // Platform-specific generated content
};

export type AIGenerationOptions = {
    tone?: string;
    audience?: string;
    style?: string;
    length?: string;
    model?: string;
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
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [aiOptions, setAIOptions] = useState<AIGenerationOptions>({});

    // Shared account state via React Query + Supabase realtime
    const { accounts: connectedAccounts, loading: loadingAccounts, error, refetch } = useAccounts();

    // Real-time verification + error logging on mount and window focus
    useEffect(() => {
        if (error) {
            const message = typeof error === 'string' ? error : (error as any)?.message || 'Failed to load connected accounts';
            toast.error(message);
            logger.error('Connection status verification failed', undefined, {
                action: 'fetch_accounts',
            });
        }

        const onFocus = () => {
            refetch();
        };

        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [error, refetch]);

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
                    prompt: content.text,
                    platforms: content.platforms,
                    tone: aiOptions.tone,
                    style: aiOptions.style,
                    audience: aiOptions.audience,
                    length: aiOptions.length,
                    model: aiOptions.model,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || errorData.message || 'Failed to generate content';
                throw new Error(errorMessage);
            }

            const apiResponse = await response.json();
            const data = apiResponse?.data || {};

            console.log('AI Generation Result:', {
                requested: aiOptions,
                generatedSummary: data.summary,
                platformContent: data.platformContent
            });

            // Update platform-specific content from API response
            const platformContent: Partial<Record<Platform, string>> = {};
            let hasGeneratedContent = false;

            if (data.platformContent) {
                // Normalize keys from API response to ensure we match our platform IDs
                const normalizedResponse: Record<string, any> = {};
                Object.entries(data.platformContent).forEach(([key, val]) => {
                    const cleanKey = key.toLowerCase().trim();
                    normalizedResponse[cleanKey] = val;
                    
                    // Map fuzzy keys
                     content.platforms.forEach(target => {
                        if (cleanKey.includes(target) && !normalizedResponse[target]) {
                            normalizedResponse[target] = val;
                        }
                    });
                });

                content.platforms.forEach(platform => {
                    // Try exact or fuzzy match
                    let platformData = normalizedResponse[platform];
                    
                    if (!platformData) {
                         const fuzzyKey = Object.keys(normalizedResponse).find(k => k.includes(platform));
                         if (fuzzyKey) platformData = normalizedResponse[fuzzyKey];
                    }

                    if (platformData && platformData.text) {
                        platformContent[platform] = platformData.text;
                        hasGeneratedContent = true;
                    }
                });
            }

            if (!hasGeneratedContent) {
                // Final fallback: If we have any content at all in the data object, try to use it
                if (data.platformContent && Object.values(data.platformContent).length > 0) {
                     const firstValue = Object.values(data.platformContent)[0] as any;
                     if (firstValue && firstValue.text) {
                         content.platforms.forEach(p => {
                             platformContent[p] = firstValue.text;
                         });
                         hasGeneratedContent = true;
                     }
                }
            }

            if (!hasGeneratedContent) {
                toast.warning('AI generated content but it appears empty. Please try again or adjust your prompt.');
                return;
            }

            setContent(prev => ({
                ...prev,
                platformContent: platformContent as Record<Platform, string>
            }));
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
            let newContent = currentContent;

            if (instruction === 'hashtags') {
                const response = await fetch('/api/ai/hashtags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: currentContent,
                        platform,
                        count: 5,
                    }),
                });

                if (!response.ok) throw new Error('Failed to generate hashtags');
                const data = await response.json();
                const hashtags = data.data.hashtags || [];
                if (hashtags.length > 0) {
                    newContent = `${currentContent}\n\n${hashtags.map((t: string) => `#${t}`).join(' ')}`;
                }
            } else {
                const response = await fetch('/api/ai/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: currentContent,
                        platform,
                        refinementType: instruction,
                    }),
                });

                if (!response.ok) throw new Error('Failed to refine content');
                const data = await response.json();
                newContent = data.data.text;
            }

            setContent(prev => ({
                ...prev,
                platformContent: {
                    ...prev.platformContent,
                    [platform]: newContent,
                },
            }));

            toast.success(`${platform} content updated`);
        } catch (error) {
            console.error('AI refine error:', error);
            toast.error('Failed to update content');
        }
    }, [content]);

    // Handle clearing AI content (revert to original)
    const handleClearAI = useCallback(() => {
        setContent(prev => ({
            ...prev,
            platformContent: {} as Record<Platform, string>,
        }));
        toast.success('Reverted to original text');
    }, []);

    // Handle media upload
    const handleMediaUpload = useCallback(async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
            let payload: any = null;
            try { payload = await response.json(); } catch { }
            if (!response.ok) {
                const msg = payload?.error || `Failed to upload ${file.name}`;
                throw new Error(msg);
            }
            return {
                id: payload.id,
                url: payload.url,
                type: payload.type,
                name: payload.name,
                size: payload.size,
            } as MediaFile;
        });

        const results = await Promise.allSettled(uploadPromises);
        const succeeded = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<MediaFile>[];
        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

        if (succeeded.length) {
            setContent(prev => ({
                ...prev,
                media: [...prev.media, ...succeeded.map(s => s.value)],
            }));
            toast.success(`${succeeded.length} file(s) uploaded`);
        }
        if (failed.length) {
            const firstError = (failed[0].reason && failed[0].reason.message) || 'Some uploads failed';
            toast.error(firstError);
        }
    }, []);

    // Handle media removal
    const handleMediaRemove = useCallback((mediaId: string) => {
        setContent(prev => ({
            ...prev,
            media: prev.media.filter(m => m.id !== mediaId),
        }));
    }, []);

    // Handle library media selection
    const handleLibrarySelect = useCallback((selectedMedia: MediaFile[]) => {
        setContent(prev => ({
            ...prev,
            media: [...prev.media, ...selectedMedia],
        }));
        toast.success(`${selectedMedia.length} file(s) added from library`);
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

    // Publishing callbacks
    const [isPublishing, setIsPublishing] = useState(false);

    const handleSaveDraft = useCallback(async (accountSelections: Record<Platform, string>) => {
        setIsPublishing(true);
        try {
            const postContent: Record<string, { text: string }> = {};
            content.platforms.forEach(platform => {
                postContent[platform] = {
                    text: content.platformContent[platform] || content.text,
                };
            });

            const mediaPayload = content.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                filename: m.name,
                size: m.size,
            }));

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent,
                    platforms: content.platforms,
                    platformAccounts: accountSelections,
                    status: 'draft',
                    media: mediaPayload,
                    mediaIds: content.media.map(m => m.id),
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                const msg = (err && err.error && err.error.message) || err?.message || 'Failed to save draft';
                throw new Error(msg);
            }

            toast.success('Draft saved successfully!');

            // Reset form
            setContent({
                text: '',
                platforms: [],
                media: [],
                platformContent: {} as Record<Platform, string>,
            });
        } catch (error: any) {
            console.error('Save draft error:', error);
            toast.error(error.message || 'Failed to save draft');
        } finally {
            setIsPublishing(false);
        }
    }, [content]);

    const handleSchedule = useCallback(async (
        accountSelections: Record<Platform, string>,
        scheduledTime: Date
    ) => {
        setIsPublishing(true);
        try {
            const postContent: Record<string, { text: string }> = {};
            content.platforms.forEach(platform => {
                postContent[platform] = {
                    text: content.platformContent[platform] || content.text,
                };
            });

            const mediaPayload = content.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                filename: m.name,
                size: m.size,
            }));

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent,
                    platforms: content.platforms,
                    platformAccounts: accountSelections,
                    status: 'scheduled',
                    scheduled_at: scheduledTime.toISOString(),
                    media: mediaPayload,
                    mediaIds: content.media.map(m => m.id),
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                const msg = (err && err.error && err.error.message) || err?.message || 'Failed to schedule post';
                throw new Error(msg);
            }

            toast.success(`Post scheduled for ${scheduledTime.toLocaleString()}!`);

            // Reset form
            setContent({
                text: '',
                platforms: [],
                media: [],
                platformContent: {} as Record<Platform, string>,
            });
        } catch (error: any) {
            console.error('Schedule error:', error);
            toast.error(error.message || 'Failed to schedule post');
        } finally {
            setIsPublishing(false);
        }
    }, [content]);

    const handlePublish = useCallback(async (accountSelections: Record<Platform, string>) => {
        setIsPublishing(true);
        try {
            const postContent: Record<string, { text: string }> = {};
            content.platforms.forEach(platform => {
                postContent[platform] = {
                    text: content.platformContent[platform] || content.text,
                };
            });

            const mediaPayload = content.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                filename: m.name,
                size: m.size,
            }));

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent,
                    platforms: content.platforms,
                    platformAccounts: accountSelections,
                    status: 'published',
                    media: mediaPayload,
                    mediaIds: content.media.map(m => m.id),
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                const msg = (err && err.error && err.error.message) || err?.message || 'Failed to publish post';
                throw new Error(msg);
            }

            const data = await response.json();
            toast.success('Post published successfully! 🎉');

            // Reset form
            setContent({
                text: '',
                platforms: [],
                media: [],
                platformContent: {} as Record<Platform, string>,
            });
        } catch (error: any) {
            console.error('Publish error:', error);
            toast.error(error.message || 'Failed to publish post');
        } finally {
            setIsPublishing(false);
        }
    }, [content]);

    const handleRequestApproval = useCallback(async (accountSelections: Record<Platform, string>) => {
        setIsPublishing(true);
        try {
            const postContent: Record<string, { text: string }> = {};
            content.platforms.forEach(platform => {
                postContent[platform] = {
                    text: content.platformContent[platform] || content.text,
                };
            });

            const mediaPayload = content.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                filename: m.name,
                size: m.size,
            }));

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent,
                    platforms: content.platforms,
                    platformAccounts: accountSelections,
                    status: 'pending_approval', // This status should trigger the approval workflow
                    media: mediaPayload,
                    mediaIds: content.media.map(m => m.id),
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                const msg = (err && err.error && err.error.message) || err?.message || 'Failed to request approval';
                throw new Error(msg);
            }

            toast.success('Approval requested successfully!');

            // Reset form
            setContent({
                text: '',
                platforms: [],
                media: [],
                platformContent: {} as Record<Platform, string>,
            });
        } catch (error: any) {
            console.error('Request approval error:', error);
            toast.error(error.message || 'Failed to request approval');
        } finally {
            setIsPublishing(false);
        }
    }, [content]);

    const handleMixedPublishSchedule = useCallback(async (
        onlineAccounts: Record<Platform, string>,
        offlineAccounts: Record<Platform, string>,
        scheduledTime: Date
    ) => {
        setIsPublishing(true);
        try {
            const postContent: Record<string, { text: string }> = {};
            content.platforms.forEach(platform => {
                postContent[platform] = {
                    text: content.platformContent[platform] || content.text,
                };
            });

            const mediaPayload = content.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                filename: m.name,
                size: m.size,
            }));

            // 1. Publish to online accounts
            if (Object.keys(onlineAccounts).length > 0) {
                const onlinePlatforms = Object.keys(onlineAccounts) as Platform[];
                const mediaPayload = content.media.map(m => ({
                    id: m.id,
                    url: m.url,
                    type: m.type,
                    filename: m.name,
                    size: m.size,
                }));

                const publishResponse = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: postContent,
                        platforms: onlinePlatforms,
                        platformAccounts: onlineAccounts,
                        status: 'published',
                        media: mediaPayload,
                        mediaIds: content.media.map(m => m.id),
                    }),
                });

                if (!publishResponse.ok) {
                    const err = await publishResponse.json();
                    const msg = (err && err.error && err.error.message) || err?.message || 'Failed to publish to online accounts';
                    throw new Error(msg);
                }
            }

            // 2. Schedule for offline accounts
            if (Object.keys(offlineAccounts).length > 0) {
                const offlinePlatforms = Object.keys(offlineAccounts) as Platform[];
                const scheduleResponse = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: postContent,
                        platforms: offlinePlatforms,
                        platformAccounts: offlineAccounts,
                        status: 'scheduled',
                        scheduled_at: scheduledTime.toISOString(),
                        media: mediaPayload,
                        mediaIds: content.media.map(m => m.id),
                    }),
                });

                if (!scheduleResponse.ok) {
                    const err = await scheduleResponse.json();
                    const msg = (err && err.error && err.error.message) || err?.message || 'Failed to schedule for offline accounts';
                    throw new Error(msg);
                }
            }

            toast.success('Published to online accounts and scheduled for offline ones! 🚀');

            // Reset form
            setContent({
                text: '',
                platforms: [],
                media: [],
                platformContent: {} as Record<Platform, string>,
            });
        } catch (error: any) {
            console.error('Mixed publish/schedule error:', error);
            toast.error(error.message || 'Failed to process request');
        } finally {
            setIsPublishing(false);
        }
    }, [content]);

    // Calculate if AI can be used (enough content)
    const canUseAI = content.text.trim().length >= 20 && content.platforms.length > 0;

    // Derived connected platforms (both active and inactive)
    const connectedPlatforms = Array.from(new Set(
        connectedAccounts
            .map(acc => acc.platform?.toLowerCase())
            .filter(Boolean)
    )) as Platform[];

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
                media={content.media}
                onUpload={handleMediaUpload}
                onRemove={handleMediaRemove}
                onBrowseLibrary={() => setShowMediaLibrary(true)}
            />

            {/* Platform Selector */}
            <PlatformSelector
                selectedPlatforms={content.platforms}
                onToggle={handlePlatformToggle}
                connectedPlatforms={connectedPlatforms}
                isLoading={loadingAccounts}
                onRefresh={refetch}
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
                    onClearAI={handleClearAI}
                />
            )}



            <MediaLibraryModal
                isOpen={showMediaLibrary}
                onClose={() => setShowMediaLibrary(false)}
                onSelect={handleLibrarySelect}
            />

            {/* Scheduling Controls (only show if we have content) */}
            {(content.text.trim() || content.media.length > 0) && (
                <SchedulingControls
                    selectedPlatforms={content.platforms}
                    hasContent={content.text.trim().length > 0 || content.media.length > 0}
                    onSaveDraft={handleSaveDraft}
                    onSchedule={handleSchedule}
                    onPublish={handlePublish}
                    onRequestApproval={handleRequestApproval}
                    onMixedPublishSchedule={handleMixedPublishSchedule}
                    isLoading={isPublishing}
                    accounts={connectedAccounts}
                />
            )}
        </div>
    );
}
