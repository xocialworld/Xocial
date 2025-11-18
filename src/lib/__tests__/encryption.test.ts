/**
 * Unit Tests for Encryption Utilities
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { encryptToken, decryptToken, hashString, generateSecureToken } from '../encryption';

describe('Encryption Utilities', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key (64 hex characters = 32 bytes)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt token correctly', () => {
      const originalToken = 'my-secret-access-token-12345';
      
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(originalToken);
    });

    it('should produce different encrypted output for same input', () => {
      const token = 'my-secret-token';
      
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptToken('');
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const token = 'token-with-special-chars-@#$%^&*()_+-=[]{}|;:,.<>?/~`!émoji🚀';
      
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(token);
    });

    it('should throw error if encryption key is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encryptToken('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error if encryption key is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'tooshort';
      
      expect(() => encryptToken('test')).toThrow('ENCRYPTION_KEY must be 64 characters');
    });

    it('should throw error on decryption with wrong encrypted data', () => {
      expect(() => decryptToken('invalid-encrypted-data')).toThrow('Failed to decrypt token');
    });

    it('should throw error on decryption with tampered data', () => {
      const encrypted = encryptToken('test-token');
      const tampered = encrypted.substring(0, encrypted.length - 1) + 'X';
      
      expect(() => decryptToken(tampered)).toThrow('Failed to decrypt token');
    });
  });

  describe('hashString', () => {
    it('should hash string consistently', () => {
      const input = 'test-string';
      
      const hash1 = hashString(input);
      const hash2 = hashString(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashString('input1');
      const hash2 = hashString('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashString('');
      
      expect(hash).toHaveLength(64);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate random tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
    });

    it('should generate tokens of specified length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);
      
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it('should generate hex strings', () => {
      const token = generateSecureToken();
      
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});

