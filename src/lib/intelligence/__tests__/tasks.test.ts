import { processDueAgentTasks } from '@/lib/intelligence/tasks';

type QueryState = {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert';
  payload?: any;
  filters: Array<{ method: string; column: string; value: any }>;
  selected?: boolean;
};

function createQueryMock(resolveQuery: (state: QueryState, mode?: 'single' | 'maybeSingle') => any) {
  const calls: QueryState[] = [];

  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, operation: 'select', filters: [] };
    }

    select() {
      this.state.selected = true;
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

    upsert(payload: any) {
      this.state.operation = 'upsert';
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

    lte(column: string, value: any) {
      this.state.filters.push({ method: 'lte', column, value });
      return this;
    }

    lt(column: string, value: any) {
      this.state.filters.push({ method: 'lt', column, value });
      return this;
    }

    order() {
      return this;
    }

    limit() {
      return this;
    }

    maybeSingle() {
      return Promise.resolve(resolveQuery(this.state, 'maybeSingle'));
    }

    single() {
      return Promise.resolve(resolveQuery(this.state, 'single'));
    }

    then(resolve: any, reject: any) {
      return Promise.resolve(resolveQuery(this.state)).then(resolve, reject);
    }
  }

  return {
    client: {
      from: jest.fn((table: string) => new Query(table)),
    },
    calls,
  };
}

function hasFilter(state: QueryState, column: string, value: any) {
  return state.filters.some((filter) => filter.column === column && filter.value === value);
}

describe('processDueAgentTasks', () => {
  it('claims queued content classifier tasks and writes feature snapshots', async () => {
    const queuedTask = {
      id: 'task-1',
      workspace_id: 'ws-1',
      agent_type: 'content_classifier',
      status: 'queued',
      priority: 6,
      entity_type: 'post',
      entity_id: 'post-1',
      input_payload: { platforms: ['instagram', 'youtube'] },
      retry_count: 0,
    };
    const post = {
      id: 'post-1',
      workspace_id: 'ws-1',
      platforms: ['instagram', 'youtube'],
      content: {
        instagram: {
          text: 'How to launch a better creator workflow? Comment below and save this.',
        },
        youtube: {
          text: 'New launch walkthrough for creators. Subscribe for the next guide.',
        },
      },
      media: [{ type: 'video' }],
      metadata: { ai: { generationId: 'gen-1' } },
    };
    const brandProfile = {
      voice: 'practical',
      audience: 'creators',
      products_offers: ['workflow'],
      content_pillars: ['launch'],
      competitors: [],
      do_rules: [],
      dont_rules: [],
      approved_examples: [],
      rejected_examples: [],
      platform_preferences: {},
      confidence_score: 75,
    };

    const { client, calls } = createQueryMock((state, mode) => {
      if (state.table === 'agent_tasks' && state.operation === 'select') {
        if (hasFilter(state, 'status', 'running')) return { data: [], error: null };
        return { data: [queuedTask], error: null };
      }
      if (state.table === 'agent_tasks' && state.operation === 'update') {
        if (state.payload.status === 'running') {
          return { data: queuedTask, error: null };
        }
        return { data: null, error: null };
      }
      if (state.table === 'posts' && mode === 'maybeSingle') {
        return { data: post, error: null };
      }
      if (state.table === 'workspace_brand_profiles' && mode === 'maybeSingle') {
        return { data: brandProfile, error: null };
      }
      return { data: null, error: null };
    });

    const result = await processDueAgentTasks(client as any, {
      limit: 5,
      now: new Date('2026-05-27T10:00:00.000Z'),
    });

    const featureInsert = calls.find(
      (call) => call.table === 'content_feature_snapshots' && call.operation === 'insert'
    );

    expect(result).toMatchObject({ processed: 1, succeeded: 1, failed: 0 });
    expect(featureInsert?.payload).toHaveLength(2);
    expect(featureInsert?.payload[0]).toMatchObject({
      workspace_id: 'ws-1',
      post_id: 'post-1',
      platform: 'instagram',
      hook_type: 'question',
      cta_type: 'comment',
      media_type: 'video',
      source: 'ai',
      features: expect.objectContaining({
        workerVersion: 'worker-v2',
        schemaVersion: 2,
        classificationMethod: 'deterministic_rules',
      }),
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'agent_tasks',
          operation: 'update',
          payload: expect.objectContaining({ status: 'succeeded' }),
        }),
      ])
    );
  });

  it('recovers stale running tasks before processing new work', async () => {
    const staleTask = {
      id: 'task-stale',
      workspace_id: 'ws-1',
      agent_type: 'performance_analyst',
      status: 'running',
      retry_count: 0,
      started_at: '2026-05-27T09:00:00.000Z',
      input_payload: {},
    };

    const { client, calls } = createQueryMock((state) => {
      if (state.table === 'agent_tasks' && state.operation === 'select') {
        if (hasFilter(state, 'status', 'running')) return { data: [staleTask], error: null };
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });

    const result = await processDueAgentTasks(client as any, {
      limit: 5,
      now: new Date('2026-05-27T10:00:00.000Z'),
      staleAfterMinutes: 20,
      workspaceId: 'ws-1',
    });

    expect(result.recoveredStale).toBe(1);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'agent_tasks',
          operation: 'update',
          payload: expect.objectContaining({
            status: 'queued',
            retry_count: 1,
            started_at: null,
          }),
        }),
      ])
    );
  });
});
