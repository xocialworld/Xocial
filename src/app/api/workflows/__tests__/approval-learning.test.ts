const mockCreateClient = jest.fn();
const mockCreateServiceRoleClient = jest.fn();
const mockRecordLearningEvent = jest.fn();
const mockQueuePostIntelligenceTasks = jest.fn();
const mockEnqueueAgentTask = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

jest.mock('@/lib/api-middleware', () => ({
  createServiceRoleClient: (...args: any[]) => mockCreateServiceRoleClient(...args),
}));

jest.mock('@/lib/intelligence/learning', () => ({
  recordLearningEvent: (...args: any[]) => mockRecordLearningEvent(...args),
}));

jest.mock('@/lib/intelligence/tasks', () => ({
  enqueueAgentTask: (...args: any[]) => mockEnqueueAgentTask(...args),
  queuePostIntelligenceTasks: (...args: any[]) => mockQueuePostIntelligenceTasks(...args),
}));

import { POST } from '@/app/api/workflows/approvals/route';

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
  filters: Array<{ method: string; column: string; value: any }>;
};

function createClientMock(kind: 'user' | 'service') {
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
      this.state.filters.push({ method: 'eq', column, value });
      return this;
    }

    in(column: string, value: any) {
      this.state.filters.push({ method: 'in', column, value });
      return this;
    }

    single() {
      if (kind === 'user' && this.state.table === 'posts' && this.state.operation === 'select') {
        return Promise.resolve({
          data: {
            workspace_id: 'ws-1',
            scheduled_at: null,
            platforms: ['instagram', 'linkedin'],
          },
          error: null,
        });
      }
      if (kind === 'user' && this.state.table === 'workspace_members') {
        return Promise.resolve({ data: { role: 'owner' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    then(resolve: any, reject: any) {
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    }
  }

  return {
    client: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => new Query(table)),
    },
    calls,
  };
}

describe('approval learning signals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores structured rejection reasons and forwards them to Brand Learner', async () => {
    const userClient = createClientMock('user');
    const serviceClient = createClientMock('service');
    mockCreateClient.mockResolvedValue(userClient.client);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient.client);

    const response = await POST(
      new Request('http://localhost/api/workflows/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: 'post-1',
          action: 'reject',
          comment: 'This does not sound like the client.',
          reasonIds: ['too_formal', 'weak_cta', 'not_a_real_reason'],
        }),
      }) as any
    );
    const body = await response.json();
    const learningSignal = serviceClient.calls.find(
      (call) => call.table === 'approval_learning_signals'
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reasons.map((reason: any) => reason.id)).toEqual(['too_formal', 'weak_cta']);
    expect(learningSignal?.payload).toMatchObject({
      workspace_id: 'ws-1',
      post_id: 'post-1',
      actor_user_id: 'user-1',
      signal_type: 'rejected',
      comment: 'This does not sound like the client.',
      metadata: expect.objectContaining({
        nextStatus: 'rejected',
        reasonIds: ['too_formal', 'weak_cta'],
        reasonLabels: ['Too formal', 'Weak CTA'],
        reasonCategories: ['tone', 'cta'],
      }),
    });
    expect(mockRecordLearningEvent).toHaveBeenCalledWith(
      serviceClient.client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        eventType: 'approval_rejected',
        metadata: expect.objectContaining({
          reasonIds: ['too_formal', 'weak_cta'],
          reasonSummary: 'Too formal, Weak CTA',
        }),
      })
    );
    expect(mockEnqueueAgentTask).toHaveBeenCalledWith(
      serviceClient.client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        agentType: 'brand_learner',
        inputPayload: expect.objectContaining({
          action: 'reject',
          reasonIds: ['too_formal', 'weak_cta'],
          reasonCategories: ['tone', 'cta'],
          trigger: 'approval_action',
        }),
      })
    );
    expect(mockQueuePostIntelligenceTasks).toHaveBeenCalledWith(
      serviceClient.client,
      expect.objectContaining({
        reason: 'approval_rejected',
        platforms: ['instagram', 'linkedin'],
      })
    );
  });
});
