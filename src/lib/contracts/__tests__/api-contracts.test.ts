import { unwrapEnvelope, getApiErrorMessage } from '@/lib/contracts/api';
import {
  dbPlatformPostToContract,
  dbPostActivityToContract,
  dbPostToContract,
} from '@/lib/contracts/posts';

describe('API contracts', () => {
  it('unwraps canonical success envelopes while preserving legacy payloads', () => {
    expect(unwrapEnvelope({ success: true, data: { posts: [1, 2] } })).toEqual({ posts: [1, 2] });
    expect(unwrapEnvelope({ posts: [1, 2] })).toEqual({ posts: [1, 2] });
  });

  it('extracts user-safe error messages from canonical and legacy payloads', () => {
    expect(getApiErrorMessage({ error: { message: 'Canonical failure' } })).toBe(
      'Canonical failure'
    );
    expect(getApiErrorMessage({ message: 'Legacy failure' })).toBe('Legacy failure');
    expect(getApiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});

describe('post data contracts', () => {
  it('normalizes posts, platform evidence, and activity rows', () => {
    expect(
      dbPostToContract({
        id: 'post-1',
        workspace_id: 'ws-1',
        content: '{"default":{"text":"Hello"}}',
        platforms: ['instagram'],
        status: 'draft',
        media: [],
        created_at: '2026-05-24T00:00:00.000Z',
        metadata: '{"ai":{"model":"test"}}',
      })
    ).toEqual(
      expect.objectContaining({
        id: 'post-1',
        workspaceId: 'ws-1',
        content: { default: { text: 'Hello' } },
        metadata: { ai: { model: 'test' } },
      })
    );

    expect(
      dbPlatformPostToContract({
        id: 'platform-post-1',
        post_id: 'post-1',
        platform: 'youtube',
        platform_post_id: 'yt-1',
        permalink: 'https://youtube.com/watch?v=yt-1',
        status: 'published',
        attempt_count: 2,
      })
    ).toEqual(
      expect.objectContaining({
        postId: 'post-1',
        platformPostId: 'yt-1',
        attemptCount: 2,
      })
    );

    expect(
      dbPostActivityToContract({
        id: 'event-1',
        post_id: 'post-1',
        event_type: 'publish_succeeded',
        source: 'cron',
        platform: 'youtube',
        occurred_at: '2026-05-24T00:00:00.000Z',
      })
    ).toEqual(
      expect.objectContaining({
        postId: 'post-1',
        eventType: 'publish_succeeded',
        source: 'cron',
        platform: 'youtube',
      })
    );
  });
});
