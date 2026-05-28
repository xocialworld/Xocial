const mockRequireWorkspaceContext = jest.fn();
const mockRecordLearningEvent = jest.fn();
const mockQueuePostIntelligenceTasks = jest.fn();
const mockEnqueueAgentTask = jest.fn();

jest.mock('@/lib/workspace-context', () => ({
  requireWorkspaceContext: (...args: any[]) => mockRequireWorkspaceContext(...args),
}));

jest.mock('@/lib/intelligence/learning', () => ({
  recordLearningEvent: (...args: any[]) => mockRecordLearningEvent(...args),
}));

jest.mock('@/lib/intelligence/tasks', () => ({
  enqueueAgentTask: (...args: any[]) => mockEnqueueAgentTask(...args),
  queuePostIntelligenceTasks: (...args: any[]) => mockQueuePostIntelligenceTasks(...args),
}));

jest.mock('@/lib/intelligence/context', () => ({
  getBrandProfile: jest.fn(async () => ({
    voice: 'Direct founder-led voice',
    audience: 'Creators',
    products_offers: [],
    content_pillars: ['Proof', 'Education'],
    competitors: [],
    do_rules: ['Use proof'],
    dont_rules: ['Avoid vague hype'],
    approved_examples: [],
    rejected_examples: [],
    platform_preferences: { facebook: 'Proof-led updates' },
    confidence_score: 68,
  })),
  buildAIContextPacket: jest.fn(async () => ({
    promptContext: 'XOCIAL MEMORY CONTEXT\nBrand voice: Direct founder-led voice',
    contextMetadata: {
      usedBrandBrain: true,
      brandCompletion: 68,
      contextSources: ['brand_profile'],
      selectedPlatforms: ['instagram', 'linkedin'],
    },
    intelligenceContext: {
      brandProfile: {
        voice: 'Direct founder-led voice',
        audience: 'Creators',
        products_offers: [],
        content_pillars: ['Proof'],
        competitors: [],
        do_rules: ['Use proof'],
        dont_rules: ['Avoid vague hype'],
        approved_examples: [],
        rejected_examples: [],
        platform_preferences: {},
        confidence_score: 68,
      },
      selectedPlatforms: ['instagram', 'linkedin'],
      contentPillars: ['Proof'],
      platformRules: {},
      recentTopPosts: [],
      recentFailedPosts: [],
      approvalPreferences: [],
      similarPastExamples: [],
      currentPerformanceSummary: {},
      audienceLanguage: [],
      activeKnowledgeSources: [],
    },
  })),
}));

import { GET, POST } from '@/app/api/calendar/ai-actions/route';

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
  operation: 'select' | 'insert' | 'update';
  payload?: any;
  filters: Array<{ column: string; value: any }>;
};

function createClientMock(tableData: Record<string, any[]> = {}) {
  const calls: QueryState[] = [];

  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, operation: 'select', filters: [] };
    }

    select() {
      return this;
    }

    order() {
      return this;
    }

    limit() {
      return this;
    }

    in(column: string, value: any) {
      this.state.filters.push({ column, value });
      return this;
    }

    insert(payload: any) {
      this.state.operation = 'insert';
      this.state.payload = payload;
      calls.push(this.state);
      return this;
    }

    update(payload: any) {
      this.state.operation = 'update';
      this.state.payload = payload;
      calls.push(this.state);
      return this;
    }

    eq(column: string, value: any) {
      this.state.filters.push({ column, value });
      return this;
    }

    maybeSingle() {
      return Promise.resolve({ data: null, error: null });
    }

    single() {
      if (this.state.table === 'posts' && this.state.operation === 'insert') {
        return Promise.resolve({
          data: {
            id: 'post-1',
            ...this.state.payload,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }

    then(resolve: any, reject: any) {
      return Promise.resolve({ data: tableData[this.state.table] || [], error: null }).then(resolve, reject);
    }
  }

  return {
    client: {
      from: jest.fn((table: string) => new Query(table)),
    },
    calls,
  };
}

describe('Calendar AI actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft post from a calendar AI action and queues learning tasks', async () => {
    const { client, calls } = createClientMock();
    mockRequireWorkspaceContext.mockResolvedValue({
      serviceClient: client,
      workspaceId: 'ws-1',
      user: { id: 'user-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/calendar/ai-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create_pillar_balance_draft',
          title: 'Founder proof post',
          description: 'Turn recent customer proof into platform copy.',
          scheduledAt: '2026-06-02T10:00:00.000Z',
          platforms: ['instagram', 'linkedin'],
          pillar: 'Proof',
        }),
      }) as any
    );
    const body = await response.json();
    const postInsert = calls.find((call) => call.table === 'posts' && call.operation === 'insert');

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(postInsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      status: 'draft',
      scheduled_at: '2026-06-02T10:00:00.000Z',
      platforms: ['instagram', 'linkedin'],
      tags: ['calendar-ai'],
      created_by: 'user-1',
      metadata: expect.objectContaining({
        aiCalendar: expect.objectContaining({
          type: 'create_pillar_balance_draft',
          pillar: 'Proof',
          source: 'calendar_ai_actions',
        }),
      }),
    });
    expect(postInsert?.payload.content.instagram.text).toContain('Founder proof post');
    expect(postInsert?.payload.content.instagram.text).toContain('Brand voice: Direct founder-led voice');
    expect(postInsert?.payload.metadata.aiCalendar.contextMetadata).toMatchObject({
      brandCompletion: 68,
    });
    expect(mockRecordLearningEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        actorUserId: 'user-1',
        eventType: 'calendar_ai_draft_created',
      })
    );
    expect(mockQueuePostIntelligenceTasks).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        postId: 'post-1',
        platforms: ['instagram', 'linkedin'],
        reason: 'calendar_ai_draft_created',
      })
    );
  });

  it('returns operational strategy data and suppresses ignored calendar suggestions', async () => {
    const { client } = createClientMock({
      posts: [
        {
          id: 'post-1',
          status: 'published',
          platforms: ['facebook'],
          content: { facebook: { text: 'Published post' } },
          published_at: '2026-05-28T10:00:00.000Z',
          scheduled_at: null,
          created_at: '2026-05-28T09:00:00.000Z',
          metadata: {},
        },
      ],
      strategy_recommendations: [
        {
          id: 'rec-1',
          type: 'campaign',
          title: 'Launch proof campaign',
          description: 'Turn proof into a focused campaign.',
          priority: 'high',
          confidence_score: 0.8,
          metrics: {
            contentPillar: 'Proof',
            calendarAction: 'Create a campaign draft.',
            evidence: ['Proof posts are underrepresented.'],
          },
        },
      ],
      agent_artifacts: [
        {
          id: 'artifact-1',
          artifact_type: 'best_time_recommendation',
          summary: 'Facebook worked best at 10:00.',
          payload: {
            recommendations: [{ platform: 'facebook', hour: 10, averageScore: 72 }],
          },
        },
      ],
      content_feature_snapshots: [
        { pillar: 'Proof', topic: 'Proof', platform: 'facebook', created_at: '2026-05-20T10:00:00.000Z' },
      ],
      social_accounts: [{ id: 'account-1', platform: 'facebook', status: 'active' }],
      ai_feedback_actions: [{ target_id: 'campaign-gap-rec-1', action: 'ignore' }],
    });
    mockRequireWorkspaceContext.mockResolvedValue({
      serviceClient: client,
      workspaceId: 'ws-1',
      user: { id: 'user-1' },
    });

    const url = new URL(
      'http://localhost/api/calendar/ai-actions?from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z'
    );
    const response = await GET(Object.assign(new Request(url), { nextUrl: url }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.strategyHealth).toMatchObject({
      emptyDays: expect.any(Number),
      bestTimeSlots: 1,
      recommendations: expect.any(Number),
    });
    expect(body.data.dayIntelligence.length).toBeGreaterThan(0);
    expect(body.data.actions.some((action: any) => action.id === 'campaign-gap-rec-1')).toBe(false);
    expect(body.data.actions[0]).toEqual(
      expect.objectContaining({
        dateKey: expect.any(String),
        slotType: expect.any(String),
        explanation: expect.objectContaining({
          calendarAction: expect.any(String),
        }),
      })
    );
  });
});
