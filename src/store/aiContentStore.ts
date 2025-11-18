import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AIOptions,
  Platform,
  AIGenerationResult,
  ContentAnalysis,
  AIGenerationHistoryEntry,
  PlatformPreview,
} from '@/types';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';

const DEFAULT_PLATFORM: Platform = 'instagram';

const DEFAULT_OPTIONS: AIOptions = {
  tone: 'friendly',
  style: 'informative',
  length: 'medium',
  addEmojis: true,
  addHashtags: true,
  addCTA: true,
  platforms: [DEFAULT_PLATFORM],
  model: DEFAULT_AI_MODEL,
};

interface AIContentState {
  prompt: string;
  options: AIOptions;
  activePlatform: Platform;
  generation?: AIGenerationResult;
  analysis?: ContentAnalysis;
  history: AIGenerationHistoryEntry[];
  streamingContent: Partial<Record<Platform, string>>;
  customHashtags: string[];
  variations: string[];
  isGenerating: boolean;
  isRefining: boolean;
  isAnalyzing: boolean;
  isHashtagLoading: boolean;
  setPrompt: (prompt: string) => void;
  updateOptions: (partial: Partial<AIOptions>) => void;
  togglePlatform: (platform: Platform) => void;
  setActivePlatform: (platform: Platform) => void;
  setGeneration: (generation?: AIGenerationResult) => void;
  setAnalysis: (analysis?: ContentAnalysis) => void;
  setStreamingContent: (platform: Platform, chunk: string, append?: boolean) => void;
  setGenerating: (value: boolean) => void;
  setRefining: (value: boolean) => void;
  setAnalyzing: (value: boolean) => void;
  setHashtagLoading: (value: boolean) => void;
  updatePlatformContent: (platform: Platform, updates: Partial<PlatformPreview>) => void;
  setCustomHashtags: (hashtags: string[]) => void;
  setVariations: (variations: string[]) => void;
  setHistory: (entries: AIGenerationHistoryEntry[]) => void;
  prependHistory: (entry: AIGenerationHistoryEntry) => void;
  resetGeneration: () => void;
  resetAll: () => void;
}

export const useAIContentStore = create<AIContentState>()(
  devtools((set, get) => ({
    prompt: '',
    options: { ...DEFAULT_OPTIONS },
    activePlatform: DEFAULT_PLATFORM,
    generation: undefined,
    analysis: undefined,
    history: [],
    streamingContent: {},
    customHashtags: [],
    variations: [],
    isGenerating: false,
    isRefining: false,
    isAnalyzing: false,
    isHashtagLoading: false,
    setPrompt: (prompt) => set({ prompt }),
    updateOptions: (partial) =>
      set((state) => {
        const nextPlatforms = partial.platforms ?? state.options.platforms;
        return {
          options: { ...state.options, ...partial, platforms: nextPlatforms },
          activePlatform:
            nextPlatforms.includes(state.activePlatform) && nextPlatforms.length > 0
              ? state.activePlatform
              : nextPlatforms[0] ?? DEFAULT_PLATFORM,
        };
      }),
    togglePlatform: (platform) =>
      set((state) => {
        const exists = state.options.platforms.includes(platform);
        const updatedPlatforms = exists
          ? state.options.platforms.filter((p) => p !== platform)
          : [...state.options.platforms, platform];
        const sanitized = updatedPlatforms.length > 0 ? updatedPlatforms : [DEFAULT_PLATFORM];
        return {
          options: { ...state.options, platforms: sanitized },
          activePlatform: sanitized.includes(state.activePlatform)
            ? state.activePlatform
            : sanitized[0],
        };
      }),
    setActivePlatform: (platform) => set({ activePlatform: platform }),
    setGeneration: (generation) =>
      set((state) => ({
        generation,
        streamingContent: {},
        customHashtags: generation?.hashtags ?? [],
        variations: [],
        activePlatform:
          generation?.platformContent && state.activePlatform in generation.platformContent
            ? state.activePlatform
            : state.options.platforms[0] ?? DEFAULT_PLATFORM,
      })),
    setAnalysis: (analysis) => set({ analysis }),
    setStreamingContent: (platform, chunk, append = true) =>
      set((state) => ({
        streamingContent: {
          ...state.streamingContent,
          [platform]: append
            ? `${state.streamingContent[platform] ?? ''}${chunk}`
            : chunk,
        },
      })),
    setGenerating: (value) => set({ isGenerating: value }),
    setRefining: (value) => set({ isRefining: value }),
    setAnalyzing: (value) => set({ isAnalyzing: value }),
    setHashtagLoading: (value) => set({ isHashtagLoading: value }),
    updatePlatformContent: (platform, updates) =>
      set((state) => {
        if (!state.generation?.platformContent[platform]) {
          return {};
        }

        return {
          generation: {
            ...state.generation,
            platformContent: {
              ...state.generation.platformContent,
              [platform]: {
                ...state.generation.platformContent[platform],
                ...updates,
              },
            },
          },
        };
      }),
    setCustomHashtags: (hashtags) => set({ customHashtags: hashtags }),
    setVariations: (variations) => set({ variations }),
    setHistory: (entries) => set({ history: entries }),
    prependHistory: (entry) =>
      set((state) => ({
        history: [entry, ...state.history].slice(0, 50),
      })),
    resetGeneration: () =>
      set({
        generation: undefined,
        analysis: undefined,
        streamingContent: {},
        customHashtags: [],
        variations: [],
      }),
    resetAll: () =>
      set({
        prompt: '',
        options: { ...DEFAULT_OPTIONS },
        generation: undefined,
        analysis: undefined,
        history: [],
        streamingContent: {},
        activePlatform: DEFAULT_PLATFORM,
        customHashtags: [],
        variations: [],
      }),
  }))
);

