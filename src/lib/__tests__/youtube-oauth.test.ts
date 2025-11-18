/**
 * Unit Tests for YouTube OAuth
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
  refreshYouTubeToken,
  getYouTubeChannels,
} from '../oauth/youtube';

describe('YouTube OAuth', () => {
  const mockConfig = {
    clientId: 'test-client-id.apps.googleusercontent.com',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://app.example.com/api/oauth/youtube/callback',
  };

  describe('getYouTubeAuthUrl', () => {
    it('should generate valid authorization URL', () => {
      const state = 'test-state-123';
      const url = getYouTubeAuthUrl(mockConfig, state);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=${mockConfig.clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline'); // For refresh token
      expect(url).toContain('prompt=consent'); // Force consent for refresh token
    });

    it('should include required YouTube scopes', () => {
      const state = 'test-state-456';
      const url = getYouTubeAuthUrl(mockConfig, state);

      expect(url).toContain('scope=');
      expect(url).toContain('youtube');
      expect(url).toContain('youtube.upload');
      expect(url).toContain('youtube.readonly');
    });
  });

  describe('exchangeYouTubeCode', () => {
    const mockFetch = global.fetch as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'ya29.test-access-token',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'https://www.googleapis.com/auth/youtube',
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await exchangeYouTubeCode(mockConfig, 'test-auth-code');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      expect(result).toEqual(mockTokenResponse);
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Bad Request',
        }),
      });

      await expect(exchangeYouTubeCode(mockConfig, 'invalid-code')).rejects.toThrow();
    });
  });

  describe('refreshYouTubeToken', () => {
    const mockFetch = global.fetch as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should refresh access token using refresh token', async () => {
      const mockTokenResponse = {
        access_token: 'ya29.new-access-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/youtube',
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await refreshYouTubeToken(mockConfig, 'test-refresh-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.access_token).toBe('ya29.new-access-token');
      expect(result.expires_in).toBe(3600);
    });

    it('should throw error on failed token refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked',
        }),
      });

      await expect(
        refreshYouTubeToken(mockConfig, 'expired-refresh-token')
      ).rejects.toThrow('Failed to refresh YouTube token');
    });
  });

  describe('getYouTubeChannels', () => {
    const mockFetch = global.fetch as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch user channels', async () => {
      const mockChannelsResponse = {
        items: [
          {
            id: 'UC_test_channel_id',
            snippet: {
              title: 'Test Channel',
              description: 'Test Description',
              customUrl: '@testchannel',
              thumbnails: {
                high: { url: 'https://example.com/thumb.jpg' },
              },
            },
            statistics: {
              viewCount: '10000',
              subscriberCount: '1500',
              videoCount: '50',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannelsResponse,
      });

      const result = await getYouTubeChannels('test-access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/youtube/v3/channels'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('UC_test_channel_id');
      expect(result[0].snippet.title).toBe('Test Channel');
    });

    it('should return empty array if no channels found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const result = await getYouTubeChannels('test-access-token');

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      });

      await expect(getYouTubeChannels('invalid-token')).rejects.toThrow(
        'Failed to fetch YouTube channels'
      );
    });
  });
});

