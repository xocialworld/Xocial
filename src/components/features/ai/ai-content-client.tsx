'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Calendar,
  History,
  Lightbulb,
  MessageSquare,
  Layers3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAIContentStore } from '@/store/aiContentStore';
import {
  useAIGenerate,
  useAIHistory,
  useAIRefine,
  useAIVariations,
  useAIHashtags,
  useAIAnalysis,
  type RefinementType,
} from '@/hooks/use-ai';
import { logger } from '@/lib/logger';
import type { Platform } from '@/types';
import { AI_MODELS } from '@/lib/ai/models';
import { useAIShortcuts } from '@/hooks/use-ai-shortcuts';
import { PlatformPreviewCard } from './platform-preview-card';

type SchedulePayload = {
  content: string;
  platform: Platform;
};

type AIContentClientProps = {
  onSchedule?: (payload: SchedulePayload) => void;
};

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'informative', label: 'Informative' },
];

const STYLE_OPTIONS = [
  { value: 'informative', label: 'Informative' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'educational', label: 'Educational' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'playful', label: 'Playful' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const REFINE_OPTIONS = [
  { value: 'shorter', label: 'Make shorter' },
  { value: 'longer', label: 'Add detail' },
  { value: 'more_emojis', label: 'More emojis' },
  { value: 'more_professional', label: 'More professional' },
  { value: 'more_casual', label: 'More casual' },
  { value: 'add_urgency', label: 'Add urgency' },
];

export function AIContentClient({ onSchedule }: AIContentClientProps = {}) {
  const router = useRouter();
  const { mutateAsync, isPending } = useAIGenerate();
  const refineMutation = useAIRefine();
  const variationsMutation = useAIVariations();
  const hashtagsMutation = useAIHashtags();
  const { mutate: runAnalysis } = useAIAnalysis();
  useAIHistory();

  const prompt = useAIContentStore((state) => state.prompt);
  const setPrompt = useAIContentStore((state) => state.setPrompt);
  const isGenerating = useAIContentStore((state) => state.isGenerating || isPending);
  const isRefining = useAIContentStore((state) => state.isRefining);
  const customHashtags = useAIContentStore((state) => state.customHashtags);
  const isHashtagLoading = useAIContentStore((state) => state.isHashtagLoading);
  const variations = useAIContentStore((state) => state.variations);
  const setVariations = useAIContentStore((state) => state.setVariations);
  const generation = useAIContentStore((state) => state.generation);
  const activePlatform = useAIContentStore((state) => state.activePlatform);
  const options = useAIContentStore((state) => state.options);

  const [refineType, setRefineType] = useState<RefinementType>('shorter');

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Add a prompt so the AI knows what to craft.');
      return;
    }

    try {
      const start = Date.now();
      await mutateAsync();
      logger.ai('ai_generate', {
        metadata: { platforms: options.platforms, promptLength: prompt.length, duration: Date.now() - start },
      });
      toast.success('Content generated successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate content.';
      toast.error(message);
    }
  }, [prompt, mutateAsync, options.platforms]);

  const handleRefine = useCallback(async () => {
    try {
      const start = Date.now();
      await refineMutation.mutateAsync(refineType);
      logger.ai('ai_refine', { metadata: { type: refineType, duration: Date.now() - start } });
      toast.success('Content refined.');
      const state = useAIContentStore.getState();
      const text = state.generation?.platformContent?.[state.activePlatform]?.text;
      if (text) {
        runAnalysis(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refine content.';
      toast.error(message);
    }
  }, [refineMutation, refineType, runAnalysis]);

  const handleVariations = useCallback(async () => {
    try {
      const start = Date.now();
      await variationsMutation.mutateAsync();
      logger.trackAction('ai_variations', { metadata: { duration: Date.now() - start } });
      toast.success('Variations generated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate variations.';
      toast.error(message);
    }
  }, [variationsMutation]);

  const handleHashtagRefresh = useCallback(async () => {
    try {
      const start = Date.now();
      await hashtagsMutation.mutateAsync();
      logger.trackAction('ai_hashtags_refresh', { metadata: { duration: Date.now() - start } });
      toast.success('Fresh hashtags ready.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch hashtags.';
      toast.error(message);
    }
  }, [hashtagsMutation]);

  const handleApplyVariation = useCallback(
    (variation: string) => {
      const { activePlatform: platform, updatePlatformContent } = useAIContentStore.getState();
      updatePlatformContent(platform, { text: variation });
      setVariations([]);
      toast.success('Variation applied.');
      runAnalysis(variation);
    },
    [setVariations, runAnalysis]
  );

  const platformContent = generation?.platformContent;

  useEffect(() => {
    const platform = activePlatform ?? options.platforms[0];
    const text = platform ? platformContent?.[platform]?.text : undefined;
    if (text) {
      runAnalysis(text);
    }
  }, [platformContent, activePlatform, options.platforms, runAnalysis]);

  const handleSchedule = useCallback(
    (content: string, platform: Platform) => {
      if (onSchedule) {
        onSchedule({ content, platform });
        return;
      }

      pushToComposer(router, content, platform);
    },
    [onSchedule, router]
  );

  // Keyboard shortcuts
  useAIShortcuts({
    onGenerate: handleGenerate,
    onRefine: handleRefine,
    onVariations: handleVariations,
    onCopy: () => {
      const platform = activePlatform ?? options.platforms[0];
      const content = platform ? platformContent?.[platform]?.text : '';
      if (content) {
        handleCopy(content);
      }
    },
    onSwitchPlatform: (index) => {
      const platform = options.platforms[index];
      if (platform) {
        useAIContentStore.getState().setActivePlatform(platform);
      }
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
      <div className="space-y-6">
        <PromptBuilder
          prompt={prompt}
          setPrompt={setPrompt}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
        <HistorySidebar />
      </div>
      <div className="space-y-6">
        <PreviewPanel
          onSchedule={handleSchedule}
          onRefreshHashtags={handleHashtagRefresh}
          isHashtagLoading={isHashtagLoading}
          hashtags={customHashtags.length ? customHashtags : generation?.hashtags}
          onRefine={handleRefine}
          onVariations={handleVariations}
          refineType={refineType}
          onRefineTypeChange={setRefineType}
          isRefining={isRefining}
          isVariationsLoading={variationsMutation.isPending}
        />
        <VariationsPanel
          variations={variations}
          onApply={handleApplyVariation}
          onClear={() => setVariations([])}
        />
        <InsightPanel />
      </div>
    </div>
  );
}

function PromptBuilder({
  prompt,
  setPrompt,
  isGenerating,
  onGenerate,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const options = useAIContentStore((state) => state.options);
  const updateOptions = useAIContentStore((state) => state.updateOptions);
  const togglePlatform = useAIContentStore((state) => state.togglePlatform);
  const modelOptions = useMemo(
    () => AI_MODELS.map((model) => ({ value: model.id, label: model.label })),
    []
  );
  const activeModel = useMemo(
    () => AI_MODELS.find((model) => model.id === options.model) ?? AI_MODELS[0],
    [options.model]
  );

  return (
    <Card className="space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-secondary-900">Content Brief</h2>
        <p className="text-sm text-secondary-600">
          Describe what you want to say, pick the platforms, and let the AI do the rest.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-secondary-900">Prompt</label>
        <TextArea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          placeholder="E.g., Launching a new eco-friendly water bottle line next week with limited-time discounts..."
        />
        <div className="text-xs text-secondary-500">
          {prompt.trim().length === 0 ? 'Need inspiration? Mention campaign goals or target audience.' : `${prompt.length} characters`}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-secondary-900">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((platform) => {
            const isActive = options.platforms.includes(platform.value);
            return (
              <button
                key={platform.value}
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium transition',
                  isActive
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-200 text-secondary-600 hover:border-secondary-400'
                )}
              >
                {platform.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-secondary-900">AI Model</label>
        <Select
          options={modelOptions}
          value={options.model}
          onChange={(value) => updateOptions({ model: value as string })}
        />
        <p className="text-xs text-secondary-600">
          {activeModel.description} — {activeModel.context}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          options={TONE_OPTIONS}
          value={options.tone}
          onChange={(value) => updateOptions({ tone: value as typeof options.tone })}
        />
        <Select
          options={STYLE_OPTIONS}
          value={options.style}
          onChange={(value) => updateOptions({ style: value as typeof options.style })}
        />
        <Select
          options={LENGTH_OPTIONS}
          value={options.length}
          onChange={(value) => updateOptions({ length: value as typeof options.length })}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <OptionToggle
          label="Add Emojis"
          description="Sprinkle expressive emojis"
          checked={options.addEmojis}
          onChange={(value) => updateOptions({ addEmojis: value })}
        />
        <OptionToggle
          label="Add Hashtags"
          description="Suggest relevant hashtags"
          checked={options.addHashtags}
          onChange={(value) => updateOptions({ addHashtags: value })}
        />
        <OptionToggle
          label="Call-to-Action"
          description="Include a closing CTA"
          checked={options.addCTA}
          onChange={(value) => updateOptions({ addCTA: value })}
        />
      </div>

      <Button onClick={onGenerate} disabled={isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Content
          </>
        )}
      </Button>
    </Card>
  );
}

function OptionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col rounded-lg border p-3 text-left transition',
        checked ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-400'
      )}
    >
      <div className="flex items-center justify-between text-sm font-semibold text-secondary-900">
        {label}
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
        />
      </div>
      <p className="text-xs text-secondary-600">{description}</p>
    </label>
  );
}

function PreviewPanel({
  onSchedule,
  onRefreshHashtags,
  isHashtagLoading,
  hashtags,
  onRefine,
  onVariations,
  refineType,
  onRefineTypeChange,
  isRefining,
  isVariationsLoading,
}: {
  onSchedule: (content: string, platform: Platform) => void;
  onRefreshHashtags: () => void;
  isHashtagLoading: boolean;
  hashtags?: string[];
  onRefine: () => void;
  onVariations: () => void;
  refineType: RefinementType;
  onRefineTypeChange: (value: RefinementType) => void;
  isRefining: boolean;
  isVariationsLoading: boolean;
}) {
  const generation = useAIContentStore((state) => state.generation);
  const streaming = useAIContentStore((state) => state.streamingContent);
  const options = useAIContentStore((state) => state.options);
  const activePlatform = useAIContentStore((state) => state.activePlatform);
  const setActivePlatform = useAIContentStore((state) => state.setActivePlatform);
  const isGenerating = useAIContentStore((state) => state.isGenerating);

  const contentByPlatform = generation?.platformContent ?? {};
  const fallbackHashtags = generation?.hashtags ?? [];
  const hashtagList = hashtags && hashtags.length > 0 ? hashtags : fallbackHashtags;
  const activeContent = activePlatform ? contentByPlatform[activePlatform]?.text : '';
  const canRefine = Boolean(activeContent?.trim());

  if (options.platforms.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">Preview</h2>
          <p className="text-sm text-secondary-600">
            Review AI output per platform, copy, or push to scheduling.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40 min-w-[160px]">
            <Select
              options={REFINE_OPTIONS}
              value={refineType}
              onChange={(value) => onRefineTypeChange(value as RefinementType)}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onRefine}
            disabled={isRefining || !canRefine}
          >
            {isRefining ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refining
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Refine
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onVariations}
            disabled={isVariationsLoading || !canRefine}
          >
            {isVariationsLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Variations...
              </>
            ) : (
              <>
                <Layers3 className="mr-2 h-4 w-4" />
                Variations
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs
        value={activePlatform}
        onValueChange={(value) => setActivePlatform(value as Platform)}
        className="mt-4"
      >
        <TabsList className="flex flex-wrap gap-2">
          {options.platforms.map((platform) => (
            <TabsTrigger key={platform} value={platform} className="capitalize">
              {platform}
            </TabsTrigger>
          ))}
        </TabsList>

        {options.platforms.map((platform) => {
          const generatedText = contentByPlatform[platform]?.text;
          const streamingText = streaming[platform];
          const body = generatedText || streamingText;

          return (
            <TabsContent key={platform} value={platform}>
              <div className="mt-4 space-y-4 rounded-xl border border-dashed border-secondary-200 bg-secondary-50/60 p-5">
                {body ? (
                  <p className="whitespace-pre-wrap text-sm text-secondary-900">{body}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-secondary-500">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="mb-3 h-6 w-6 animate-spin" />
                        Generating {platform} caption...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mb-3 h-6 w-6" />
                        AI copy will appear here after generation.
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-secondary-200 pt-3 text-xs text-secondary-600">
                  <span>
                    {body ? `${body.length} characters` : 'Awaiting generation'}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopy(body)}
                      disabled={!body}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                    <Button size="sm" onClick={() => body && onSchedule(body, platform)} disabled={!body}>
                      <Calendar className="mr-1 h-3 w-3" />
                      Schedule
                    </Button>
                  </div>
                </div>

                {body ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {hashtagList?.slice(0, 10).map((tag) => (
                      <Badge key={`${platform}-${tag}`} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={onRefreshHashtags}
                      disabled={isHashtagLoading}
                    >
                      {isHashtagLoading ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3 w-3" />
                      )}
                      Refresh hashtags
                    </Button>
                  </div>
                ) : null}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}

function InsightPanel() {
  const generation = useAIContentStore((state) => state.generation);
  const analysis = useAIContentStore((state) => state.analysis);

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary-600" />
        <div>
          <h3 className="text-sm font-semibold text-secondary-900">AI Insights</h3>
          <p className="text-xs text-secondary-600">
            Highlights, tone, and improvement suggestions.
          </p>
        </div>
      </div>

      {generation?.summary?.highlights?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-secondary-700">
          {generation.summary.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-secondary-500">
          Generate content to see AI highlights.
        </p>
      )}

      {analysis ? (
        <div className="rounded-lg bg-secondary-50 p-4 text-sm text-secondary-800">
          <p className="font-semibold">Sentiment: {analysis.sentiment}</p>
          <p className="text-xs text-secondary-600">Readability: {analysis.readability}</p>
          <div className="mt-2 space-y-1 text-xs">
            {analysis.suggestions.map((suggestion) => (
              <p key={suggestion}>• {suggestion}</p>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function VariationsPanel({
  variations,
  onApply,
  onClear,
}: {
  variations: string[];
  onApply: (variation: string) => void;
  onClear: () => void;
}) {
  if (variations.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-secondary-900">AI Variations</h3>
          <p className="text-xs text-secondary-600">Choose a variation to replace the current caption.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="space-y-3">
        {variations.map((variation, index) => (
          <div
            key={`${variation}-${index}`}
            className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 text-sm text-secondary-800"
          >
            <p className="whitespace-pre-wrap">{variation}</p>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => onApply(variation)}>
                Use Variation
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HistorySidebar() {
  const history = useAIContentStore((state) => state.history);
  const setGeneration = useAIContentStore((state) => state.setGeneration);
  const setPrompt = useAIContentStore((state) => state.setPrompt);

  const handleRestore = (entry: typeof history[number]) => {
    if (!entry.generated_content?.platform_content) {
      toast.error('This entry is missing content details.');
      return;
    }

    setGeneration({
      platformContent: entry.generated_content.platform_content,
      hashtags: entry.generated_content.hashtags ?? [],
      summary: entry.generated_content.summary ?? {},
      analytics: entry.generated_content.analytics ?? {
        totalCharCount: 0,
        averageCharCount: 0,
        perPlatform: {},
      },
      generationId: entry.id,
    });
    setPrompt(entry.prompt);
    toast.success('Restored previous generation.');
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-secondary-500" />
        <h3 className="text-sm font-semibold text-secondary-900">Recent Generations</h3>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-secondary-500">
          Your latest AI generations will show up here for quick reuse.
        </p>
      ) : (
        <ul className="space-y-3 text-sm">
          {history.slice(0, 5).map((entry) => (
            <li key={entry.id} className="rounded-lg border border-secondary-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-2 text-secondary-800">{entry.prompt}</p>
                <Button size="sm" variant="ghost" onClick={() => handleRestore(entry)}>
                  Reuse
                </Button>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-secondary-500">
                <span>{new Date(entry.created_at).toLocaleString()}</span>
                <span className="uppercase">{entry.platform}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function handleCopy(content?: string) {
  if (!content) {
    toast.error('Nothing to copy yet.');
    return;
  }
  navigator.clipboard.writeText(content);
  toast.success('Copied to clipboard!');
}

function pushToComposer(router: ReturnType<typeof useRouter>, content: string, platform: Platform) {
  if (!content) {
    toast.error('Generate content first.');
    return;
  }
  const params = new URLSearchParams();
  params.set('prefill', content);
  params.set('platforms', platform);
  logger.ai('ai_schedule', { metadata: { platform } });
  router.push(`/c?${params.toString()}`);
}

