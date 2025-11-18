import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests user login flow
 */
test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Wait for validation errors
    await page.waitForTimeout(500);
    
    // Check for error messages (implementation specific)
    const errorMessages = page.locator('[role="alert"], .error-message, .text-red-500');
    expect(await errorMessages.count()).toBeGreaterThan(0);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Wait for error response
    await page.waitForTimeout(2000);
    
    // Check for error notification
    const errorNotification = page.locator('[role="alert"], .toast, .error-message');
    expect(await errorNotification.count()).toBeGreaterThan(0);
  });

  // TODO: Add test for successful login once test user is available
  test.skip('should login successfully with valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('correctpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Should redirect to dashboard
    await page.waitForURL('/x');
    expect(page.url()).toContain('/x');
  });
});

