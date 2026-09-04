import { expect, test } from '@playwright/test';

test('unauthenticated user is routed to officer login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Officer sign in' })).toBeVisible();
  await expect(page.getByText('Members do not need accounts.')).toBeVisible();
});
