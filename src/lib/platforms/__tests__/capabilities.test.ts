import { canPlatformHandleContent } from '../capabilities';

describe('platform content capabilities', () => {
  it('requires video for YouTube text-only posts', () => {
    const result = canPlatformHandleContent('youtube', {
      hasText: true,
      hasImages: false,
      hasVideos: false,
    });

    expect(result.canHandle).toBe(false);
    expect(result.reason).toContain('youtube requires a video');
  });

  it('requires video for TikTok image-only posts', () => {
    const result = canPlatformHandleContent('tiktok', {
      hasText: true,
      hasImages: true,
      hasVideos: false,
      imageCount: 1,
    });

    expect(result.canHandle).toBe(false);
    expect(result.reason).toContain('tiktok only supports video publishing');
  });

  it('allows Instagram image posts', () => {
    const result = canPlatformHandleContent('instagram', {
      hasText: true,
      hasImages: true,
      hasVideos: false,
      imageCount: 1,
    });

    expect(result.canHandle).toBe(true);
  });
});
