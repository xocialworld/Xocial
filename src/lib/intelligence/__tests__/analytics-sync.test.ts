jest.mock('@/lib/encryption', () => ({
  decryptToken: jest.fn(() => 'plain-token'),
}));

jest.mock('@/lib/oauth/youtube', () => ({
  getYouTubeVideoStats: jest.fn(async () => ({
    statistics: {
      viewCount: '1000',
      likeCount: '80',
      commentCount: '12',
      favoriteCount: '3',
    },
  })),
}));

import { decryptToken } from '@/lib/encryption';
import { getYouTubeVideoStats } from '@/lib/oauth/youtube';
import { syncPlatformPostMetrics } from '@/lib/intelligence/analytics-sync';

type QueryState = {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert';
  payload?: any;
  filters: Array<{ method: string; column: string; value: any }>;
  upsertOptions?: any;
};

function createSupabaseMock() {
  const calls: QueryState[] = [];

  class Query {
    state: QueryState;

    constructor(table: string) {
      this.state = { table, operation: 'select', filters: [] };
      calls.push(this.state);
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
      return Promise.resolve(resolveQuery(this.state));
    }

    single() {
      return Promise.resolve(resolveQuery(this.state));
    }

    then(resolve: any, reject: any) {
      return Promise.resolve(resolveQuery(this.state)).then(resolve, reject);
    }
  }

  function resolveQuery(state: QueryState) {
    if (state.table === 'social_accounts') {
      return {
        data: {
          id: 'acct-1',
          workspace_id: 'ws-1',
          platform: 'youtube',
          account_id: 'channel-1',
          access_token: 'encrypted-token',
          token_expires_at: new Date(Date.now() + 60_000).toISOString(),
          is_active: true,
          metadata: {},
        },
        error: null,
      };
    }

    if (state.table === 'post_outcome_summaries' && state.operation === 'select') {
      return { data: [{ score: 45 }, { score: 55 }, { score: 65 }], error: null };
    }

    if (state.table === 'platform_metric_snapshots' && state.operation === 'select') {
      return { data: [], error: null };
    }

    if (state.table === 'agent_tasks' && state.operation === 'select') {
      return { data: null, error: null };
    }

    if (state.table === 'content_feature_snapshots' && state.operation === 'select') {
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  return {
    client: {
      from: jest.fn((table: string) => new Query(table)),
    },
    calls,
  };
}

describe('syncPlatformPostMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('uses the exact social account, decrypts the token, and writes canonical analytics outputs', async () => {
    const { client, calls } = createSupabaseMock();

    const result = await syncPlatformPostMetrics(client as any, {
      workspaceId: 'ws-1',
      postId: 'post-1',
      platform: 'youtube',
      platformPostId: 'video-1',
      socialAccountId: 'acct-1',
      publishedAt: new Date().toISOString(),
      syncSource: 'test_sync',
    });

    const accountSelect = calls.find((call) => call.table === 'social_accounts');
    const analyticsInsert = calls.find((call) => call.table === 'post_analytics' && call.operation === 'insert');
    const snapshotInsert = calls.find((call) => call.table === 'platform_metric_snapshots' && call.operation === 'insert');
    const outcomeUpsert = calls.find((call) => call.table === 'post_outcome_summaries' && call.operation === 'upsert');

    expect(result.status).toBe('synced');
    expect(accountSelect?.filters).toEqual(
      expect.arrayContaining([{ method: 'eq', column: 'id', value: 'acct-1' }])
    );
    expect(decryptToken).toHaveBeenCalledWith('encrypted-token');
    expect(getYouTubeVideoStats).toHaveBeenCalledWith('plain-token', 'video-1');
    expect(analyticsInsert?.payload).toMatchObject({
      post_id: 'post-1',
      platform: 'youtube',
      views: 1000,
      likes: 80,
      comments: 12,
    });
    expect(snapshotInsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      social_account_id: 'acct-1',
      platform_post_id: 'video-1',
      platform: 'youtube',
      views: 1000,
    });
    expect(outcomeUpsert?.payload).toMatchObject({
      workspace_id: 'ws-1',
      post_id: 'post-1',
      platform: 'youtube',
      metrics: expect.objectContaining({
        syncSource: 'test_sync',
        baseline: expect.objectContaining({ scope: 'workspace_platform' }),
      }),
    });
  });
});
