/**
 * Unit Tests for AI Content Store
 * Tests Zustand store state management for AI content generation
 */

import { useAIContentStore } from '../aiContentStore';
import type { AIGenerationResult, AIOptions } from '@/types';

describe('aiContentStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAIContentStore.getState().resetAll();
  });

  describe('Prompt Management', () => {
    it('should set prompt', () => {
      const store = useAIContentStore.getState();
      store.setPrompt('Test prompt');

      expect(useAIContentStore.getState().prompt).toBe('Test prompt');
    });

    it('should start with empty prompt', () => {
      expect(useAIContentStore.getState().prompt).toBe('');
    });
  });

  describe('Options Management', () => {
    it('should update options', () => {
      const store = useAIContentStore.getState();
      store.updateOptions({
        tone: 'professional',
        style: 'informative',
        length: 'long',
      });

      const state = useAIContentStore.getState();
      expect(state.options.tone).toBe('professional');
      expect(state.options.style).toBe('informative');
      expect(state.options.length).toBe('long');
    });

    it('should update platforms and adjust activePlatform', () => {
      const store = useAIContentStore.getState();
      
      // Initially active platform is 'instagram'
      expect(store.activePlatform).toBe('instagram');

      // Update platforms to exclude current active
      store.updateOptions({ platforms: ['twitter', 'facebook'] });

      const state = useAIContentStore.getState();
      expect(state.options.platforms).toEqual(['twitter', 'facebook']);
      // Active platform should switch to first in new list
      expect(state.activePlatform).toBe('twitter');
    });

    it('should preserve activePlatform if still in platforms list', () => {
      const store = useAIContentStore.getState();
      store.updateOptions({ platforms: ['instagram', 'twitter'] });
      store.setActivePlatform('twitter');

      // Update platforms but keep twitter
      store.updateOptions({ platforms: ['facebook', 'twitter', 'linkedin'] });

      expect(useAIContentStore.getState().activePlatform).toBe('twitter');
    });
  });

  describe('Platform Toggle', () => {
    it('should add platform when toggling on', () => {
      const store = useAIContentStore.getState();
      const initialPlatforms = store.options.platforms;

      store.togglePlatform('twitter');

      const state = useAIContentStore.getState();
      expect(state.options.platforms).toContain('twitter');
      expect(state.options.platforms.length).toBe(initialPlatforms.length + 1);
    });

    it('should remove platform when toggling off', () => {
      const store = useAIContentStore.getState();
      store.updateOptions({ platforms: ['instagram', 'twitter', 'facebook'] });

      store.togglePlatform('twitter');

      const state = useAIContentStore.getState();
      expect(state.options.platforms).not.toContain('twitter');
      expect(state.options.platforms).toEqual(['instagram', 'facebook']);
    });

    it('should not allow removing last platform', () => {
      const store = useAIContentStore.getState();
      store.updateOptions({ platforms: ['instagram'] });

      store.togglePlatform('instagram');

      // Should still have at least one platform (default)
      const state = useAIContentStore.getState();
      expect(state.options.platforms.length).toBeGreaterThan(0);
    });

    it('should update activePlatform when toggling off current active', () => {
      const store = useAIContentStore.getState();
      store.updateOptions({ platforms: ['instagram', 'twitter'] });
      store.setActivePlatform('twitter');

      store.togglePlatform('twitter');

      // Should switch to remaining platform
      expect(useAIContentStore.getState().activePlatform).toBe('instagram');
    });
  });

  describe('Generation Management', () => {
    it('should set generation result', () => {
      const mockGeneration: AIGenerationResult = {
        platformContent: {
          instagram: { text: 'Test content', estimatedCharCount: 12 },
        },
        hashtags: ['test', 'ai'],
        summary: { tone: 'friendly', highlights: ['highlight1'] },
        analytics: {
          totalCharCount: 12,
          averageCharCount: 12,
          perPlatform: {},
        },
        generationId: 'test-id',
      };

      const store = useAIContentStore.getState();
      store.setGeneration(mockGeneration);

      const state = useAIContentStore.getState();
      expect(state.generation).toEqual(mockGeneration);
      expect(state.customHashtags).toEqual(['test', 'ai']);
      expect(state.variations).toEqual([]);
    });

    it('should clear streaming content when setting generation', () => {
      const store = useAIContentStore.getState();
      store.setStreamingContent('instagram', 'Streaming text', false);

      expect(useAIContentStore.getState().streamingContent.instagram).toBe('Streaming text');

      store.setGeneration({
        platformContent: { instagram: { text: 'Final content', estimatedCharCount: 13 } },
        hashtags: [],
        summary: {},
        analytics: { totalCharCount: 13, averageCharCount: 13, perPlatform: {} },
      });

      expect(useAIContentStore.getState().streamingContent).toEqual({});
    });

    it('should update platform content', () => {
      const store = useAIContentStore.getState();
      store.setGeneration({
        platformContent: {
          instagram: { text: 'Original', estimatedCharCount: 8 },
        },
        hashtags: [],
        summary: {},
        analytics: { totalCharCount: 8, averageCharCount: 8, perPlatform: {} },
      });

      store.updatePlatformContent('instagram', { text: 'Updated' });

      expect(useAIContentStore.getState().generation?.platformContent.instagram?.text).toBe(
        'Updated'
      );
    });

    it('should not update if platform content does not exist', () => {
      const store = useAIContentStore.getState();
      store.setGeneration({
        platformContent: {
          instagram: { text: 'Test', estimatedCharCount: 4 },
        },
        hashtags: [],
        summary: {},
        analytics: { totalCharCount: 4, averageCharCount: 4, perPlatform: {} },
      });

      store.updatePlatformContent('twitter', { text: 'Should not update' });

      expect(useAIContentStore.getState().generation?.platformContent.twitter).toBeUndefined();
    });
  });

  describe('Streaming Content', () => {
    it('should append streaming content', () => {
      const store = useAIContentStore.getState();
      store.setStreamingContent('instagram', 'Part 1');
      store.setStreamingContent('instagram', ' Part 2');

      expect(useAIContentStore.getState().streamingContent.instagram).toBe('Part 1 Part 2');
    });

    it('should replace streaming content when append is false', () => {
      const store = useAIContentStore.getState();
      store.setStreamingContent('instagram', 'Part 1');
      store.setStreamingContent('instagram', 'Replacement', false);

      expect(useAIContentStore.getState().streamingContent.instagram).toBe('Replacement');
    });
  });

  describe('Loading States', () => {
    it('should set generating state', () => {
      const store = useAIContentStore.getState();
      expect(store.isGenerating).toBe(false);

      store.setGenerating(true);
      expect(useAIContentStore.getState().isGenerating).toBe(true);

      store.setGenerating(false);
      expect(useAIContentStore.getState().isGenerating).toBe(false);
    });

    it('should set refining state', () => {
      const store = useAIContentStore.getState();
      expect(store.isRefining).toBe(false);

      store.setRefining(true);
      expect(useAIContentStore.getState().isRefining).toBe(true);
    });

    it('should set analyzing state', () => {
      const store = useAIContentStore.getState();
      expect(store.isAnalyzing).toBe(false);

      store.setAnalyzing(true);
      expect(useAIContentStore.getState().isAnalyzing).toBe(true);
    });

    it('should set hashtag loading state', () => {
      const store = useAIContentStore.getState();
      expect(store.isHashtagLoading).toBe(false);

      store.setHashtagLoading(true);
      expect(useAIContentStore.getState().isHashtagLoading).toBe(true);
    });
  });

  describe('History Management', () => {
    it('should set history', () => {
      const mockHistory = [
        {
          id: '1',
          prompt: 'Test 1',
          platform: 'instagram',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          prompt: 'Test 2',
          platform: 'twitter',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const store = useAIContentStore.getState();
      store.setHistory(mockHistory);

      expect(useAIContentStore.getState().history).toEqual(mockHistory);
    });

    it('should prepend to history', () => {
      const store = useAIContentStore.getState();
      const existing = {
        id: '1',
        prompt: 'Existing',
        platform: 'instagram',
        created_at: '2025-01-01T00:00:00Z',
      };
      store.setHistory([existing]);

      const newEntry = {
        id: '2',
        prompt: 'New',
        platform: 'twitter',
        created_at: '2025-01-02T00:00:00Z',
      };
      store.prependHistory(newEntry);

      const history = useAIContentStore.getState().history;
      expect(history[0]).toEqual(newEntry);
      expect(history[1]).toEqual(existing);
    });

    it('should limit history to 50 entries', () => {
      const store = useAIContentStore.getState();
      
      // Create 50 existing entries
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        prompt: `Entry ${i}`,
        platform: 'instagram',
        created_at: new Date().toISOString(),
      }));
      store.setHistory(existingHistory);

      // Add a new entry
      store.prependHistory({
        id: 'new',
        prompt: 'New entry',
        platform: 'twitter',
        created_at: new Date().toISOString(),
      });

      // Should still be 50 entries (oldest dropped)
      expect(useAIContentStore.getState().history.length).toBe(50);
      expect(useAIContentStore.getState().history[0].id).toBe('new');
    });
  });

  describe('Variations and Hashtags', () => {
    it('should set variations', () => {
      const variations = ['Variation 1', 'Variation 2', 'Variation 3'];
      
      const store = useAIContentStore.getState();
      store.setVariations(variations);

      expect(useAIContentStore.getState().variations).toEqual(variations);
    });

    it('should set custom hashtags', () => {
      const hashtags = ['custom1', 'custom2', 'custom3'];
      
      const store = useAIContentStore.getState();
      store.setCustomHashtags(hashtags);

      expect(useAIContentStore.getState().customHashtags).toEqual(hashtags);
    });
  });

  describe('Analysis', () => {
    it('should set analysis', () => {
      const analysis = {
        sentiment: 'positive' as const,
        readability: 'easy' as const,
        suggestions: ['Add CTA', 'Include emojis'],
        score: 85,
      };

      const store = useAIContentStore.getState();
      store.setAnalysis(analysis);

      expect(useAIContentStore.getState().analysis).toEqual(analysis);
    });
  });

  describe('Reset Functions', () => {
    it('should reset generation', () => {
      const store = useAIContentStore.getState();
      
      // Set up state
      store.setGeneration({
        platformContent: { instagram: { text: 'Test', estimatedCharCount: 4 } },
        hashtags: ['test'],
        summary: {},
        analytics: { totalCharCount: 4, averageCharCount: 4, perPlatform: {} },
      });
      store.setVariations(['var1', 'var2']);
      store.setCustomHashtags(['hash1', 'hash2']);
      store.setAnalysis({
        sentiment: 'positive',
        readability: 'easy',
        suggestions: [],
      });

      // Reset
      store.resetGeneration();

      const state = useAIContentStore.getState();
      expect(state.generation).toBeUndefined();
      expect(state.analysis).toBeUndefined();
      expect(state.streamingContent).toEqual({});
      expect(state.customHashtags).toEqual([]);
      expect(state.variations).toEqual([]);
    });

    it('should reset all state', () => {
      const store = useAIContentStore.getState();
      
      // Set up state
      store.setPrompt('Test prompt');
      store.updateOptions({ tone: 'professional', platforms: ['twitter', 'facebook'] });
      store.setGeneration({
        platformContent: { twitter: { text: 'Test', estimatedCharCount: 4 } },
        hashtags: ['test'],
        summary: {},
        analytics: { totalCharCount: 4, averageCharCount: 4, perPlatform: {} },
      });
      store.setHistory([
        { id: '1', prompt: 'Test', platform: 'instagram', created_at: new Date().toISOString() },
      ]);

      // Reset all
      store.resetAll();

      const state = useAIContentStore.getState();
      expect(state.prompt).toBe('');
      expect(state.options.tone).toBe('friendly'); // Default
      expect(state.options.platforms).toEqual(['instagram']); // Default
      expect(state.generation).toBeUndefined();
      expect(state.history).toEqual([]);
      expect(state.activePlatform).toBe('instagram'); // Default
      expect(state.variations).toEqual([]);
      expect(state.customHashtags).toEqual([]);
    });
  });
});
