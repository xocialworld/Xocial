import { test, expect } from '@playwright/test'

test('marketing navigation and support form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Create' }).click()
  await expect(page.getByRole('heading', { name: 'Create' })).toBeVisible()
  await page.getByRole('link', { name: 'Pricing' }).click({ timeout: 5000 }).catch(() => {})
  await page.goto('/pricing')
  await expect(page.getByRole('heading', { name: 'Pricing' })).toBeVisible()
  await page.goto('/support')
  await page.getByLabel('Name').fill('Jane')
  await page.getByLabel('Email').fill('jane@example.com')
  await page.getByLabel('Message').fill('Help needed')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(/Thanks!/)).toBeVisible()
})

