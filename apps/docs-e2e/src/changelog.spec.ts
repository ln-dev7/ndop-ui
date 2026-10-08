import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { open } from './support/open';

/** Button as first released, from the registry's committed snapshot. */
const BUTTON_0_1_0 =
  (
    JSON.parse(
      readFileSync(
        join(__dirname, '../../../registry/snapshots/button@0.1.0.json'),
        'utf-8',
      ),
    ) as { files: { content: string }[] }
  ).files[0]?.content ?? '';

test('a component page links its changelog', async ({ page }) => {
  await open(page, '/docs/components/button');
  await page.getByRole('link', { name: /^Changelog/ }).click();
  await expect(page).toHaveURL(/\/docs\/components\/button\/changelog$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Button changelog' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /^0\.1\.0/ }),
  ).toBeVisible();
});

test('the update preview merges an edited file in the browser', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await open(page, '/docs/components/button/changelog');
  await page.getByLabel('Version you installed').selectOption('0.1.0');
  await page
    .getByLabel(/Your copy of/)
    .fill(
      BUTTON_0_1_0.replace(
        "'border bg-background shadow-xs hover:bg-accent",
        "'border-2 bg-background shadow-xs hover:bg-accent",
      ),
    );
  await page.getByRole('button', { name: /Preview the update/ }).click();
  await expect(
    page.getByText("Upstream's changes merge cleanly with your edits."),
  ).toBeVisible();
  const merged = page
    .getByRole('region', { name: 'Your file after the update' })
    .or(page.getByLabel('Your file after the update'));
  await expect(merged).toContainText("'border-2 bg-background shadow-xs");
  await expect(merged).not.toContainText('Styles from shadcn/ui');
  expect(errors).toEqual([]);
});

test("the changelog's Markdown twin has its diffs", async ({ request }) => {
  const twin = await request.get('/docs/components/dialog/changelog.md');
  expect(twin.status()).toBe(200);
  expect(await twin.text()).toContain('```diff');
});
