const mockRequireWorkspaceContext = jest.fn();
const mockGetBrandProfile = jest.fn();

jest.mock('@/lib/workspace-context', () => ({
  requireWorkspaceContext: (...args: any[]) => mockRequireWorkspaceContext(...args),
}));

jest.mock('@/lib/intelligence/context', () => ({
  getBrandProfile: (...args: any[]) => mockGetBrandProfile(...args),
}));

import { GET } from '@/app/api/leverage/overview/route';

beforeAll(() => {
  if (!(Response as any).json) {
    (Response as any).json = (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
  }
});

type QueryState = {
  table: string;
  filters: Array<{ column: string; value: any; op: 'eq' | 'in' }>;
  limitValue?: number;
};

function createClientMock() {
  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, filters: [] };
    }

    select() {
      return this;
    }

    eq(column: string, value: any) {
      this.state.filters.push({ column, value, op: 'eq' });
      return this;
    }

    in(column: string, value: any) {
      this.state.filters.push({ column, value, op: 'in' });
      return this;
    }

    order() {
      return this;
    }

    limit(value: number) {
      this.state.limitValue = value;
      return this;
    }

    then(resolve: (value: any) => void) {
      return Promise.resolve(resolve(resolveQuery(this.state)));
    }
  }

  function filterValue(state: QueryState, column: string) {
    return state.filters.find((filter) => filter.column === column)?.value;
  }

  function resolveQuery(state: QueryState) {
    if (state.table === 'strategy_recommendations') {
      return {
        data: [
          {
            id: 'rec-1',
            type: 'timing',
            title: 'Use best-time windows',
            description: 'Schedule the strongest post into the measured YouTube slot.',
            priority: 'high',
            confidence_score: 0.81,
            metrics: {
              reasoningSummary: 'YouTube outcomes are strongest in the current best-time artifact.',
              evidence: ['10 YouTube outcomes synced.', 'Best-time worker found a stronger morning slot.'],
              expectedImpact: 'Improves chance of early engagement.',
              calendarAction: 'Push this recommendation to Calendar.',
              confidenceBreakdown: { performanceData: 0.7, brandMemory: 0.4 },
              dataCaveats: ['Small Instagram sample size.'],
              targetPlatforms: ['youtube'],
            },
          },
        ],
        error: null,
      };
    }

    if (state.table === 'posts') {
      const status = filterValue(state, 'status');
      const statuses = filterValue(state, 'status');
      if (status === 'published') return { count: 2, data: null, error: null };
      if (status === 'scheduled') return { count: 1, data: null, error: null };
      if (Array.isArray(statuses)) return { count: 1, data: null, error: null };
      return { count: 0, data: null, error: null };
    }

    if (state.table === 'social_accounts') {
      return { data: [{ id: 'acct-1', platform: 'youtube' }], error: null };
    }

    if (state.table === 'learning_events') {
      return {
        data: [{ id: 'event-1', event_type: 'metric_synced', source: 'xocial_ai', occurred_at: new Date().toISOString() }],
        error: null,
      };
    }

    return { data: [], error: null };
  }

  return {
    from: jest.fn((table: string) => new Query(table)),
  };
}

describe('Leverage overview explanations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns visible why explanations for generated overview insights', async () => {
    const client = createClientMock();
    mockGetBrandProfile.mockResolvedValue({
      voice: '',
      audience: '',
      products_offers: [],
      content_pillars: [],
      competitors: [],
      do_rules: [],
      dont_rules: [],
      approved_examples: [],
      rejected_examples: [],
      platform_preferences: {},
      confidence_score: 0,
    });
    mockRequireWorkspaceContext.mockResolvedValue({
      serviceClient: client,
      workspaceId: 'ws-1',
    });

    const response = await GET(new Request('http://localhost/api/leverage/overview') as any);
    const body = await response.json();
    const insights = body.data.insights;

    expect(response.status).toBe(200);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.every((insight: any) => insight.explanation?.reasonSummary)).toBe(true);
    expect(insights.find((insight: any) => insight.id === 'rec-1')?.explanation).toMatchObject({
      evidence: expect.arrayContaining(['10 YouTube outcomes synced.']),
      expectedImpact: 'Improves chance of early engagement.',
      calendarAction: 'Push this recommendation to Calendar.',
    });
  });
});
