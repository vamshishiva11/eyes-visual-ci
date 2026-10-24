import { test } from '@applitools/eyes-playwright/fixture';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('home page - full page', async ({ eyes }) => {
  await eyes.check('Home', { fully: true });
});

test('pricing plans', async ({ page, eyes }) => {
  await eyes.check('Plans grid', { region: page.locator('#plans') });
});

test('signup form - filled', async ({ page, eyes }) => {
  await page.fill('input[name=email]', 'coffee@example.com');
  await page.selectOption('select[name=plan]', 'Regular');
  await eyes.check('Signup filled', { region: page.locator('#signup') });
});

test('mobile layout', async ({ page, eyes }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await eyes.check('Mobile home', { fully: true });
});

test('hero call to action', async ({ page, eyes }) => {
  await eyes.check('Hero', { region: page.locator('.hero') });
});
