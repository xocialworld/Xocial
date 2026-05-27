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
  getBrandProfile: jest.fn(),
}));

import { POST } from '@/app/api/calendar/ai-actions/route';

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

function createClientMock() {
  const calls: QueryState[] = [];

  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, operation: 'select', filters: [] };
    }

    select() {
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
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
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
          scheduledAt: '2026-05-28T10:00:00.000Z',
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
      scheduled_at: '2026-05-28T10:00:00.000Z',
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
});
