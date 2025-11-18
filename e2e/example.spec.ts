import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * This test verifies the home page loads correctly
 */
test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be loaded
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    expect(await page.title()).toBeTruthy();
  });
});

