import { expect, test } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

async function loginUser(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(x|c|o)/);
}

test.describe('Create screen multi-platform composer', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('Generate with AI replaces the base content box', async ({ page }) => {
    await page.route('**/api/ai/generate**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            generationId: '00000000-0000-4000-8000-000000000001',
            model: 'openai/gpt-4o-mini',
            platformContent: {
              facebook: {
                text: 'Generated Facebook-ready caption for the current campaign.',
              },
            },
            hashtags: [],
            summary: {},
            analytics: {},
          },
        }),
      });
    });

    await page.goto('/c');
    await expect(page.getByRole('heading', { name: 'Create' })).toBeVisible();

    await page.getByRole('button', { name: /Facebook/i }).click();
    await page.getByRole('textbox', { name: /Content box/i }).fill('Write a post for an agency campaign launch.');
    await page.getByRole('button', { name: /Generate with AI/i }).click();

    await expect(page.getByRole('textbox', { name: /Content box/i })).toHaveValue(
      'Generated Facebook-ready caption for the current campaign.'
    );
  });

  test('Create Previews falls back to editable checked previews when AI adaptation fails', async ({ page }) => {
    await page.route('**/api/ai/generate**', (route) => {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'AI unavailable' } }),
      });
    });

    await page.goto('/c');
    await page.getByRole('button', { name: /Facebook/i }).click();
    await page.getByRole('textbox', { name: /Content box/i }).fill(
      'Launch post for agencies managing multi-channel creator calendars.'
    );
    await page.getByRole('button', { name: /Create Previews/i }).click();

    await expect(page.getByRole('heading', { name: 'Platform previews' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Include Facebook preview/i })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await expect(page.getByText(/Connect or select accounts for: Facebook/i)).toBeVisible();
  });

  test('Publish menu exposes schedule fields when selected previews have accounts', async ({ page }) => {
    await page.route('**/api/accounts**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accounts: [
              {
                id: '00000000-0000-4000-8000-000000000010',
                platform: 'facebook',
                account_name: 'Agency Facebook',
                is_active: true,
              },
            ],
          },
        }),
      });
    });
    await page.route('**/api/ai/generate**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            platformContent: {
              facebook: { text: 'Facebook preview text' },
            },
            hashtags: [],
            summary: {},
            analytics: {},
          },
        }),
      });
    });

    await page.goto('/c');
    await page.getByRole('button', { name: /Facebook/i }).click();
    await page.getByRole('textbox', { name: /Content box/i }).fill(
      'Launch post for agencies managing multi-channel creator calendars.'
    );
    await page.getByRole('button', { name: /Create Previews/i }).click();

    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('button', { name: 'Schedule' }).click();

    await expect(page.getByLabel('Date')).toBeVisible();
    await expect(page.getByLabel('Time')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Schedule' })).toBeVisible();
  });
});
