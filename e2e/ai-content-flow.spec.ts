import { test, expect } from '@playwright/test';

/**
 * E2E Test: AI Content Generation to Publishing Flow
 * Tests the complete flow from /c page as specified in the SRS
 */

test.describe('AI Content Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    // Note: This assumes test user credentials are available
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/(x|c|o)/);
  });

  test('should complete AI generation to post publishing flow', async ({ page }) => {
    // Step 1: Navigate to /c page
    await page.goto('/c');
    await expect(page.locator('h1')).toContainText('AI Content Studio');

    // Step 2: Enter prompt
    const prompt = 'Write a post about launching a new eco-friendly water bottle line';
    await page.fill('textarea[placeholder*="inspiration"]', prompt);
    
    // Step 3: Select platforms
    await page.click('button:has-text("Instagram")');
    await page.click('button:has-text("Facebook")');
    
    // Verify platforms are selected (should have active styling)
    await expect(page.locator('button:has-text("Instagram")')).toHaveClass(/primary/);
    await expect(page.locator('button:has-text("Facebook")')).toHaveClass(/primary/);

    // Step 4: Optionally adjust tone/style/length
    // (keeping defaults for this test)

    // Step 5: Click Generate Content button
    await page.click('button:has-text("Generate Content")');
    
    // Wait for generation to complete
    await expect(page.locator('text=Generating')).toBeVisible();
    await expect(page.locator('text=Generating')).not.toBeVisible({ timeout: 30000 });

    // Step 6: Verify content appears in preview panel
    const previewPanel = page.locator('[role="tabpanel"]').first();
    await expect(previewPanel).not.toBeEmpty();

    // Step 7: Verify hashtags are generated
    await expect(page.locator('text=#')).toBeVisible();

    // Step 8: Click Schedule button for Instagram
    await page.click('button:has-text("Schedule"):first');
    
    // Verify toast notification
    await expect(page.locator('text=Content added to the composer')).toBeVisible();

    // Step 9: Scroll to composer section (should auto-scroll)
    const composerSection = page.locator('#create-composer');
    await expect(composerSection).toBeInViewport();

    // Step 10: Verify content is pre-filled in composer
    const contentTextarea = composerSection.locator('textarea').first();
    const filledContent = await contentTextarea.inputValue();
    expect(filledContent.length).toBeGreaterThan(0);

    // Step 11: Verify Instagram platform is pre-selected
    // (checking for selected account indicators)
    await expect(composerSection.locator('text=Instagram')).toBeVisible();

    // Step 12: Add media (optional - skip for basic flow)
    
    // Step 13: Set schedule date/time
    await composerSection.locator('button:has-text("Schedule")').click();
    // Select tomorrow at 10 AM (implementation depends on DatePicker component)
    
    // Step 14: Click "Schedule Post" button
    await composerSection.locator('button:has-text("Schedule Post")').click();

    // Step 15: Wait for success and redirect
    await expect(page.locator('text=Post scheduled successfully')).toBeVisible();
    
    // Should redirect to /o (calendar page)
    await page.waitForURL('/o', { timeout: 5000 });
    
    // Step 16: Verify we're on the calendar page
    await expect(page.locator('h1, h2')).toContainText(/Calendar|Organize/i);
  });

  test('should handle AI refinement flow', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Generate initial content
    await page.fill('textarea[placeholder*="inspiration"]', 'Test prompt for refinement');
    await page.click('button:has-text("Instagram")');
    await page.click('button:has-text("Generate Content")');
    
    // Wait for generation
    await expect(page.locator('text=Generating')).not.toBeVisible({ timeout: 30000 });

    // Select refinement type
    await page.selectOption('select', 'shorter');
    
    // Click Refine button
    await page.click('button:has-text("Refine")');
    
    // Wait for refinement to complete
    await expect(page.locator('text=Refining')).not.toBeVisible({ timeout: 10000 });
    
    // Verify content has been updated
    await expect(page.locator('[role="tabpanel"]').first()).not.toBeEmpty();
  });

  test('should handle AI variations flow', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Generate initial content
    await page.fill('textarea[placeholder*="inspiration"]', 'Test prompt for variations');
    await page.click('button:has-text("Twitter")');
    await page.click('button:has-text("Generate Content")');
    
    // Wait for generation
    await expect(page.locator('text=Generating')).not.toBeVisible({ timeout: 30000 });

    // Click Variations button
    await page.click('button:has-text("Variations")');
    
    // Wait for variations to load
    await expect(page.locator('text=Variations')).not.toBeVisible({ timeout: 10000 });
    
    // Verify variation cards appear
    await expect(page.locator('button:has-text("Use Variation")')).toBeVisible();
    
    // Click "Use Variation" on first option
    await page.locator('button:has-text("Use Variation")').first().click();
    
    // Verify variation is applied
    await expect(page.locator('text=Variation applied')).toBeVisible();
  });

  test('should handle hashtag refresh flow', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Generate initial content
    await page.fill('textarea[placeholder*="inspiration"]', 'Test prompt for hashtags');
    await page.click('button:has-text("LinkedIn")');
    await page.click('button:has-text("Generate Content")');
    
    // Wait for generation
    await expect(page.locator('text=Generating')).not.toBeVisible({ timeout: 30000 });

    // Verify initial hashtags
    const initialHashtags = await page.locator('text=#').allTextContents();
    expect(initialHashtags.length).toBeGreaterThan(0);
    
    // Click Refresh hashtags button
    await page.click('button:has-text("Refresh hashtags")');
    
    // Wait for refresh
    await page.waitForTimeout(2000);
    
    // Verify hashtags are updated (could be same or different)
    await expect(page.locator('text=#')).toBeVisible();
  });

  test('should restore generation from history', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Generate initial content
    const testPrompt = 'Historical generation test prompt';
    await page.fill('textarea[placeholder*="inspiration"]', testPrompt);
    await page.click('button:has-text("Facebook")');
    await page.click('button:has-text("Generate Content")');
    
    // Wait for generation
    await expect(page.locator('text=Generating')).not.toBeVisible({ timeout: 30000 });

    // Reload page
    await page.reload();
    
    // Look for history sidebar entry with our prompt
    const historyEntry = page.locator(`text=${testPrompt}`).first();
    await expect(historyEntry).toBeVisible();
    
    // Click "Reuse" button on the history entry
    await historyEntry.locator('..').locator('button:has-text("Reuse")').click();
    
    // Verify generation is restored
    await expect(page.locator('text=Restored previous generation')).toBeVisible();
    
    // Verify prompt is filled
    const promptTextarea = page.locator('textarea[placeholder*="inspiration"]');
    expect(await promptTextarea.inputValue()).toBe(testPrompt);
  });

  test('should show validation errors for incomplete fields', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Try to schedule without generating content
    const composerSection = page.locator('#create-composer');
    await composerSection.locator('button:has-text("Schedule Post")').click();
    
    // Should show validation error
    await expect(page.locator('text=fill in all required fields')).toBeVisible();
  });

  test('should show character limit warnings', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Manually add very long content to composer
    const composerSection = page.locator('#create-composer');
    const longContent = 'A'.repeat(300); // Exceeds Twitter limit
    
    await composerSection.locator('textarea').first().fill(longContent);
    
    // Select Twitter platform
    // (assumes platform selector is available in composer)
    
    // Should show character limit warning
    await expect(composerSection.locator('text=exceeds character limit')).toBeVisible();
  });
});

test.describe('AI Content Generation - Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(x|c|o)/);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Intercept API call and force error
    await page.route('**/api/ai/generate', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'AI service temporarily unavailable' } }),
      });
    });

    // Try to generate content
    await page.fill('textarea[placeholder*="inspiration"]', 'Test error handling');
    await page.click('button:has-text("Instagram")');
    await page.click('button:has-text("Generate Content")');
    
    // Should show error message
    await expect(page.locator('text=AI service temporarily unavailable')).toBeVisible();
  });

  test('should handle network timeout', async ({ page }) => {
    // Navigate to /c page
    await page.goto('/c');

    // Intercept API call and delay response
    await page.route('**/api/ai/generate', async (route) => {
      // Delay for longer than timeout
      await new Promise((resolve) => setTimeout(resolve, 35000));
      route.abort();
    });

    // Try to generate content
    await page.fill('textarea[placeholder*="inspiration"]', 'Test timeout');
    await page.click('button:has-text("Instagram")');
    await page.click('button:has-text("Generate Content")');
    
    // Should eventually show error or timeout message
    await expect(page.locator('text=/error|timeout|failed/i')).toBeVisible({ timeout: 40000 });
  });
});

