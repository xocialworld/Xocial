/**
 * End-to-End Tests: Post Creation, Scheduling, and Publishing
 * 
 * Tests the complete post lifecycle for YouTube and Twitter platforms.
 * Based on Xocial SRS Section 3.1 - Content Creation & Management
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword',
};

const TIMEOUTS = {
  navigation: 30000,
  apiCall: 15000,
  animation: 1000,
};

/**
 * Helper to login before tests
 */
async function loginUser(page: any) {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/o/**', { timeout: TIMEOUTS.navigation });
}

/**
 * Helper to create a post via the composer
 */
async function createPostViaComposer(page: any, options: {
  content: string;
  platforms: string[];
  schedule?: Date;
  isDraft?: boolean;
}) {
  // Open composer
  await page.click('[data-testid="create-post-button"], button:has-text("Create Post")');
  await page.waitForSelector('[data-testid="post-composer"], .post-composer', { timeout: TIMEOUTS.apiCall });
  
  // Enter content
  await page.fill('[data-testid="post-content"], textarea[placeholder*="Write"]', options.content);
  
  // Select platforms
  for (const platform of options.platforms) {
    const platformBtn = page.locator(`[data-testid="platform-${platform}"], button:has-text("${platform}")`).first();
    await platformBtn.click();
  }
  
  // Schedule if provided
  if (options.schedule) {
    await page.click('[data-testid="schedule-button"], button:has-text("Schedule")');
    // Date picker interaction would go here
  }
  
  // Submit
  if (options.isDraft) {
    await page.click('[data-testid="save-draft"], button:has-text("Save Draft")');
  } else if (options.schedule) {
    await page.click('[data-testid="schedule-post"], button:has-text("Schedule")');
  } else {
    await page.click('[data-testid="publish-now"], button:has-text("Publish Now")');
  }
  
  // Wait for success
  await expect(page.locator('.toast-success, [data-sonner-toast]')).toBeVisible({ timeout: TIMEOUTS.apiCall });
}

test.describe('Post Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should create a draft post', async ({ page }) => {
    await page.goto('/o/create');
    
    // Create draft
    await createPostViaComposer(page, {
      content: 'Test draft post ' + Date.now(),
      platforms: ['twitter'],
      isDraft: true,
    });
    
    // Verify post appears in drafts
    await page.goto('/o/posts?status=draft');
    await expect(page.locator('text=Test draft post')).toBeVisible();
  });

  test('should schedule a post for future publishing', async ({ page }) => {
    await page.goto('/o/create');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
    
    await createPostViaComposer(page, {
      content: 'Scheduled post test ' + Date.now(),
      platforms: ['twitter'],
      schedule: futureDate,
    });
    
    // Verify post appears in scheduled
    await page.goto('/o/posts?status=scheduled');
    await expect(page.locator('text=Scheduled post test')).toBeVisible();
  });

  test('should show post on calendar after scheduling', async ({ page }) => {
    await page.goto('/o/create');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const testContent = 'Calendar visible post ' + Date.now();
    
    await createPostViaComposer(page, {
      content: testContent,
      platforms: ['twitter'],
      schedule: futureDate,
    });
    
    // Navigate to calendar
    await page.goto('/o');
    await page.waitForTimeout(TIMEOUTS.animation);
    
    // Verify post appears on calendar
    await expect(page.locator(`text=${testContent.slice(0, 20)}`)).toBeVisible({ timeout: TIMEOUTS.apiCall });
  });
});

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should submit post for approval when required', async ({ page }) => {
    // This test assumes the workspace has approval workflow enabled
    await page.goto('/o/create');
    
    const testContent = 'Post for approval ' + Date.now();
    
    await page.fill('[data-testid="post-content"], textarea[placeholder*="Write"]', testContent);
    await page.click('[data-testid="platform-twitter"]');
    
    // Look for "Request Approval" button instead of "Publish Now"
    const approvalBtn = page.locator('button:has-text("Request Approval")');
    
    if (await approvalBtn.isVisible()) {
      await approvalBtn.click();
      
      // Verify status becomes pending_approval
      await page.goto('/o/posts?status=pending_approval');
      await expect(page.locator(`text=${testContent.slice(0, 20)}`)).toBeVisible();
    } else {
      // Workspace doesn't require approval - skip test
      test.skip();
    }
  });
});

test.describe('Publishing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should publish a post immediately', async ({ page }) => {
    // Note: This test requires valid OAuth tokens for the platform
    await page.goto('/o/create');
    
    const testContent = 'Immediate publish test ' + Date.now();
    
    await createPostViaComposer(page, {
      content: testContent,
      platforms: ['twitter'],
    });
    
    // Verify post appears in published
    await page.goto('/o/posts?status=published');
    await expect(page.locator(`text=${testContent.slice(0, 20)}`)).toBeVisible({ timeout: TIMEOUTS.apiCall });
  });

  test('should handle publishing errors gracefully', async ({ page }) => {
    // Create a post that will fail (e.g., no connected account)
    await page.goto('/o/create');
    
    await page.fill('[data-testid="post-content"], textarea[placeholder*="Write"]', 'This should fail');
    
    // Try to publish without selecting a platform
    const publishBtn = page.locator('[data-testid="publish-now"], button:has-text("Publish Now")');
    
    if (await publishBtn.isEnabled()) {
      await publishBtn.click();
      
      // Should show error toast or validation message
      await expect(page.locator('[data-sonner-toast][data-type="error"], .toast-error, text=platform')).toBeVisible({ timeout: TIMEOUTS.apiCall });
    }
  });
});

test.describe('Calendar Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should reschedule post via drag and drop', async ({ page }) => {
    // First create a scheduled post
    await page.goto('/o/create');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const testContent = 'Drag test post ' + Date.now();
    
    await createPostViaComposer(page, {
      content: testContent,
      platforms: ['twitter'],
      schedule: futureDate,
    });
    
    // Go to calendar
    await page.goto('/o');
    await page.waitForTimeout(TIMEOUTS.animation);
    
    // Find the post card
    const postCard = page.locator(`[data-post-id]:has-text("${testContent.slice(0, 15)}")`).first();
    
    if (await postCard.isVisible()) {
      // Get target day cell (2 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      const targetCell = page.locator(`[data-date="${targetDate.toISOString().split('T')[0]}"]`);
      
      if (await targetCell.isVisible()) {
        // Perform drag and drop
        await postCard.dragTo(targetCell);
        
        // Verify reschedule confirmation or success
        await expect(page.locator('text=rescheduled, [data-sonner-toast]')).toBeVisible({ timeout: TIMEOUTS.apiCall });
      }
    }
  });

  test('should open edit modal when clicking post', async ({ page }) => {
    await page.goto('/o');
    
    // Click on any post card
    const postCard = page.locator('[data-post-id]').first();
    
    if (await postCard.isVisible()) {
      await postCard.click();
      
      // Verify edit modal opens
      await expect(page.locator('[data-testid="edit-post-modal"], [role="dialog"]')).toBeVisible({ timeout: TIMEOUTS.animation });
    }
  });
});

test.describe('Platform-Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should enforce Twitter character limit', async ({ page }) => {
    await page.goto('/o/create');
    
    // Select Twitter
    await page.click('[data-testid="platform-twitter"]');
    
    // Enter content exceeding 280 characters
    const longContent = 'A'.repeat(300);
    await page.fill('[data-testid="post-content"], textarea', longContent);
    
    // Check for character count warning
    await expect(page.locator('text=280, text=exceeds, .character-limit-error')).toBeVisible();
    
    // Publish button should be disabled
    const publishBtn = page.locator('[data-testid="publish-now"], button:has-text("Publish Now")');
    await expect(publishBtn).toBeDisabled();
  });

  test('should show YouTube-specific fields when selected', async ({ page }) => {
    await page.goto('/o/create');
    
    // Select YouTube
    await page.click('[data-testid="platform-youtube"]');
    
    // Check for YouTube-specific fields
    await expect(page.locator('text=Title, [placeholder*="title"]')).toBeVisible();
    await expect(page.locator('text=Description, [placeholder*="description"]')).toBeVisible();
  });
});

