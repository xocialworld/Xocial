/**
 * Unit Tests for YouTube Video Publishing
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { uploadYouTubeVideo, setYouTubeVideoThumbnail, updateYouTubeVideo } from '../oauth/youtube';

describe('YouTube Video Publishing', () => {
  const mockFetch = global.fetch as jest.Mock;
  const mockAccessToken = 'ya29.test-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadYouTubeVideo', () => {
    it('should upload video with metadata', async () => {
      // Mock metadata initialization response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          Location: 'https://www.googleapis.com/upload/youtube/v3/videos?uploadId=test-upload-id',
        }),
        json: async () => ({}),
      });

      // Mock video file upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'video-test-id-123',
          snippet: {
            title: 'Test Video',
            description: 'Test Description',
          },
        }),
      });

      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      
      const result = await uploadYouTubeVideo(
        mockAccessToken,
        videoBlob,
        {
          title: 'Test Video',
          description: 'Test Description',
          tags: ['test', 'video'],
          categoryId: '22',
          privacyStatus: 'public',
        }
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('video-test-id-123');
    });

    it('should throw error if metadata init fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Invalid request',
          },
        }),
      });

      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      
      await expect(
        uploadYouTubeVideo(mockAccessToken, videoBlob, {
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('Invalid request');
    });

    it('should throw error if no upload URL returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}), // No Location header
        json: async () => ({}),
      });

      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      
      await expect(
        uploadYouTubeVideo(mockAccessToken, videoBlob, {
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('No upload URL returned from YouTube');
    });

    it('should throw error if video upload fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          Location: 'https://www.googleapis.com/upload/youtube/v3/videos?uploadId=test',
        }),
        json: async () => ({}),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Upload failed',
          },
        }),
      });

      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      
      await expect(
        uploadYouTubeVideo(mockAccessToken, videoBlob, {
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('Upload failed');
    });

    it('should use default category if not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          Location: 'https://www.googleapis.com/upload/youtube/v3/videos?uploadId=test',
        }),
        json: async () => ({}),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'video-123' }),
      });

      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      
      await uploadYouTubeVideo(mockAccessToken, videoBlob, {
        title: 'Test',
        description: 'Test',
      });

      const firstCall = mockFetch.mock.calls[0];
      const body = JSON.parse(firstCall[1].body);
      
      expect(body.snippet.categoryId).toBe('22'); // Default: People & Blogs
    });
  });

  describe('setYouTubeVideoThumbnail', () => {
    it('should upload custom thumbnail', async () => {
      // Mock thumbnail fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['fake image data'], { type: 'image/jpeg' }),
      });

      // Mock thumbnail upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ default: { url: 'https://i.ytimg.com/test.jpg' } }] }),
      });

      await setYouTubeVideoThumbnail(
        mockAccessToken,
        'video-123',
        'https://example.com/thumbnail.jpg'
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if thumbnail fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        setYouTubeVideoThumbnail(mockAccessToken, 'video-123', 'https://invalid.com/thumb.jpg')
      ).rejects.toThrow('Failed to fetch thumbnail image');
    });

    it('should throw error if thumbnail upload fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['fake image'], { type: 'image/jpeg' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Invalid image' },
        }),
      });

      await expect(
        setYouTubeVideoThumbnail(mockAccessToken, 'video-123', 'https://example.com/thumb.jpg')
      ).rejects.toThrow('Invalid image');
    });
  });

  describe('updateYouTubeVideo (scheduling)', () => {
    it('should schedule a video with publishAt and privacyStatus', async () => {
      const mockResponse = {
        id: 'video-123',
        snippet: { title: 'Scheduled Title', description: 'Desc' },
        status: { privacyStatus: 'private', publishAt: '2025-12-31T10:00:00Z' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await updateYouTubeVideo(
        mockAccessToken,
        'video-123',
        {
          privacyStatus: 'private',
          publishAt: '2025-12-31T10:00:00Z',
        }
      );

      // Verify we called the correct endpoint and method
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('youtube/v3/videos?part=snippet,status'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );

      // Verify response shape
      expect(result.id).toBe('video-123');
      expect(result.status?.privacyStatus).toBe('private');
    });
  });
});

