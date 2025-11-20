'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlatformSelector } from './platform-selector';
import { ContentEditor } from './content-editor';
import { MediaUploader, type ComposerMedia } from './media-uploader';
import { PreviewPanel } from './preview-panel';
import { SchedulePicker } from './schedule-picker';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, Clock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SocialAccount } from '@/types';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import type { PreviewMedia } from './previews/types';
import { logger } from '@/lib/logger';

type PlatformAccountMap = Record<string, string>;

type AIGenerationContext = {
  generationId?: string;
  prompt?: string;
  model?: string;
  tone?: string;
  style?: string;
  length?: string;
};

type ComposerPrefill = {
  id?: string;
  content?: string;
  platforms?: string[];
  date?: string | Date | null;
  aiGenerationContext?: AIGenerationContext;
};

type PostComposerProps = {
  prefill?: ComposerPrefill | null;
};

export function PostComposer({ prefill }: PostComposerProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedWorkspace = useSelectedWorkspace();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<ComposerMedia[]>([]);
  const hasUploadingMedia = attachments.some((item) => item.status === 'uploading');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<PlatformAccountMap>({});
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [searchPrefillApplied, setSearchPrefillApplied] = useState(false);
  const [platformPrefill, setPlatformPrefill] = useState<string[] | null>(null);
  const lastExternalPrefill = useRef<string | null>(null);
  const [aiContext, setAiContext] = useState<AIGenerationContext | null>(null);
  const activeWorkspaceId = selectedWorkspace?.id;

  const selectedPlatforms = useMemo(
    () => Object.keys(selectedAccounts),
    [selectedAccounts]
  );

  useEffect(() => {
    fetchAccounts(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId || accounts.length === 0) return;
    if (platformPrefill && platformPrefill.length > 0) return;
    if (Object.keys(selectedAccounts).length > 0) return;
    try {
      const key = `xocial:lastSelectedAccounts:${activeWorkspaceId}`;
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (!raw) return;
      const saved = JSON.parse(raw) as PlatformAccountMap;
      const valid: PlatformAccountMap = {};
      for (const [platform, accountId] of Object.entries(saved)) {
        const match = accounts.find((a) => a.platform === platform && a.id === accountId);
        if (match) valid[platform] = accountId;
      }
      if (Object.keys(valid).length > 0) {
        setSelectedAccounts(valid);
      }
    } catch { }
  }, [activeWorkspaceId, accounts, platformPrefill, selectedAccounts]);

  // Apply query param prefills
  useEffect(() => {
    if (!searchParams || searchPrefillApplied) return;

    const prefillText = searchParams.get('prefill');
    const dateStr = searchParams.get('date');
    const platformsParam = searchParams.get('platforms');

    if (prefillText) {
      setContent(prefillText);
    }
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        setScheduledAt(parsed);
      }
    }
    if (platformsParam) {
      const list = platformsParam
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);

      if (list.length > 0) {
        setPlatformPrefill(list);
      }
    }

    setSearchPrefillApplied(true);
  }, [searchParams, searchPrefillApplied]);

  // Apply external prefill payloads
  useEffect(() => {
    if (!prefill) return;

    const signature = [
      prefill.id ?? '',
      prefill.content ?? '',
      (prefill.platforms ?? []).join(','),
      prefill.date ? (typeof prefill.date === 'string' ? prefill.date : prefill.date.toISOString()) : '',
      prefill.aiGenerationContext?.generationId ?? '',
    ].join('|');

    if (lastExternalPrefill.current === signature) return;

    if (prefill.content) {
      setContent(prefill.content);
    }

    if (prefill.date) {
      const parsedDate = typeof prefill.date === 'string' ? new Date(prefill.date) : prefill.date;
      if (!isNaN(parsedDate.getTime())) {
        setScheduledAt(parsedDate);
      }
    }

    if (prefill.platforms && prefill.platforms.length > 0) {
      setPlatformPrefill(prefill.platforms.map((platform) => platform.toLowerCase()));
    }

    // Store AI generation context for later use in publishing
    if (prefill.aiGenerationContext) {
      setAiContext(prefill.aiGenerationContext);
    }

    lastExternalPrefill.current = signature;
  }, [prefill]);

  // Apply platform prefill once accounts are loaded
  useEffect(() => {
    if (!platformPrefill || platformPrefill.length === 0 || accounts.length === 0) return;

    setSelectedAccounts((prev) => {
      const next = { ...prev };
      platformPrefill.forEach((platform) => {
        const normalized = platform.toLowerCase();
        const platformAccounts = accounts.filter(
          (account) => account.platform === normalized
        );
        if (platformAccounts.length === 1) {
          next[normalized] = platformAccounts[0].id;
        }
      });
      return next;
    });

    setPlatformPrefill(null);
  }, [accounts, platformPrefill]);

  async function fetchAccounts(workspaceId?: string) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        logger.warn('No authenticated user found for fetchAccounts');
        return;
      }

      let targetWorkspaceId = workspaceId;

      if (!targetWorkspaceId) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true })
          .maybeSingle();

        if (membership?.workspace_id) {
          targetWorkspaceId = membership.workspace_id;
        } else {
          const { data: fallbackWorkspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single();

          if (!fallbackWorkspace) return;
          targetWorkspaceId = fallbackWorkspace.id;
        }
      }

      const { data } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', targetWorkspaceId)
        .eq('is_active', true);

      setAccounts((data as SocialAccount[]) || []);

      logger.debug('Fetched social accounts', {
        workspaceId: targetWorkspaceId,
        count: data?.length || 0,
      });
    } catch (error) {
      logger.error('Failed to fetch accounts', error instanceof Error ? error : undefined, {
        workspaceId,
        action: 'fetch_accounts_failed',
      });
      toast.error('Unable to load connected accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }

  const getCharacterLimit = (platform: string): number => {
    const limits: Record<string, number> = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
      youtube: 5000,
      tiktok: 2200,
    };
    return limits[platform.toLowerCase()] || 5000;
  };

  const validateInputs = (): string[] => {
    const errors: string[] = [];
    if (!content.trim()) errors.push('Add content before publishing');
    if (selectedPlatforms.length === 0) errors.push('Select at least one platform');
    if (hasUploadingMedia) errors.push('Wait for media uploads to finish');
    for (const platform of selectedPlatforms) {
      const limit = getCharacterLimit(platform);
      if (content.length > limit) {
        errors.push(`${platform} exceeds ${limit} characters`);
      }
    }
    const missingAccounts = selectedPlatforms.filter((p) => !selectedAccounts[p]);
    if (!scheduledAt && missingAccounts.length > 0) {
      errors.push(`Select account for: ${missingAccounts.join(', ')}`);
    }
    return errors;
  };

  const buildContentPayload = () => {
    const result: Record<string, { text: string }> = {};
    selectedPlatforms.forEach((platform) => {
      result[platform] = { text: content };
    });
    return result;
  };

  const handlePublish = async (isDraft = false) => {
    const errors = validateInputs();
    if (errors.length > 0 && !isDraft) {
      errors.forEach((msg) => toast.error(msg));
      return;
    }

    const platforms = selectedPlatforms;
    const startTime = Date.now();

    try {
      setIsPublishing(true);

      // Log publish attempt
      logger.info('Post publish initiated', {
        workspaceId: activeWorkspaceId,
        action: 'post_publish',
        metadata: {
          platforms,
          status: isDraft ? 'draft' : scheduledAt ? 'scheduled' : 'published',
          hasMedia: attachments.length > 0,
          isAIGenerated: Boolean(aiContext?.generationId),
          source: 'c-ai-flow',
        },
      });
      const readyMedia = attachments.filter(
        (item) => item.status === 'uploaded' && item.id
      );
      const mediaPayload = readyMedia.map((item) => ({
        id: item.id!,
        url: item.url || item.previewUrl,
        type: item.type,
        thumbnail: item.thumbnail_url || undefined,
        filename: item.filename,
        size: item.size,
      }));
      const payload = {
        content: buildContentPayload(),
        platforms,
        platformAccounts: selectedAccounts,
        status: isDraft ? 'draft' : scheduledAt ? 'scheduled' : 'published',
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : undefined,
        media: mediaPayload,
        mediaIds: readyMedia.map((item) => item.id!) as string[],
        // Include AI metadata when content originated from AI generation
        ...(aiContext && {
          ai_generated: true,
          ai_generation_id: aiContext.generationId,
          ai_prompt: aiContext.prompt,
          ai_metadata: {
            model: aiContext.model,
            tone: aiContext.tone,
            style: aiContext.style,
            length: aiContext.length,
            platforms,
          },
        }),
      };

      const workspaceQuery = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : '';
      const response = await fetch(`/api/posts${workspaceQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        const errorMsg = result?.error?.message || 'Failed to publish post';
        throw new Error(errorMsg);
      }

      const duration = Date.now() - startTime;

      // Log success
      logger.info('Post published successfully', {
        workspaceId: activeWorkspaceId,
        action: isDraft ? 'post_draft_saved' : scheduledAt ? 'post_scheduled' : 'post_published',
        metadata: {
          postId: result?.data?.post?.id,
          platforms,
          duration,
          hasMedia: attachments.length > 0,
          isAIGenerated: Boolean(aiContext?.generationId),
          source: 'c-ai-flow',
        },
      });

      toast.success(
        isDraft
          ? 'Draft saved'
          : scheduledAt
            ? 'Post scheduled successfully'
            : 'Post published successfully'
      );

      setContent('');
      setSelectedAccounts({});
      setAttachments((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });
        return [];
      });
      setScheduledAt(null);
      setAiContext(null);

      if (scheduledAt) {
        router.push('/o');
      } else if (!isDraft) {
        router.push('/x');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish post';

      // Log error with full context
      logger.error('Post publish failed', error instanceof Error ? error : undefined, {
        workspaceId: activeWorkspaceId,
        action: 'post_publish_failed',
        metadata: {
          platforms,
          duration,
          status: isDraft ? 'draft' : scheduledAt ? 'scheduled' : 'published',
          hasMedia: attachments.length > 0,
          isAIGenerated: Boolean(aiContext?.generationId),
          source: 'c-ai-flow',
          errorMessage,
        },
      });

      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  const activeTab = selectedPlatforms[0] || 'preview';

  const previewMediaItems: PreviewMedia[] = attachments.map((item) => ({
    id: item.id ?? item.clientId,
    url: item.previewUrl || item.url || '',
    type: item.type,
  }));

  const handlePlatformSelection = (platform: string, accountId?: string) => {
    setSelectedAccounts((prev) => {
      const next = { ...prev };
      if (!accountId) {
        delete next[platform];
      } else {
        next[platform] = accountId;
      }
      try {
        if (activeWorkspaceId) {
          const key = `xocial:lastSelectedAccounts:${activeWorkspaceId}`;
          window.localStorage.setItem(key, JSON.stringify(next));
        }
      } catch { }
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Editor */}
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Select Platforms
          </h3>
          <PlatformSelector
            accounts={accounts}
            selected={selectedAccounts}
            onChange={handlePlatformSelection}
            loading={loadingAccounts}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Content
          </h3>
          <ContentEditor
            value={content}
            onChange={setContent}
            platforms={selectedPlatforms}
            getCharacterLimit={getCharacterLimit}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Media (Optional)
          </h3>
          <MediaUploader
            items={attachments}
            onChange={setAttachments}
            maxFiles={10}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Schedule (Optional)
          </h3>
          <SchedulePicker
            value={scheduledAt}
            onChange={setScheduledAt}
          />
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => handlePublish(true)}
            variant="secondary"
            disabled={isPublishing || !content.trim()}
            className="flex-1"
          >
            Save Draft
          </Button>

          <Button
            onClick={() => handlePublish(false)}
            disabled={isPublishing || validateInputs().length > 0}
            className="flex-1"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : scheduledAt ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Schedule Post
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Column - Preview */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview
          </h3>

          {selectedPlatforms.length > 0 ? (
            <Tabs value={activeTab} onValueChange={(value) => { }}>
              <TabsList>
                {selectedPlatforms.map(p => (
                  <TabsTrigger key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedPlatforms.map(p => (
                <TabsContent key={p} value={p}>
                  <p className="text-gray-500 text-center py-4">
                    Preview for {p.charAt(0).toUpperCase() + p.slice(1)}
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Select platforms to see preview
            </p>
          )}

          <div className="mt-6">
            <PreviewPanel
              platform={activeTab}
              content={content}
              mediaItems={previewMediaItems}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

