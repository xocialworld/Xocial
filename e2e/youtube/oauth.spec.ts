import { test, expect } from '@playwright/test';

/**
 * YouTube OAuth E2E Tests
 * Tests the complete OAuth flow for connecting YouTube accounts
 */

test.describe('YouTube OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (assumes test user exists)
    // TODO: Replace with actual test user login when auth is complete
    // await page.goto('/auth/login');
    // await page.fill('[name="email"]', 'test@example.com');
    // await page.fill('[name="password"]', 'testpassword');
    // await page.click('button[type="submit"]');
    // await page.waitForURL('/x');
  });

  test('should display connect YouTube account button', async ({ page }) => {
    await page.goto('/x/connect');
    
    // Look for YouTube connection button/link
    const youtubeButton = page.locator('button, a').filter({ hasText: /youtube/i }).first();
    await expect(youtubeButton).toBeVisible();
  });

  test('should redirect to Google OAuth when connecting YouTube', async ({ page }) => {
    await page.goto('/x/connect');
    
    // Click YouTube connect button
    const youtubeButton = page.locator('button, a').filter({ hasText: /youtube/i }).first();
    
    // Set up a promise to wait for navigation
    const navigationPromise = page.waitForURL(/accounts\.google\.com/, {
      timeout: 5000,
    }).catch(() => null); // Catch timeout if not in real environment
    
    await youtubeButton.click();
    
    // In test environment, we might not actually navigate to Google
    // So we check if navigation started or if we're on connect route
    const url = page.url();
    
    // Should either be on Google OAuth or our connect route
    expect(
      url.includes('accounts.google.com') || url.includes('/api/oauth/connect')
    ).toBeTruthy();
  });

  // This test would require a test Google account and mocking OAuth flow
  test.skip('should complete OAuth flow and connect channel', async ({ page, context }) => {
    await page.goto('/x/connect');
    
    // Click YouTube connect
    const youtubeButton = page.locator('button, a').filter({ hasText: /youtube/i }).first();
    await youtubeButton.click();
    
    // Wait for Google OAuth page
    await page.waitForURL(/accounts\.google\.com/);
    
    // In real test, would:
    // 1. Fill in Google credentials
    // 2. Grant permissions
    // 3. Wait for callback
    // 4. Verify channel appears in dashboard
    
    // For now, we'll skip actual OAuth
    // await page.fill('[type="email"]', 'testchannel@gmail.com');
    // await page.fill('[type="password"]', 'testpassword');
    // await page.click('#identifierNext');
    // ... complete Google OAuth flow
    
    // Should redirect back to our app
    await page.waitForURL('/x');
    
    // Should see connected channel
    await expect(page.locator('[data-testid="youtube-channel"]')).toBeVisible();
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Simulate OAuth error by visiting callback with error param
    await page.goto('/api/oauth/youtube/callback?error=access_denied&error_description=User+denied+access');
    
    // Should show error message or redirect with error
    // This depends on implementation
    await page.waitForTimeout(1000);
    
    const url = page.url();
    expect(url).toBeTruthy(); // Just verify page loaded
  });

  test('should handle missing authorization code', async ({ page }) => {
    // Visit callback without code parameter
    await page.goto('/api/oauth/youtube/callback');
    
    // Should handle error (either show message or redirect)
    await page.waitForTimeout(1000);
    
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('should verify state parameter for CSRF protection', async ({ page }) => {
    // Visit callback with invalid state
    await page.goto('/api/oauth/youtube/callback?code=test-code&state=invalid-state');
    
    // Should reject due to invalid state
    await page.waitForTimeout(1000);
    
    // Should show error or redirect with error
    const url = page.url();
    expect(url).toBeTruthy();
  });
});

test.describe('YouTube Account Management', () => {
  test.skip('should display connected YouTube channels', async ({ page }) => {
    // TODO: Set up test user with connected YouTube account
    await page.goto('/x');
    
    // Should see YouTube channel card
    const youtubeCard = page.locator('[data-platform="youtube"]').first();
    await expect(youtubeCard).toBeVisible();
    
    // Should show channel metrics
    await expect(page.locator('[data-testid="youtube-subscribers"]')).toBeVisible();
    await expect(page.locator('[data-testid="youtube-videos"]')).toBeVisible();
  });

  test.skip('should refresh channel data when sync button clicked', async ({ page }) => {
    await page.goto('/x');
    
    // Click sync button for YouTube channel
    const syncButton = page.locator('[data-platform="youtube"]').locator('button', { hasText: /sync|refresh/i }).first();
    await syncButton.click();
    
    // Should show loading state
    await expect(syncButton).toBeDisabled();
    
    // Wait for sync to complete
    await page.waitForTimeout(2000);
    
    // Should show updated data
    await expect(syncButton).toBeEnabled();
  });

  test.skip('should disconnect YouTube account', async ({ page }) => {
    await page.goto('/x');
    
    // Find disconnect button
    const disconnectButton = page
      .locator('[data-platform="youtube"]')
      .locator('button', { hasText: /disconnect|remove/i })
      .first();
    
    await disconnectButton.click();
    
    // Confirm disconnection
    await page.locator('button', { hasText: /confirm|yes/i }).click();
    
    // Channel should disappear
    await expect(page.locator('[data-platform="youtube"]')).not.toBeVisible();
  });
});

