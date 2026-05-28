import {
  explainPlatformOutcome,
  scorePlatformMetrics,
  standardizePlatformMetrics,
} from '../platform-metrics';

describe('platform metric adapters', () => {
  it('normalizes YouTube statistics into canonical metrics', () => {
    const metrics = standardizePlatformMetrics('youtube', {
      statistics: {
        viewCount: '1200',
        likeCount: '90',
        commentCount: '12',
        favoriteCount: '3',
      },
      estimatedMinutesWatched: 40,
    });

    expect(metrics.views).toBe(1200);
    expect(metrics.likes).toBe(90);
    expect(metrics.comments).toBe(12);
    expect(metrics.saves).toBe(3);
    expect(metrics.platformWeights).toHaveProperty('watch_time_seconds');
  });

  it('weights Instagram saves and shares as stronger outcome signals', () => {
    const metrics = standardizePlatformMetrics('instagram', {
      reach: 900,
      likes: 60,
      saves: 25,
      shares: 18,
      comments: 8,
    });

    const score = scorePlatformMetrics('instagram', metrics);
    expect(score).toBeGreaterThan(45);
    expect(explainPlatformOutcome('instagram', score, 30, metrics)).toContain('instagram');
  });
});
