function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function evaluateWorkerArtifactQuality(artifact: Record<string, any>) {
  const payload = asRecord(artifact.payload);
  const sourceData = asRecord(artifact.source_data);
  const confidence = Number(artifact.confidence || payload.confidenceScore || 0);
  const evidenceCount = arrayLength(payload.evidence || sourceData.evidence);
  const hasReasoning = Boolean(
    payload.reasoningSummary ||
      payload.reasoning_summary ||
      payload.reason ||
      payload.narrative ||
      payload.executiveSummary ||
      artifact.summary
  );
  const hasAction =
    arrayLength(payload.recommendedActions) > 0 ||
    arrayLength(payload.nextActions) > 0 ||
    arrayLength(payload.action_items) > 0 ||
    Boolean(payload.calendarAction || payload.suggestedValue);
  const caveatCount = arrayLength(payload.dataCaveats || sourceData.dataCaveats);
  const score =
    Math.min(0.35, confidence * 0.35) +
    Math.min(0.25, evidenceCount * 0.08) +
    (hasReasoning ? 0.2 : 0) +
    (hasAction ? 0.15 : 0) -
    Math.min(0.1, caveatCount * 0.025);

  return {
    score: Number(Math.max(0, Math.min(1, score)).toFixed(2)),
    evidenceCount,
    hasReasoning,
    hasAction,
    caveatCount,
    confidence,
    missing: [
      evidenceCount === 0 ? 'evidence' : '',
      !hasReasoning ? 'reasoning' : '',
      !hasAction ? 'action' : '',
      confidence < 0.45 ? 'confidence' : '',
    ].filter(Boolean),
  };
}

export function evaluateLearningLoopReadiness(input: {
  learningEvents: number;
  outcomeSummaries: number;
  approvalSignals: number;
  feedbackActions: number;
  brandCompletion: number;
  workerArtifacts: number;
}) {
  const checks = [
    { key: 'learning_events', met: input.learningEvents >= 10, weight: 0.18 },
    { key: 'outcome_summaries', met: input.outcomeSummaries >= 5, weight: 0.22 },
    { key: 'approval_signals', met: input.approvalSignals >= 3, weight: 0.16 },
    { key: 'feedback_actions', met: input.feedbackActions >= 3, weight: 0.14 },
    { key: 'brand_brain', met: input.brandCompletion >= 50, weight: 0.18 },
    { key: 'worker_artifacts', met: input.workerArtifacts >= 3, weight: 0.12 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.met ? check.weight : 0), 0);

  return {
    score: Number(score.toFixed(2)),
    checks,
    missing: checks.filter((check) => !check.met).map((check) => check.key),
    ready: score >= 0.72,
  };
}
