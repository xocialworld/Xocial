import { formatAIContextForPrompt, getContextSources } from '../context';
import type { IntelligenceContext } from '@/types/intelligence';

const baseContext: IntelligenceContext = {
  brandProfile: {
    voice: 'Direct founder-led voice',
    audience: 'Bootstrapped creators and agency operators',
    products_offers: ['Social scheduling workspace'],
    content_pillars: ['Proof', 'Education'],
    competitors: ['Generic scheduler'],
    do_rules: ['Use concrete examples'],
    dont_rules: ['Avoid vague hype'],
    approved_examples: ['Here is a concise approved caption.'],
    rejected_examples: ['This rejected caption sounds generic.'],
    platform_preferences: {
      instagram: 'Short hook, proof, then CTA',
    },
    confidence_score: 72,
  },
  selectedPlatforms: ['instagram'],
  campaignGoal: 'Increase trial signups',
  contentPillars: ['Proof', 'Education'],
  platformRules: {},
  recentTopPosts: [
    {
      platforms: ['instagram'],
      content: { instagram: { text: 'A winning post about proof.' } },
    },
  ],
  recentFailedPosts: [],
  approvalPreferences: [
    {
      signalType: 'approval_rejected',
      reasonLabels: ['too formal'],
      comment: 'Make it sound less corporate.',
    },
  ],
  feedbackSignals: [
    {
      signalType: 'mark_off_brand',
      reasonType: 'wrong_audience',
      comment: 'This is not how our audience describes the problem.',
    },
  ],
  similarPastExamples: [
    {
      platforms: ['instagram'],
      content: { instagram: { text: 'A similar proof-led launch post.' } },
    },
  ],
  currentPerformanceSummary: {
    instagram: { score: 81, reason: 'Saves are above baseline.' },
  },
  audienceLanguage: ['operators', 'workflow', 'proof'],
  activeKnowledgeSources: [
    {
      title: 'Campaign brief',
      content: 'Lead with recent agency workflow pain.',
    },
  ],
};

describe('AI context prompt formatting', () => {
  it('formats Brand Brain, performance, approvals, and knowledge into prompt context', () => {
    const prompt = formatAIContextForPrompt(baseContext, {
      contentPillar: 'Proof',
      query: 'Write a launch post',
    });

    expect(prompt).toContain('XOCIAL MEMORY CONTEXT');
    expect(prompt).toContain('Brand voice: Direct founder-led voice');
    expect(prompt).toContain('Audience: Bootstrapped creators and agency operators');
    expect(prompt).toContain('Content pillars: Proof; Education');
    expect(prompt).toContain('Brand do-not rules: Avoid vague hype');
    expect(prompt).toContain('Recent winners:');
    expect(prompt).toContain('Similar past examples:');
    expect(prompt).toContain('Audience language signals:');
    expect(prompt).toContain('Approval preferences:');
    expect(prompt).toContain('Performance summary:');
    expect(prompt).toContain('Knowledge sources:');
    expect(prompt).toContain('User request/query: Write a launch post');
  });

  it('reports context sources available to AI actions', () => {
    expect(getContextSources(baseContext)).toEqual(
      expect.arrayContaining([
        'platform_rules',
        'brand_profile',
        'recent_top_posts',
        'similar_past_examples',
        'approval_preferences',
        'ai_feedback',
        'audience_language',
        'performance_summary',
        'knowledge_sources',
      ])
    );
  });
});
