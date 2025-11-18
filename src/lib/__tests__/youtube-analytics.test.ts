/**
 * Unit Tests for YouTube Analytics
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getYouTubeVideoStats, getYouTubeChannelStats } from '../oauth/youtube';

describe('YouTube Analytics', () => {
  const mockFetch = global.fetch as jest.Mock;
  const mockAccessToken = 'ya29.test-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    );
  });

  describe('getYouTubeVideoStats', () => {
    it('should fetch video statistics', async () => {
      const mockVideoStats = {
        items: [
          {
            id: 'video-123',
            snippet: {
              title: 'Test Video',
              description: 'Test Description',
              publishedAt: '2025-01-01T12:00:00Z',
            },
            statistics: {
              viewCount: '1000',
              likeCount: '50',
              commentCount: '10',
              favoriteCount: '5',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoStats,
      });

      const result = await getYouTubeVideoStats(mockAccessToken, 'video-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('videos?'),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );

      expect(result.id).toBe('video-123');
      expect(result.statistics.viewCount).toBe('1000');
    });

    it('should throw error if video not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await expect(
        getYouTubeVideoStats(mockAccessToken, 'nonexistent-video')
      ).rejects.toThrow();
    });
  });

  describe('getYouTubeChannelStats', () => {
    it('should fetch channel statistics', async () => {
      const mockChannelStats = {
        items: [
          {
            id: 'channel-123',
            snippet: {
              title: 'Test Channel',
              description: 'Test Channel Description',
            },
            statistics: {
              viewCount: '100000',
              subscriberCount: '5000',
              videoCount: '150',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannelStats,
      });

      const result = await getYouTubeChannelStats(mockAccessToken, 'channel-123');

      expect(result.id).toBe('channel-123');
      expect(result.statistics.subscriberCount).toBe('5000');
    });
  });
});

