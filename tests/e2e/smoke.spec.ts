import { test, expect } from '@playwright/test';

test.describe('ModelDeck smoke e2e', () => {
  test('workspace route loads with navigation and model selector', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Chat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Models' })).toBeVisible();

    // Model selector in session header should be visible and enabled once models load.
    const modelSelect = page.locator('header select').first();
    await expect(modelSelect).toBeVisible();
  });

  test('settings route exposes local API controls', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expose as API' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Local API' })).toBeVisible();
  });

  test('models route renders model library', async ({ page }) => {
    await page.goto('/models');

    await expect(page.getByRole('heading', { name: 'Model Library' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by model, family, publisher, or tag...')).toBeVisible();
  });
});
