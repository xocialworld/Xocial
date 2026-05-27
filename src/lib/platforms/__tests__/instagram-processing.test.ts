import { InstagramClient, InstagramContainerProcessingError } from '../instagram';

describe('InstagramClient video processing', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns a retryable container error when Meta keeps a video container in progress', async () => {
    jest.useFakeTimers();

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'ig-container-1',
        uri: 'https://rupload.facebook.com/ig-api-upload/v24.0/ig-container-1',
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'video/mp4',
      },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    for (let i = 0; i < 12; i++) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status_code: 'IN_PROGRESS' }),
      });
    }

    global.fetch = fetchMock as any;

    const client = new InstagramClient({
      accessToken: 'token',
      instagramAccountId: 'ig-account',
    });

    const promise = client.publishVideo({
      caption: 'Scheduled reel',
      videoUrl: 'https://cdn.example.com/video.mp4',
      mediaType: 'REELS',
    });
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'INSTAGRAM_CONTAINER_PROCESSING',
      retryable: true,
      containerId: 'ig-container-1',
      statusCode: 'IN_PROGRESS',
    } satisfies Partial<InstagramContainerProcessingError>);

    await jest.runAllTimersAsync();
    await expectation;
  });
});
