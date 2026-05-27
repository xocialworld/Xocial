const mockRequireWorkspaceContext = jest.fn();
const mockRecordLearningEvent = jest.fn();

jest.mock('@/lib/workspace-context', () => ({
  requireWorkspaceContext: (...args: any[]) => mockRequireWorkspaceContext(...args),
}));

jest.mock('@/lib/intelligence/learning', () => {
  const actual = jest.requireActual('@/lib/intelligence/learning');
  return {
    ...actual,
    recordLearningEvent: (...args: any[]) => mockRecordLearningEvent(...args),
  };
});

import { POST } from '@/app/api/leverage/actions/route';

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
  operation: 'select' | 'insert' | 'update' | 'upsert';
  payload?: any;
  filters: Array<{ column: string; value: any }>;
};

function createClientMock(resolveQuery: (state: QueryState, mode?: 'single' | 'maybeSingle') => any) {
  const calls: QueryState[] = [];

  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, operation: 'select', filters: [] };
    }

    select() {
      return this;
    }

    update(payload: any) {
      this.state.operation = 'update';
      this.state.payload = payload;
      calls.push(this.state);
      return this;
    }

    upsert(payload: any) {
      this.state.operation = 'upsert';
      this.state.payload = payload;
      calls.push(this.state);
      return this;
    }

    eq(column: string, value: any) {
      this.state.filters.push({ column, value });
      return this;
    }

    single() {
      return Promise.resolve(resolveQuery(this.state, 'single'));
    }

    maybeSingle() {
      return Promise.resolve(resolveQuery(this.state, 'maybeSingle'));
    }
  }

  return {
    client: {
      from: jest.fn((table: string) => new Query(table)),
    },
    calls,
  };
}

describe('Leverage artifact actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an edited Brand Brain suggestion and records the learning action', async () => {
    const artifact = {
      id: 'artifact-1',
      workspace_id: 'ws-1',
      artifact_type: 'brand_suggestion',
      payload: {
        field: 'do_rules',
        operation: 'append',
        suggestedValue: ['Use clearer hooks'],
      },
    };
    const currentBrand = {
      workspace_id: 'ws-1',
      voice: 'practical',
      audience: 'creators',
      products_offers: [],
      content_pillars: [],
      competitors: [],
      do_rules: ['Use concrete examples'],
      dont_rules: [],
      approved_examples: [],
      rejected_examples: [],
    };

    const { client, calls } = createClientMock((state, mode) => {
      if (state.table === 'agent_artifacts' && state.operation === 'select' && mode === 'single') {
        return { data: artifact, error: null };
      }
      if (state.table === 'workspace_brand_profiles' && mode === 'maybeSingle') {
        return { data: currentBrand, error: null };
      }
      if (state.table === 'agent_artifacts' && state.operation === 'update' && mode === 'single') {
        return {
          data: {
            ...artifact,
            status: state.payload.status,
            payload: state.payload.payload,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    mockRequireWorkspaceContext.mockResolvedValue({
      serviceClient: client,
      workspaceId: 'ws-1',
      user: { id: 'user-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/leverage/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'artifact_accept',
          targetId: 'artifact-1',
          payload: {
            field: 'do_rules',
            applyMode: 'append',
            editedValue: ['Use sharper hooks', 'Show proof early'],
          },
        }),
      }) as any
    );
    const body = await response.json();

    const brandUpsert = calls.find((call) => call.table === 'workspace_brand_profiles');
    const artifactUpdate = calls.find(
      (call) => call.table === 'agent_artifacts' && call.operation === 'update'
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(brandUpsert?.payload.do_rules).toEqual([
      'Use concrete examples',
      'Use sharper hooks',
      'Show proof early',
    ]);
    expect(artifactUpdate?.payload).toMatchObject({
      status: 'accepted',
      payload: expect.objectContaining({
        applied: expect.objectContaining({
          field: 'do_rules',
          applyMode: 'append',
          edited: true,
        }),
      }),
    });
    expect(mockRecordLearningEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        actorUserId: 'user-1',
        eventType: 'recommendation_accepted',
        entityType: 'agent_artifact',
      })
    );
  });

  it('ignores a Brand Brain suggestion without updating the brand profile', async () => {
    const artifact = {
      id: 'artifact-ignore',
      workspace_id: 'ws-1',
      artifact_type: 'brand_suggestion',
      payload: {
        field: 'voice',
        operation: 'append',
        suggestedValue: 'Use a louder launch tone.',
      },
    };

    const { client, calls } = createClientMock((state, mode) => {
      if (state.table === 'agent_artifacts' && state.operation === 'select' && mode === 'single') {
        return { data: artifact, error: null };
      }
      if (state.table === 'agent_artifacts' && state.operation === 'update' && mode === 'single') {
        return {
          data: {
            ...artifact,
            status: state.payload.status,
            payload: state.payload.payload,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    mockRequireWorkspaceContext.mockResolvedValue({
      serviceClient: client,
      workspaceId: 'ws-1',
      user: { id: 'user-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/leverage/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'artifact_ignore',
          targetId: 'artifact-ignore',
        }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.artifact.status).toBe('ignored');
    expect(calls.some((call) => call.table === 'workspace_brand_profiles')).toBe(false);
    expect(mockRecordLearningEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        workspaceId: 'ws-1',
        eventType: 'recommendation_dismissed',
        entityId: 'artifact-ignore',
      })
    );
  });
});
