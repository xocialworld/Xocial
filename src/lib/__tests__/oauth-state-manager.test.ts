/**
 * Tests for OAuth State Management
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  cleanupExpiredStates,
  generateState,
  storeOAuthState,
  verifyOAuthState,
  __resetSupabaseClientFactory,
  __setSupabaseClientFactory,
} from '../oauth/state-manager';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

const mockCreateClient = jest.fn(() => Promise.resolve(mockSupabase as any));

describe('OAuth State Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReset();
    mockCreateClient.mockResolvedValue(mockSupabase as any);
    __setSupabaseClientFactory(mockCreateClient);

    const globalWithStore = globalThis as typeof globalThis & {
      __oauthStateFallbackStore?: Map<string, any>;
    };

    globalWithStore.__oauthStateFallbackStore?.clear();
  });

  afterEach(() => {
    __resetSupabaseClientFactory();
  });

  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state1 = generateState();
      const state2 = generateState();
      
      expect(state1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(state2).toHaveLength(64);
      expect(state1).not.toBe(state2); // Should be random
    });

    it('should generate hex strings', () => {
      const state = generateState();
      
      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('storeOAuthState', () => {
    it('should store state in database', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'user-123' },
        error: null,
      });
      
      await storeOAuthState('user-123', 'facebook', 'state-abc', '/redirect');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        oauth_state: expect.objectContaining({
          state: 'state-abc',
          userId: 'user-123',
          platform: 'facebook',
          redirectUrl: '/redirect',
        }),
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', details: '', hint: '', code: 'P0001' },
      });
      
      await expect(
        storeOAuthState('user-123', 'facebook', 'state-abc')
      ).rejects.toThrow('Failed to store OAuth state');
    });

    it('should fall back to in-memory cache when column missing', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Could not find the 'oauth_state' column of 'profiles' in the schema cache",
          details: '',
          hint: '',
          code: 'PGRST202',
        },
      });

      await expect(
        storeOAuthState('user-123', 'facebook', 'state-abc')
      ).resolves.toBeUndefined();

      const globalWithStore = globalThis as typeof globalThis & {
        __oauthStateFallbackStore?: Map<string, any>;
      };

      expect(globalWithStore.__oauthStateFallbackStore!.size).toBe(1);
    });
  });

  describe('verifyOAuthState', () => {
    beforeEach(() => {
      // Reset time for expiry tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return invalid for missing state parameter', async () => {
      const result = await verifyOAuthState('user-123', 'facebook', '');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('State parameter is missing');
    });

    it('should return invalid if no stored state found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { oauth_state: null },
        error: null,
      });
      
      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No OAuth state found');
    });

    it('should return invalid for state mismatch', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          oauth_state: {
            state: 'state-xyz',
            userId: 'user-123',
            platform: 'facebook',
            createdAt: Date.now(),
          },
        },
        error: null,
      });
      
      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('State parameter mismatch');
    });

    it('should return invalid for platform mismatch', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          oauth_state: {
            state: 'state-abc',
            userId: 'user-123',
            platform: 'twitter',
            createdAt: Date.now(),
          },
        },
        error: null,
      });
      
      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Platform mismatch');
    });

    it('should return invalid for expired state', async () => {
      const elevenMinutesAgo = Date.now() - (11 * 60 * 1000);
      
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          oauth_state: {
            state: 'state-abc',
            userId: 'user-123',
            platform: 'facebook',
            createdAt: elevenMinutesAgo,
          },
        },
        error: null,
      });
      
      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('State has expired');
    });

    it('should return valid for correct state', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          oauth_state: {
            state: 'state-abc',
            userId: 'user-123',
            platform: 'facebook',
            createdAt: Date.now(),
            redirectUrl: '/dashboard',
          },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'user-123' },
        error: null,
      });
      
      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');
      
      expect(result.valid).toBe(true);
      expect(result.redirectUrl).toBe('/dashboard');
      
      // Should clear the state after verification
      expect(mockSupabase.update).toHaveBeenCalledWith({ oauth_state: null });
    });

    it('should use fallback state when column missing', async () => {
      const globalWithStore = globalThis as typeof globalThis & {
        __oauthStateFallbackStore?: Map<string, any>;
      };

      const store = globalWithStore.__oauthStateFallbackStore!;
      store.set('user-123:facebook', {
        state: 'state-abc',
        userId: 'user-123',
        platform: 'facebook',
        createdAt: Date.now(),
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Could not find the 'oauth_state' column of 'profiles' in the schema cache",
          details: '',
          hint: '',
          code: 'PGRST202',
        },
      });

      const result = await verifyOAuthState('user-123', 'facebook', 'state-abc');

      expect(result.valid).toBe(true);
      expect(store.size).toBe(0);
    });
  });

  describe('cleanupExpiredStates', () => {
    it('removes expired fallback entries', async () => {
      const globalWithStore = globalThis as typeof globalThis & {
        __oauthStateFallbackStore?: Map<string, any>;
      };

      const store = globalWithStore.__oauthStateFallbackStore!;
      store.set('user-1:facebook', {
        state: 'old',
        userId: 'user-1',
        platform: 'facebook',
        createdAt: Date.now() - 11 * 60 * 1000,
      });
      store.set('user-2:facebook', {
        state: 'new',
        userId: 'user-2',
        platform: 'facebook',
        createdAt: Date.now(),
      });

      const removed = await cleanupExpiredStates();

      expect(removed).toBe(1);
      expect(store.size).toBe(1);
    });
  });
});

