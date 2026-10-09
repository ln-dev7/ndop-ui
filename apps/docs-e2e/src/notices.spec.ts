import { expect, test } from '@playwright/test';
import { open } from './support/open';

test('every page credits shadcn/ui and links the notices', async ({ page }) => {
  await open(page, '/docs/components/button');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'shadcn/ui' })).toHaveAttribute(
    'href',
    'https://ui.shadcn.com',
  );
  await footer
    .getByRole('link', { name: 'license and third-party notices' })
    .click();
  await expect(page).toHaveURL(/\/r\/LICENSE\.txt$/);
  await expect(page.locator('body')).toContainText('Copyright (c) 2023 shadcn');
});

test('the registry is served with the site', async ({ request }) => {
  const response = await request.get('/r/button.json');
  expect(response.ok()).toBe(true);
  expect(((await response.json()) as { name: string }).name).toBe('button');
  const license = await request.get('/r/LICENSE.txt');
  expect(await license.text()).toContain('Copyright (c) 2026 Valery Melou');
});
