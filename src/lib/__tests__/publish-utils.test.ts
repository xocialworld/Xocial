import {
  extractExternalIds,
  parseAccountIdsFromMetadata,
  buildPlatformContentPayload,
  inferMediaTypeFromMedia,
  recordPlatformPosts,
} from '@/lib/platforms/publish-utils';
import type { PublishResult } from '@/lib/platforms/publisher';

describe('publish utils', () => {
  it('extracts external ids for successful publishes only', () => {
    const results: PublishResult[] = [
      {
        platform: 'facebook',
        success: true,
        platformPostId: 'fb_123',
        permalink: 'https://facebook.com/post/123',
      },
      {
        platform: 'instagram',
        success: false,
        error: 'rate limit',
      },
      {
        platform: 'twitter',
        success: true,
        platformPostId: 'tw_456',
      },
    ];

    const externalIds = extractExternalIds(results);

    expect(externalIds).toEqual({
      facebook: 'fb_123',
      twitter: 'tw_456',
    });
  });

  it('parses account id maps from metadata objects and strings', () => {
    const metadataObject = {
      accountIds: {
        facebook: 'acc_fb',
        instagram: 'acc_ig',
        invalid: 'noop',
      },
    };

    const metadataString = JSON.stringify(metadataObject);

    expect(parseAccountIdsFromMetadata(metadataObject)).toEqual({
      facebook: 'acc_fb',
      instagram: 'acc_ig',
    });

    expect(parseAccountIdsFromMetadata(metadataString)).toEqual({
      facebook: 'acc_fb',
      instagram: 'acc_ig',
    });

    expect(parseAccountIdsFromMetadata(undefined)).toEqual({});
  });

  it('builds per-platform content payloads with sensible fallbacks', () => {
    const { fallback, perPlatform } = buildPlatformContentPayload(
      {
        default: { text: 'Default text', mediaUrls: ['default.jpg'] },
        facebook: { text: 'FB text' },
      },
      ['facebook', 'instagram'],
      ['from-post.jpg']
    );

    expect(fallback).toEqual({
      text: 'Default text',
      mediaUrls: ['default.jpg'],
      link: undefined,
    });

    expect(perPlatform.facebook).toEqual({
      text: 'FB text',
      mediaUrls: ['default.jpg'],
      link: undefined,
    });

    expect(perPlatform.instagram).toEqual({
      text: 'Default text',
      mediaUrls: ['default.jpg'],
      link: undefined,
    });
  });

  it('infers videos from saved media type and non-mp4 URLs', () => {
    expect(
      inferMediaTypeFromMedia([
        {
          type: 'video',
          url: 'https://storage.example.com/uploads/Screen_Recording_2026-05-17.mov',
        },
      ])
    ).toBe('VIDEO');

    expect(
      inferMediaTypeFromMedia([
        {
          type: 'image',
          url: 'https://storage.example.com/uploads/photo.png',
        },
      ])
    ).toBe('IMAGE');
  });

  it('carries default media type into per-platform publish payloads', () => {
    const { fallback, perPlatform } = buildPlatformContentPayload(
      {
        instagram: { text: 'IG text' },
      },
      ['instagram'],
      ['https://storage.example.com/uploads/video.mov'],
      'VIDEO'
    );

    expect(fallback.mediaType).toBe('VIDEO');
    expect(perPlatform.instagram).toEqual({
      text: 'IG text',
      mediaUrls: ['https://storage.example.com/uploads/video.mov'],
      link: undefined,
      mediaType: 'VIDEO',
    });
  });

  it('records platform posts with associated social accounts when available', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const supabaseMock = {
      from: jest.fn(() => ({
        upsert: upsertMock,
      })),
    } as any;

    const results: PublishResult[] = [
      {
        platform: 'youtube',
        accountId: 'acc-123',
        success: true,
        platformPostId: 'yt_001',
        permalink: 'https://youtube.com/watch?v=1',
      },
      {
        platform: 'instagram',
        success: true,
        platformPostId: 'ig_001',
      },
      {
        platform: 'facebook',
        success: false,
      },
    ];

    await recordPlatformPosts({
      supabase: supabaseMock,
      postId: 'post-abc',
      publishResults: results,
      publishedAt: '2025-11-14T00:00:00.000Z',
      workspaceId: 'workspace-1',
      jobRunId: 'job-1',
      attemptNo: 2,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('platform_posts');
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          workspace_id: 'workspace-1',
          platform: 'youtube',
          platform_post_id: 'yt_001',
          social_account_id: 'acc-123',
          status: 'published',
          attempt_count: 2,
        }),
        expect.objectContaining({
          workspace_id: 'workspace-1',
          platform: 'instagram',
          platform_post_id: 'ig_001',
          social_account_id: null,
          status: 'published',
        }),
        expect.objectContaining({
          workspace_id: 'workspace-1',
          platform: 'facebook',
          status: 'failed',
          error_message: 'Publish failed',
        }),
      ],
      { onConflict: 'post_id,social_account_id,platform' }
    );
  });
});
