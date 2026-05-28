import {
  evaluateLearningLoopReadiness,
  evaluateWorkerArtifactQuality,
} from '../evaluation';

describe('intelligence evaluation helpers', () => {
  it('scores worker artifacts higher when they include evidence, reasoning, and action', () => {
    const result = evaluateWorkerArtifactQuality({
      confidence: 0.75,
      summary: 'Saves are above baseline.',
      payload: {
        evidence: ['Instagram post scored 82', 'Saves were above account baseline'],
        recommendedActions: ['Reuse the proof-led hook'],
      },
    });

    expect(result.score).toBeGreaterThan(0.6);
    expect(result.missing).toEqual([]);
  });

  it('reports missing learning loop requirements', () => {
    const readiness = evaluateLearningLoopReadiness({
      learningEvents: 4,
      outcomeSummaries: 1,
      approvalSignals: 0,
      feedbackActions: 1,
      brandCompletion: 25,
      workerArtifacts: 1,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(
      expect.arrayContaining(['outcome_summaries', 'approval_signals', 'brand_brain'])
    );
  });
});
