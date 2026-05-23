'use client';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type AIOptions,
  type Platform,
  type AIGenerationResult,
  type ContentAnalysis,
  type AIGenerationHistoryEntry,
} from '@/types';
import { useAIContentStore } from '@/store/aiContentStore';

interface GeneratePayload {
  prompt: string;
  options: AIOptions;
}

async function generateAIContent(payload: GeneratePayload): Promise<AIGenerationResult> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: payload.prompt,
      platforms: payload.options.platforms,
      model: payload.options.model,
      tone: payload.options.tone,
      style: payload.options.style,
      length: payload.options.length,
      addEmojis: payload.options.addEmojis,
      addHashtags: payload.options.addHashtags,
      addCTA: payload.options.addCTA,
      maxLength: payload.options.maxLength,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to generate AI content';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }

  const json = await response.json();
  return {
    ...json.data,
  };
}

async function fetchAIHistory(limit: number = 20) {
  const response = await fetch(`/api/ai/generate/history?limit=${limit}`);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to load AI history';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }
  const json = await response.json();
  return json.data.history as AIGenerationHistoryEntry[];
}

async function analyzeAIContent(content: string) {
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to analyze content';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }

  const json = await response.json();
  return json.data as ContentAnalysis;
}

export type RefinementType =
  | 'shorter'
  | 'longer'
  | 'more_emojis'
  | 'more_professional'
  | 'more_casual'
  | 'add_urgency'
  | 'custom';

async function refineAIContent(payload: {
  content: string;
  platform: Platform;
  refinementType: RefinementType;
  customInstruction?: string;
}) {
  const response = await fetch('/api/ai/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to refine content';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }

  const json = await response.json();
  return json.data as { text: string; refinementType: RefinementType };
}

async function requestVariations(payload: { content: string; platform: Platform }) {
  const response = await fetch('/api/ai/variations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, count: 3 }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to generate variations';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }

  const json = await response.json();
  return json.data.variations as string[];
}

async function requestHashtags(payload: { content: string; platform: Platform }) {
  const response = await fetch('/api/ai/hashtags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, count: 8 }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? 'Unable to generate hashtags';
    const code = error?.error?.code;
    throw new Error(code ? `${message} [${code}]` : message);
  }

  const json = await response.json();
  return json.data.hashtags as string[];
}

export function useAIGenerate() {
  const prompt = useAIContentStore((state) => state.prompt);
  const options = useAIContentStore((state) => state.options);
  const setGeneration = useAIContentStore((state) => state.setGeneration);
  const setStreamingContent = useAIContentStore((state) => state.setStreamingContent);
  const setGenerating = useAIContentStore((state) => state.setGenerating);
  const prependHistory = useAIContentStore((state) => state.prependHistory);

  return useMutation({
    mutationKey: ['ai-generate'],
    mutationFn: () => generateAIContent({ prompt, options }),
    onMutate: () => {
      setGenerating(true);
      options.platforms.forEach((platform) => setStreamingContent(platform, '', false));
    },
    onSuccess: (data) => {
      setGeneration(data);
      prependHistory({
        id: data.generationId ?? crypto.randomUUID(),
        prompt,
        platform: options.platforms.length === 1 ? options.platforms[0] : 'multi',
        generated_content: {
          platform_content: data.platformContent,
          hashtags: data.hashtags,
          summary: data.summary,
          analytics: data.analytics,
        },
        parameters: {
          tone: options.tone,
          style: options.style,
          length: options.length,
          platforms: options.platforms,
          model: options.model,
        },
        created_at: new Date().toISOString(),
      });
    },
    onError: () => {
      setGeneration(undefined);
    },
    onSettled: () => {
      setGenerating(false);
    },
  });
}

export function useAIHistory(limit: number = 20) {
  const setHistory = useAIContentStore((state) => state.setHistory);

  const query = useQuery({
    queryKey: ['ai-history', limit],
    queryFn: () => fetchAIHistory(limit),
    staleTime: 5 * 60 * 1000,
  });

  // Update history when data changes
  useEffect(() => {
    if (query.data) {
      setHistory(query.data);
    }
  }, [query.data, setHistory]);

  return query;
}

export function useAIAnalysis() {
  const setAnalysis = useAIContentStore((state) => state.setAnalysis);
  const setAnalyzing = useAIContentStore((state) => state.setAnalyzing);

  return useMutation({
    mutationKey: ['ai-analysis'],
    mutationFn: analyzeAIContent,
    onMutate: () => {
      setAnalyzing(true);
    },
    onSuccess: (analysis) => {
      setAnalysis(analysis);
    },
    onError: () => {
      setAnalysis(undefined);
    },
    onSettled: () => {
      setAnalyzing(false);
    },
  });
}

export function useAIRefine() {
  return useMutation({
    mutationKey: ['ai-refine'],
    mutationFn: (refinementType: RefinementType) => {
      const state = useAIContentStore.getState();
      const platform = state.activePlatform;
      const content = state.generation?.platformContent?.[platform]?.text;
      if (!content) {
        throw new Error('Generate content before refining.');
      }
      return refineAIContent({ content, platform, refinementType });
    },
    onMutate: () => {
      useAIContentStore.getState().setRefining(true);
    },
    onSuccess: (result) => {
      const { activePlatform, updatePlatformContent, setVariations } =
        useAIContentStore.getState();
      updatePlatformContent(activePlatform, { text: result.text });
      setVariations([]);
    },
    onSettled: () => {
      useAIContentStore.getState().setRefining(false);
    },
  });
}

export function useAIVariations() {
  return useMutation({
    mutationKey: ['ai-variations'],
    mutationFn: () => {
      const state = useAIContentStore.getState();
      const platform = state.activePlatform;
      const content = state.generation?.platformContent?.[platform]?.text;
      if (!content) {
        throw new Error('Generate content before requesting variations.');
      }
      return requestVariations({ content, platform });
    },
    onSuccess: (variations) => {
      useAIContentStore.getState().setVariations(variations);
    },
  });
}

export function useAIHashtags() {
  return useMutation({
    mutationKey: ['ai-hashtags'],
    mutationFn: () => {
      const state = useAIContentStore.getState();
      const platform = state.activePlatform;
      const content = state.generation?.platformContent?.[platform]?.text;
      if (!content) {
        throw new Error('Generate content to derive hashtags.');
      }
      return requestHashtags({ content, platform });
    },
    onMutate: () => useAIContentStore.getState().setHashtagLoading(true),
    onSuccess: (hashtags) => {
      useAIContentStore.getState().setCustomHashtags(hashtags);
    },
    onSettled: () => useAIContentStore.getState().setHashtagLoading(false),
  });
}
