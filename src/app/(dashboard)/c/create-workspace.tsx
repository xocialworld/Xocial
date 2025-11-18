"use client";

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
const AIContentClient = dynamic(() => import('../../../components/features/ai/ai-content-client').then(m => m.AIContentClient), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">Loading AI tools...</div>
  ),
});
const PostComposer = dynamic(() => import('@/components/features/compose').then(m => m.PostComposer), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">Loading composer...</div>
  ),
});
import type { Platform } from '@/types';
import { toast } from 'sonner';
import { useAIContentStore } from '@/store/aiContentStore';
import { logger } from '@/lib/logger';

type ComposerPrefill = {
  id: string;
  content?: string;
  platforms?: string[];
  date?: string | Date | null;
  aiGenerationContext?: {
    generationId?: string;
    prompt?: string;
    model?: string;
    tone?: string;
    style?: string;
    length?: string;
  };
};

export function CreateWorkspace() {
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(null);

  const handleSchedule = useCallback(
    ({ content, platform }: { content: string; platform: Platform }) => {
      if (!content?.trim()) {
        toast.error('Generate content first.');
        return;
      }

      // Get AI generation context from store to pass to composer
      const state = useAIContentStore.getState();
      const aiContext = state.generation
        ? {
            generationId: state.generation.generationId,
            prompt: state.prompt,
            model: state.options.model,
            tone: state.options.tone,
            style: state.options.style,
            length: state.options.length,
          }
        : undefined;

      setPrefill({
        id: crypto.randomUUID(),
        content,
        platforms: platform ? [platform] : undefined,
        aiGenerationContext: aiContext,
      });

      toast.success('Content added to the composer.');

      // Log the handoff
      logger.ai('ai_schedule', {
        metadata: { platform, hasGenerationId: Boolean(aiContext?.generationId) },
      });

      // Smooth scroll to composer section
      setTimeout(() => {
        const composerSection = document.getElementById('create-composer');
        composerSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    []
  );

  return (
    <div className="space-y-8">
      {/* AI Content Studio Section */}
      <section>
        <AIContentClient onSchedule={handleSchedule} />
      </section>

      {/* Multi-platform Composer Section */}
      <section
        id="create-composer"
        className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
            Publish
          </p>
          <h2 className="text-2xl font-bold text-secondary-900">
            Multi-platform Composer
          </h2>
          <p className="text-sm text-secondary-600">
            Fine-tune AI copy, attach media, and schedule posts without changing pages.
          </p>
        </div>

        <PostComposer prefill={prefill} />
      </section>
    </div>
  );
}

