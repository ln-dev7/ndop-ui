import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { open } from './support/open';

/** Every block in the registry, with its gallery category. */
const BLOCKS = (
  JSON.parse(
    readFileSync(join(__dirname, '../../../registry/registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string; categories?: string[] }[] }
).items
  .filter((item) => item.type === 'registry:block')
  .map((item) => ({ name: item.name, category: item.categories?.[0] ?? '' }));

test('the gallery lists every block and filters by category', async ({
  page,
}) => {
  await open(page, '/blocks');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blocks');
  await expect(page.locator('iframe')).toHaveCount(BLOCKS.length);

  const auth = BLOCKS.filter((block) => block.category === 'auth');
  await page
    .getByRole('navigation', { name: 'Block categories' })
    .getByRole('link', { name: 'Authentication' })
    .click();
  await expect(page).toHaveURL(/\/blocks\/auth$/);
  await expect(page.locator('iframe')).toHaveCount(auth.length);
  await expect(
    page.getByRole('link', { name: 'Authentication', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
});

test('a block card previews the block, switches width and shows its code', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/blocks/login-01');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Login 01');

  const frame = page.frameLocator('iframe[title="Login 01 preview"]');
  await expect(frame.getByRole('main')).toBeVisible();
  await expect(frame.locator('docs-site-header')).toHaveCount(0);

  const iframe = page.locator('iframe[title="Login 01 preview"]');
  await page.getByRole('button', { name: 'Mobile' }).click();
  await expect(page.getByRole('button', { name: 'Mobile' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(async () => (await iframe.boundingBox())?.width).toBe(375);

  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByRole('tab', { name: 'Code' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('tabpanel').getByText('src/app/blocks/login-01/login-01.ts'),
  ).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeFocused();
});

for (const block of BLOCKS) {
  test(`the ${block.name} preview renders alone and hydrates without errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await open(page, `/blocks/${block.name}/preview`);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.locator('docs-site-header')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    );
    expect(errors).toEqual([]);
  });
}

test('llms.txt and the twins list the blocks', async ({ request }) => {
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toContain('## Blocks');
  expect(llms).toContain('/blocks/login-01.md');
  const twin = await (await request.get('/blocks/login-01.md')).text();
  expect(twin).toContain('npx ndop add login-01');
  expect(twin).toContain('src/app/blocks/login-01/login-01.ts');
});

test("a preview grows to the block's height and its links stay put", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/blocks/settings-01');
  const iframe = page.locator('iframe[title="Settings 01 preview"]');
  const frame = page.frameLocator('iframe[title="Settings 01 preview"]');
  await expect(frame.getByRole('main')).toBeVisible();

  // Taller than the viewport it fills, so the frame never scrolls itself.
  await expect
    .poll(() =>
      iframe.evaluate((element: HTMLIFrameElement) => {
        const root = element.contentDocument?.documentElement;
        return root ? root.scrollHeight - root.clientHeight : -1;
      }),
    )
    .toBe(0);

  await frame.getByRole('link', { name: 'Account' }).click();
  await expect(frame.locator('docs-site-header')).toHaveCount(0);
  expect(
    await iframe.evaluate(
      (element: HTMLIFrameElement) => element.contentWindow?.location.pathname,
    ),
  ).toBe('/blocks/settings-01/preview');
});
