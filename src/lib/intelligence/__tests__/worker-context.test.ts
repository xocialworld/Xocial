import {
  WORKER_INTELLIGENCE_VERSION,
  WORKER_SCHEMA_VERSION,
  buildDataCaveats,
  buildWorkerMetadata,
  buildWorkerSystemPrompt,
  estimateWorkerConfidence,
  type WorkerIntelligenceContext,
} from '@/lib/intelligence/worker-context';

function makeContext(overrides: Partial<WorkerIntelligenceContext> = {}): WorkerIntelligenceContext {
  const dataCoverage = {
    brandProfile: { available: true, completion: 80 },
    contextSources: ['brand_profile', 'performance_summary'],
    outcomeSummaries: 12,
    metricSnapshots: 24,
    contentFeatures: 18,
    approvalSignals: 6,
    workerArtifacts: 4,
    strategyRecommendations: 3,
    learningEvents: 20,
  };

  return {
    aiContextPacket: {
      promptContext: 'XOCIAL MEMORY CONTEXT\nBrand voice: practical',
      contextMetadata: {
        usedBrandBrain: true,
        brandCompletion: 80,
        contextSources: dataCoverage.contextSources,
        selectedPlatforms: ['instagram'],
      },
      intelligenceContext: {
        brandProfile: {
          voice: 'practical',
          audience: 'creators',
          products_offers: [],
          content_pillars: ['education'],
          competitors: [],
          do_rules: [],
          dont_rules: [],
          approved_examples: [],
          rejected_examples: [],
          platform_preferences: {},
          confidence_score: 80,
        },
        selectedPlatforms: ['instagram'],
        contentPillars: ['education'],
        platformRules: {},
        recentTopPosts: [],
        recentFailedPosts: [],
        approvalPreferences: [],
        similarPastExamples: [],
        currentPerformanceSummary: {},
        audienceLanguage: [],
        activeKnowledgeSources: [],
      },
    },
    outcomeSummaries: [],
    metricSnapshots: [],
    contentFeatures: [],
    approvalSignals: [],
    workerArtifacts: [],
    strategyRecommendations: [],
    learningEvents: [],
    dataCoverage,
    dataCaveats: [],
    ...overrides,
  };
}

describe('worker intelligence context helpers', () => {
  it('scores confidence from coverage and caveats', () => {
    const context = makeContext();
    const confidence = estimateWorkerConfidence(context, { base: 0.4, aiGenerated: true });

    expect(confidence.score).toBeGreaterThan(0.55);
    expect(confidence.brandMemory).toBe(0.8);
    expect(confidence.caveatPenalty).toBe(0);
  });

  it('adds versioned metadata to worker artifacts', () => {
    const context = makeContext();
    const metadata = buildWorkerMetadata({
      promptVersion: 'performance-analyst-v2',
      context,
      aiGenerated: true,
      modelRunId: 'run-1',
      evidence: ['Instagram post p1 scored 82.'],
    });

    expect(metadata).toMatchObject({
      workerVersion: WORKER_INTELLIGENCE_VERSION,
      schemaVersion: WORKER_SCHEMA_VERSION,
      promptVersion: 'performance-analyst-v2',
      aiGenerated: true,
      modelRunId: 'run-1',
      evidence: ['Instagram post p1 scored 82.'],
    });
  });

  it('pushes low-coverage workers to lower confidence and caveats', () => {
    const sparseCoverage = {
      brandProfile: { available: false, completion: 0 },
      contextSources: [],
      outcomeSummaries: 0,
      metricSnapshots: 0,
      contentFeatures: 0,
      approvalSignals: 0,
      workerArtifacts: 0,
      strategyRecommendations: 0,
      learningEvents: 0,
    };
    const caveats = buildDataCaveats(sparseCoverage);
    const context = makeContext({ dataCoverage: sparseCoverage, dataCaveats: caveats });
    const confidence = estimateWorkerConfidence(context, { base: 0.4 });

    expect(caveats.length).toBeGreaterThan(3);
    expect(confidence.score).toBeLessThan(0.45);
    expect(buildWorkerSystemPrompt('Strategy Planner')).toContain(WORKER_INTELLIGENCE_VERSION);
  });
});
