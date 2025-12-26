"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ComposerInput } from './composer-input';
import { PlatformSelector } from './platform-selector';
import { PlatformPreviews } from './platform-previews';
import { MediaLibraryModal } from './media-library-modal';
import { SchedulingControls } from './scheduling-controls';
import { ContentCompatibilityWarning } from './content-compatibility-warning';
import type { Platform, MediaFile, PostStatus } from '@/types';
import { toast } from 'sonner';
import { useAccounts } from '@/hooks/use-accounts';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllPostQueries } from '@/lib/react-query';

export type CreateContent = {
    text: string;
    platforms: Platform[];
    media: MediaFile[];
    platformContent: Record<Platform, string>;
};

export type AIGenerationOptions = {
    tone?: string;
    audience?: string;
    style?: string;
    length?: string;
    model?: string;
};

// Initial empty content state
const EMPTY_CONTENT: CreateContent = {
    text: '',
    platforms: [],
    media: [],
    platformContent: {} as Record<Platform, string>,
};

/**
 * Centralized post submission payload builder
 */
function buildPostPayload(
    content: CreateContent,
    accountSelections: Record<Platform, string>,
    status: PostStatus,
    scheduledAt?: Date
) {
    // Build platform-specific content
    const postContent: Record<string, { text: string }> = {};
    content.platforms.forEach(platform => {
        postContent[platform] = {
            text: content.platformContent[platform] || content.text,
        };
    });

    // Build media payload
    const mediaPayload = content.media.map(m => ({
        id: m.id,
        url: m.url,
        type: m.type,
        filename: m.name,
        size: m.size,
    }));

    return {
        content: postContent,
        platforms: content.platforms,
        platformAccounts: accountSelections,
        status,
        scheduled_at: scheduledAt?.toISOString(),
        media: mediaPayload,
        mediaIds: content.media.map(m => m.id),
    };
}

/**
 * Submit post to API with consistent error handling
 * Includes workspace ID in the request for proper workspace scoping
 */
async function submitPost(
    payload: ReturnType<typeof buildPostPayload>,
    workspaceId?: string
): Promise<{ post: any; success: boolean }> {
    // Build URL with workspace ID if provided
    const url = workspaceId
        ? `/api/posts?workspaceId=${encodeURIComponent(workspaceId)}`
        : '/api/posts';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Also pass workspace ID in header for redundancy
            ...(workspaceId && { 'x-workspace-id': workspaceId }),
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
    }

    console.log('[Composer] Post created successfully:', data.data?.post?.id || data.post?.id);

    return {
        post: data.data?.post || data.post,
        success: true,
    };
}

export function UnifiedPostComposer() {
    // Core content state
    const [content, setContent] = useState<CreateContent>(EMPTY_CONTENT);

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showMediaUpload, setShowMediaUpload] = useState(false);
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [aiOptions, setAIOptions] = useState<AIGenerationOptions>({});

    // Get current workspace for proper scoping
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;

    // Shared account state via React Query + Supabase realtime
    const { accounts: connectedAccounts, loading: loadingAccounts, error, refetch } = useAccounts();

    // Query client for invalidating caches after post creation
    const queryClient = useQueryClient();

    // Router for navigation after post creation
    const router = useRouter();
    const searchParams = useSearchParams();

    // Track if we've already prefilled from URL
    const prefillApplied = useRef(false);

    // Prefill scheduled date from URL params (from calendar click)
    useEffect(() => {
        if (prefillApplied.current) return;

        const dateParam = searchParams.get('date');
        if (dateParam) {
            try {
                const prefillDate = new Date(dateParam);
                if (!isNaN(prefillDate.getTime())) {
                    console.log('[Composer] Prefilling date from URL:', prefillDate);
                    prefillApplied.current = true;
                }
            } catch (e) {
                console.warn('[Composer] Invalid date param:', dateParam);
            }
        }
    }, [searchParams]);

    // Real-time verification + error logging on mount and window focus
    useEffect(() => {
        if (error) {
            const message = typeof error === 'string' ? error : (error as any)?.message || 'Failed to load connected accounts';
            toast.error(message);
            logger.error('Connection status verification failed', undefined, {
                action: 'fetch_accounts',
            });
        }

        const onFocus = () => refetch();
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

    // Handle removing a platform (for content compatibility warnings)
    const handleRemovePlatform = useCallback((platform: Platform) => {
        setContent(prev => ({
            ...prev,
            platforms: prev.platforms.filter(p => p !== platform),
        }));
        toast.info(`Removed ${platform} from selection`);
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
                throw new Error(errorData.error?.message || errorData.message || 'Failed to generate content');
            }

            const apiResponse = await response.json();
            const data = apiResponse?.data || {};

            // Update platform-specific content from API response
            const platformContent: Partial<Record<Platform, string>> = {};
            let hasGeneratedContent = false;

            if (data.platformContent) {
                // Normalize keys from API response
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
                    let platformData = normalizedResponse[platform];
                    if (!platformData) {
                        const fuzzyKey = Object.keys(normalizedResponse).find(k => k.includes(platform));
                        if (fuzzyKey) platformData = normalizedResponse[fuzzyKey];
                    }

                    if (platformData?.text) {
                        platformContent[platform] = platformData.text;
                        hasGeneratedContent = true;
                    }
                });
            }

            // Fallback: use first available content for all platforms
            if (!hasGeneratedContent && data.platformContent) {
                const firstValue = Object.values(data.platformContent)[0] as any;
                if (firstValue?.text) {
                    content.platforms.forEach(p => {
                        platformContent[p] = firstValue.text;
                    });
                    hasGeneratedContent = true;
                }
            }

            if (!hasGeneratedContent) {
                toast.warning('AI generated content but it appears empty. Please try again.');
                return;
            }

            setContent(prev => ({
                ...prev,
                platformContent: platformContent as Record<Platform, string>
            }));
            toast.success('Content generated successfully!');
        } catch (error: any) {
            console.error('AI generation error:', error);
            toast.error(error.message || 'Failed to generate content');
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
                    body: JSON.stringify({ content: currentContent, platform, count: 5 }),
                });

                if (!response.ok) throw new Error('Failed to generate hashtags');
                const data = await response.json();
                const hashtags = data.data?.hashtags || [];
                if (hashtags.length > 0) {
                    newContent = `${currentContent}\n\n${hashtags.map((t: string) => `#${t}`).join(' ')}`;
                }
            } else {
                const response = await fetch('/api/ai/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: currentContent, platform, refinementType: instruction }),
                });

                if (!response.ok) throw new Error('Failed to refine content');
                const data = await response.json();
                newContent = data.data?.text || currentContent;
            }

            setContent(prev => ({
                ...prev,
                platformContent: { ...prev.platformContent, [platform]: newContent },
            }));

            toast.success(`${platform} content updated`);
        } catch (error: any) {
            console.error('AI refine error:', error);
            toast.error(error.message || 'Failed to update content');
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
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.error || `Failed to upload ${file.name}`);
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
        const succeeded = results.filter((r): r is PromiseFulfilledResult<MediaFile> => r.status === 'fulfilled');
        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

        if (succeeded.length) {
            setContent(prev => ({
                ...prev,
                media: [...prev.media, ...succeeded.map(s => s.value)],
            }));
            toast.success(`${succeeded.length} file(s) uploaded`);
        }
        if (failed.length) {
            toast.error(failed[0].reason?.message || 'Some uploads failed');
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
            platformContent: { ...prev.platformContent, [platform]: text },
        }));
    }, []);

    /**
     * Centralized post submission handler
     * All create/schedule/publish operations go through this
     */
    const handleSubmitPost = useCallback(async (
        accountSelections: Record<Platform, string>,
        status: PostStatus,
        scheduledAt?: Date
    ) => {
        // Validation
        if (content.platforms.length === 0) {
            toast.error('Please select at least one platform');
            return;
        }

        // For non-draft posts, ensure all platforms have accounts selected
        if (status !== 'draft') {
            const missingAccounts = content.platforms.filter(p => !accountSelections[p]);
            if (missingAccounts.length > 0) {
                toast.error(`Please select accounts for: ${missingAccounts.join(', ')}`);
                return;
            }
        }

        // For scheduled posts, ensure we have a date
        if (status === 'scheduled' && !scheduledAt) {
            toast.error('Please select a scheduled time');
            return;
        }

        if (!workspaceId) {
            toast.error('Please select a workspace first');
            return;
        }

        setIsPublishing(true);

        try {
            const payload = buildPostPayload(content, accountSelections, status, scheduledAt);
            const result = await submitPost(payload, workspaceId);

            // Determine success message based on final status
            const finalStatus = result.post?.status || status;
            let successMessage = '';

            switch (finalStatus) {
                case 'pending_approval':
                    successMessage = 'Post submitted for approval!';
                    break;
                case 'published':
                    successMessage = 'Post published successfully!';
                    break;
                case 'scheduled':
                    successMessage = `Post scheduled for ${scheduledAt?.toLocaleString() || 'later'}`;
                    break;
                case 'draft':
                    successMessage = 'Draft saved!';
                    break;
                default:
                    successMessage = 'Post created!';
            }

            toast.success(successMessage);

            // Invalidate all post queries to ensure calendar updates
            await invalidateAllPostQueries(queryClient);

            // Reset form
            setContent(EMPTY_CONTENT);

            // Navigate to calendar
            setTimeout(() => router.push('/o'), 300);

        } catch (error: any) {
            console.error('[Composer] Submit error:', error);
            toast.error(error.message || 'Failed to create post');
        } finally {
            setIsPublishing(false);
        }
    }, [content, queryClient, router, workspaceId]);

    // Simplified action handlers that use the centralized submission
    const handleSaveDraft = useCallback(
        (accountSelections: Record<Platform, string>) => handleSubmitPost(accountSelections, 'draft'),
        [handleSubmitPost]
    );

    const handleSchedule = useCallback(
        (accountSelections: Record<Platform, string>, scheduledTime: Date) =>
            handleSubmitPost(accountSelections, 'scheduled', scheduledTime),
        [handleSubmitPost]
    );

    const handlePublish = useCallback(
        (accountSelections: Record<Platform, string>) => handleSubmitPost(accountSelections, 'published'),
        [handleSubmitPost]
    );

    const handleRequestApproval = useCallback(
        (accountSelections: Record<Platform, string>) => handleSubmitPost(accountSelections, 'pending_approval'),
        [handleSubmitPost]
    );

    // Mixed publish/schedule (for some platforms publish now, others schedule)
    const handleMixedPublishSchedule = useCallback(async (
        onlineAccounts: Record<Platform, string>,
        offlineAccounts: Record<Platform, string>,
        scheduledTime: Date
    ) => {
        if (!workspaceId) {
            toast.error('Please select a workspace first');
            return;
        }

        setIsPublishing(true);

        try {
            // Publish to online accounts
            if (Object.keys(onlineAccounts).length > 0) {
                const onlinePlatforms = Object.keys(onlineAccounts) as Platform[];
                const onlineContent = { ...content, platforms: onlinePlatforms };
                const payload = buildPostPayload(onlineContent, onlineAccounts, 'published');
                await submitPost(payload, workspaceId);
            }

            // Schedule for offline accounts
            if (Object.keys(offlineAccounts).length > 0) {
                const offlinePlatforms = Object.keys(offlineAccounts) as Platform[];
                const offlineContent = { ...content, platforms: offlinePlatforms };
                const payload = buildPostPayload(offlineContent, offlineAccounts, 'scheduled', scheduledTime);
                await submitPost(payload, workspaceId);
            }

            toast.success('Posts processed successfully!');

            // Invalidate caches and redirect
            await invalidateAllPostQueries(queryClient);
            setContent(EMPTY_CONTENT);
            setTimeout(() => router.push('/o'), 300);

        } catch (error: any) {
            console.error('[Composer] Mixed submit error:', error);
            toast.error(error.message || 'Failed to process posts');
        } finally {
            setIsPublishing(false);
        }
    }, [content, queryClient, router, workspaceId]);

    // Calculate if AI can be used (enough content)
    const canUseAI = content.text.trim().length >= 20 && content.platforms.length > 0;

    // Derived connected platforms
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

            {/* Content Compatibility Warning */}
            {content.platforms.length > 0 && (content.media.length > 0 || content.text.trim()) && (
                <ContentCompatibilityWarning
                    selectedPlatforms={content.platforms}
                    media={content.media}
                    hasText={content.text.trim().length > 0}
                    onRemovePlatform={handleRemovePlatform}
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

