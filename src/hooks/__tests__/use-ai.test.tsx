/**
 * Integration Tests for AI Hooks
 * Tests the AI generation, refinement, and analysis hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useAIGenerate,
  useAIRefine,
  useAIVariations,
  useAIHashtags,
  useAIAnalysis,
} from '../use-ai';
import { useAIContentStore } from '@/store/aiContentStore';

// Mock fetch globally
global.fetch = jest.fn();

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return QueryWrapper;
};

describe('useAIGenerate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIContentStore.getState().resetAll();
  });

  it('should generate AI content successfully', async () => {
    const mockResponse = {
      data: {
        platformContent: {
          instagram: { text: 'Generated Instagram content' },
          facebook: { text: 'Generated Facebook content' },
        },
        hashtags: ['eco', 'sustainability', 'water'],
        summary: {
          tone: 'friendly',
          highlights: ['Eco-friendly', 'Limited time offer'],
        },
        analytics: {
          totalCharCount: 150,
          averageCharCount: 75,
          perPlatform: {
            instagram: { charCount: 80, hashtagCount: 3, emojiCount: 2 },
            facebook: { charCount: 70, hashtagCount: 3, emojiCount: 1 },
          },
        },
        generationId: 'test-generation-id',
        model: 'gpt-4',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Set up store with prompt and options
    useAIContentStore.getState().setPrompt('Test prompt');
    useAIContentStore.getState().updateOptions({
      platforms: ['instagram', 'facebook'],
      tone: 'friendly',
      style: 'promotional',
      length: 'medium',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIGenerate(), { wrapper });

    // Trigger generation
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify fetch was called with correct payload
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test prompt'),
      })
    );

    // Verify store was updated
    const store = useAIContentStore.getState();
    expect(store.generation).toBeDefined();
    expect(store.generation?.platformContent.instagram?.text).toBe(
      'Generated Instagram content'
    );
    expect(store.generation?.hashtags).toEqual(['eco', 'sustainability', 'water']);
    expect(store.generation?.generationId).toBe('test-generation-id');
  });

  it('should surface API errors for AI generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'AI service temporarily unavailable' } }),
    });

    useAIContentStore.getState().setPrompt('Error prompt');
    useAIContentStore.getState().updateOptions({ platforms: ['instagram'] });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIGenerate(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('AI service temporarily unavailable');
  });

  it('should handle generation errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'AI service error' } }),
    });

    useAIContentStore.getState().setPrompt('Test prompt');
    useAIContentStore.getState().updateOptions({ platforms: ['instagram'] });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIGenerate(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should add generated content to history', async () => {
    const mockResponse = {
      data: {
        platformContent: {
          twitter: { text: 'Tweet content' },
        },
        hashtags: ['test'],
        summary: {},
        analytics: { totalCharCount: 20, averageCharCount: 20, perPlatform: {} },
        generationId: 'history-test-id',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    useAIContentStore.getState().setPrompt('History test');
    useAIContentStore.getState().updateOptions({ platforms: ['twitter'] });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIGenerate(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = useAIContentStore.getState();
    expect(store.history.length).toBeGreaterThan(0);
    expect(store.history[0].prompt).toBe('History test');
    expect(store.history[0].id).toBe('history-test-id');
  });
});

describe('useAIRefine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIContentStore.getState().resetAll();
  });

  it('should refine content successfully', async () => {
    useAIContentStore.getState().setGeneration({
      platformContent: {
        instagram: { text: 'Original content', estimatedCharCount: 16 },
      },
      hashtags: [],
      summary: {},
      analytics: { totalCharCount: 16, averageCharCount: 16, perPlatform: {} },
    });
    useAIContentStore.getState().setActivePlatform('instagram');

    const mockResponse = {
      data: {
        text: 'Refined shorter content',
        refinementType: 'shorter',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIRefine(), { wrapper });

    result.current.mutate('shorter');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = useAIContentStore.getState();
    expect(store.generation?.platformContent.instagram?.text).toBe('Refined shorter content');
  });

  it('should handle refinement errors when no content exists', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIRefine(), { wrapper });

    result.current.mutate('shorter');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('Generate content before refining');
  });
});

describe('useAIVariations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIContentStore.getState().resetAll();
  });

  it('should generate variations successfully', async () => {
    useAIContentStore.getState().setGeneration({
      platformContent: {
        facebook: { text: 'Original content', estimatedCharCount: 16 },
      },
      hashtags: [],
      summary: {},
      analytics: { totalCharCount: 16, averageCharCount: 16, perPlatform: {} },
    });
    useAIContentStore.getState().setActivePlatform('facebook');

    const mockResponse = {
      data: {
        variations: ['Variation 1', 'Variation 2', 'Variation 3'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIVariations(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = useAIContentStore.getState();
    expect(store.variations).toEqual(['Variation 1', 'Variation 2', 'Variation 3']);
  });
});

describe('useAIHashtags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIContentStore.getState().resetAll();
  });

  it('should generate hashtags successfully', async () => {
    useAIContentStore.getState().setGeneration({
      platformContent: {
        instagram: { text: 'Content about sustainability', estimatedCharCount: 28 },
      },
      hashtags: [],
      summary: {},
      analytics: { totalCharCount: 28, averageCharCount: 28, perPlatform: {} },
    });
    useAIContentStore.getState().setActivePlatform('instagram');

    const mockResponse = {
      data: {
        hashtags: ['sustainability', 'ecofriendly', 'green', 'nature'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIHashtags(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = useAIContentStore.getState();
    expect(store.customHashtags).toEqual(['sustainability', 'ecofriendly', 'green', 'nature']);
  });
});

describe('useAIAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIContentStore.getState().resetAll();
  });

  it('should analyze content successfully', async () => {
    const mockResponse = {
      data: {
        sentiment: 'positive',
        readability: 'easy',
        suggestions: ['Add a call to action', 'Include more emojis'],
        score: 85,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIAnalysis(), { wrapper });

    result.current.mutate('Test content for analysis');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = useAIContentStore.getState();
    expect(store.analysis).toBeDefined();
    expect(store.analysis?.sentiment).toBe('positive');
    expect(store.analysis?.readability).toBe('easy');
    expect(store.analysis?.suggestions).toHaveLength(2);
  });
});