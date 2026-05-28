import { recordMetricSnapshotAndOutcome } from '@/lib/intelligence/metrics';

type QueryState = {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert';
  payload?: any;
  filters: Array<{ method: string; column: string; value: any }>;
  upsertOptions?: any;
};

function createSupabaseMock(resolveQuery: (state: QueryState, mode?: 'single' | 'maybeSingle') => any) {
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

    upsert(payload: any, options?: any) {
      this.state.operation = 'upsert';
      this.state.payload = payload;
      this.state.upsertOptions = options;
      calls.push(this.state);
      return this;
    }

    eq(column: string, value: any) {
      this.state.filters.push({ method: 'eq', column, value });
      return this;
    }

    neq(column: string, value: any) {
      this.state.filters.push({ method: 'neq', column, value });
      return this;
    }

    not(column: string, operator: string, value: any) {
      this.state.filters.push({ method: 'not', column, value: `${operator}:${value}` });
      return this;
    }

    in(column: string, value: any) {
      this.state.filters.push({ method: 'in', column, value });
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

describe('recordMetricSnapshotAndOutcome', () => {
  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('writes metric snapshots, normalized outcome summaries, learning events, and analyst tasks', async () => {
    const { client, calls } = createSupabaseMock((state) => {
      if (state.table === 'post_outcome_summaries' && state.operation === 'select') {
        return { data: [{ score: 40 }, { score: 50 }], error: null };
      }
      if (state.table === 'agent_tasks' && state.operation === 'select') {
        return { data: null, error: null };
      }
      if (state.table === 'agent_tasks' && state.operation === 'insert') {
        return { data: { id: 'task-1', status: 'queued' }, error: null };
      }
      return { data: null, error: null };
    });

    const result = await recordMetricSnapshotAndOutcome(client as any, {
      workspaceId: 'ws-1',
      postId: 'post-1',
      platformPostId: 'ig-1',
      socialAccountId: 'acct-1',
      platform: 'instagram',
      metrics: {
        views: 1200,
        reach: 900,
        likes: 120,
        comments: 14,
        shares: 9,
        saves: 20,
        clicks: 16,
      },
    });

    const snapshotInsert = calls.find((call) => call.table === 'platform_metric_snapshots');
    const outcomeUpsert = calls.find(
      (call) => call.table === 'post_outcome_summaries' && call.operation === 'upsert'
    );
    const taskInsert = calls.find(
      (call) => call.table === 'agent_tasks' && call.operation === 'insert'
    );

    expect(result.snapshotWritten).toBe(true);
    expect(result.outcomeWritten).toBe(true);
    expect(result.baseline).toBe(45);
    expect(result.score).toBeGreaterThan(45);
    expect(snapshotInsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      post_id: 'post-1',
      platform: 'instagram',
      views: 1200,
      likes: 120,
    });
    expect(outcomeUpsert?.upsertOptions).toEqual({ onConflict: 'post_id,platform' });
    expect(outcomeUpsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      post_id: 'post-1',
      platform: 'instagram',
      baseline_score: 45,
      metrics: expect.objectContaining({
        normalized: expect.objectContaining({
          views: 1200,
          likes: 120,
        }),
        baseline: expect.objectContaining({
          scope: 'workspace_platform',
          sampleSize: 2,
        }),
        scores: expect.objectContaining({
          latest: result.score,
        }),
        snapshotCount: 1,
      }),
    });
    expect(taskInsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      agent_type: 'performance_analyst',
      entity_type: 'post',
      entity_id: 'post-1',
    });
  });
});
