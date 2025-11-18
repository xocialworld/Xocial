import { test, expect } from '@playwright/test';

test.describe('Media API authentication', () => {
  test('GET /api/media requires authentication', async ({ request }) => {
    const response = await request.get('/api/media');
    expect(response.status()).toBe(401);
  });

  test('POST /api/media/upload requires authentication', async ({ request }) => {
    const response = await request.post('/api/media/upload');
    expect(response.status()).toBe(401);
  });
});

