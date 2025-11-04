/**
 * Security Utilities Tests
 * Tests for encryption, webhook verification, and sanitization
 */

import {
  encryptToken,
  decryptToken,
  verifyWebhookSignature,
  generateCSRFToken,
  verifyCSRFToken,
  sanitizeInput,
  sanitizeHTML,
  sanitizeFilename,
  generateSecureToken,
  isValidUUID,
  isSafeURL,
  maskToken,
  maskEmail,
  secureCompare,
} from '../security';

describe('Security Utilities', () => {
  // ═══════════════════════════════════════════════════════════════
  // Token Encryption/Decryption
  // ═══════════════════════════════════════════════════════════════
  
  describe('Token Encryption', () => {
    const testToken = 'test-access-token-12345';

    it('should encrypt and decrypt tokens correctly', () => {
      const encrypted = encryptToken(testToken);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(testToken);
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:data

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(testToken);
    });

    it('should produce different encrypted values for same token', () => {
      const encrypted1 = encryptToken(testToken);
      const encrypted2 = encryptToken(testToken);
      
      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(decryptToken(encrypted1)).toBe(decryptToken(encrypted2));
    });

    it('should throw error for invalid encrypted token format', () => {
      expect(() => decryptToken('invalid')).toThrow();
      expect(() => decryptToken('a:b')).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => encryptToken('')).toThrow();
      expect(() => decryptToken('')).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Webhook Verification
  // ═══════════════════════════════════════════════════════════════
  
  describe('Webhook Signature Verification', () => {
    const payload = '{"test":"data"}';
    const secret = 'webhook-secret';

    it('should verify valid signatures', () => {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('should verify signatures with sha256= prefix', () => {
      const crypto = require('crypto');
      const signature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      expect(verifyWebhookSignature(payload, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject empty parameters', () => {
      expect(verifyWebhookSignature('', 'sig', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, 'sig', '')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CSRF Tokens
  // ═══════════════════════════════════════════════════════════════
  
  describe('CSRF Tokens', () => {
    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should verify matching tokens', () => {
      const token = generateCSRFToken();
      expect(verifyCSRFToken(token, token)).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(verifyCSRFToken(token1, token2)).toBe(false);
    });

    it('should handle empty tokens', () => {
      expect(verifyCSRFToken('', '')).toBe(false);
      expect(verifyCSRFToken('test', '')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Input Sanitization
  // ═══════════════════════════════════════════════════════════════
  
  describe('Input Sanitization', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('test<>test')).toBe('testtest');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should trim and limit length', () => {
      const longString = 'a'.repeat(15000);
      const sanitized = sanitizeInput(longString);
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('HTML Sanitization', () => {
    it('should remove all HTML tags', () => {
      expect(sanitizeHTML('<p>Hello <b>World</b></p>')).toBe('Hello World');
      expect(sanitizeHTML('<div>Test</div>')).toBe('Test');
    });

    it('should remove script tags', () => {
      expect(sanitizeHTML('<script>alert(1)</script>Content')).toBe('Content');
    });

    it('should remove style tags', () => {
      expect(sanitizeHTML('<style>body{color:red}</style>Content')).toBe('Content');
    });
  });

  describe('Filename Sanitization', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFilename('../etc/passwd')).toBe('_etcpasswd');
      expect(sanitizeFilename('../../file.txt')).toBe('_file.txt');
    });

    it('should remove path separators', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('path_to_file.txt');
      expect(sanitizeFilename('path\\to\\file.txt')).toBe('path_to_file.txt');
    });

    it('should allow safe characters', () => {
      expect(sanitizeFilename('my-file_123.txt')).toBe('my-file_123.txt');
    });

    it('should handle empty input', () => {
      expect(sanitizeFilename('')).toBe('untitled');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Secure Random Generation
  // ═══════════════════════════════════════════════════════════════
  
  describe('Secure Random Generation', () => {
    it('should generate unique secure tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of specified length', () => {
      const token = generateSecureToken(16);
      // Base64URL encoding produces roughly 1.33x the byte length
      expect(token.length).toBeGreaterThan(16);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UUID Validation
  // ═══════════════════════════════════════════════════════════════
  
  describe('UUID Validation', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // URL Safety
  // ═══════════════════════════════════════════════════════════════
  
  describe('Safe URL Validation', () => {
    it('should accept safe URLs', () => {
      expect(isSafeURL('https://example.com')).toBe(true);
      expect(isSafeURL('http://localhost:3000')).toBe(true);
    });

    it('should reject dangerous URLs', () => {
      expect(isSafeURL('javascript:alert(1)')).toBe(false);
      expect(isSafeURL('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      expect(isSafeURL('not a url')).toBe(false);
      expect(isSafeURL('')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Data Masking
  // ═══════════════════════════════════════════════════════════════
  
  describe('Data Masking', () => {
    it('should mask tokens', () => {
      const token = 'sk-1234567890abcdef';
      const masked = maskToken(token);
      expect(masked).toContain('sk-1');
      expect(masked).toContain('...');
      expect(masked).toContain('cdef');
    });

    it('should mask emails', () => {
      expect(maskEmail('user@example.com')).toBe('u***r@example.com');
      expect(maskEmail('test@test.com')).toBe('t***t@test.com');
    });

    it('should handle short tokens', () => {
      expect(maskToken('short')).toBe('***');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Secure Comparison
  // ═══════════════════════════════════════════════════════════════
  
  describe('Secure Comparison', () => {
    it('should compare equal strings correctly', () => {
      expect(secureCompare('test', 'test')).toBe(true);
      expect(secureCompare('password123', 'password123')).toBe(true);
    });

    it('should reject different strings', () => {
      expect(secureCompare('test', 'test2')).toBe(false);
      expect(secureCompare('abc', 'xyz')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(secureCompare('', '')).toBe(false);
      expect(secureCompare('test', '')).toBe(false);
    });

    it('should handle different lengths', () => {
      expect(secureCompare('short', 'longer')).toBe(false);
    });
  });
});

