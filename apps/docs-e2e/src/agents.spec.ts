import { expect, test } from '@playwright/test';
import { open } from './support/open';

test('llms.txt links a Markdown twin of every page', async ({ request }) => {
  const index = await request.get('/llms.txt');
  expect(index.headers()['content-type']).toContain('text/plain');
  const links = [
    ...(await index.text()).matchAll(/\]\(https:\/\/ndop\.dev(\/[^)]+\.md)\)/g),
  ].map((match) => match[1] ?? '');
  expect(links).toContain('/docs/components/dialog.md');
  expect(links).toContain('/docs/getting-started/installation.md');
  for (const link of links) {
    const twin = await request.get(link);
    expect(twin.status(), link).toBe(200);
    expect(twin.headers()['content-type'], link).toContain('text/markdown');
    expect(await twin.text(), link).toMatch(/^# \S/);
  }
  // Blocks are mostly code, so llms-full.txt leaves them out (ADR-0022).
  const full = await (await request.get('/llms-full.txt')).text();
  expect(full.match(/^# /gm)?.length).toBe(
    links.filter((link) => !link.startsWith('/blocks/')).length,
  );
});

test('a page links Claude and ChatGPT to its Markdown twin', async ({
  page,
}) => {
  await open(page, '/docs/components/dialog');
  await page.getByRole('button', { name: 'More page actions' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Open in ChatGPT' }),
  ).toHaveAttribute('href', /^https:\/\/chatgpt\.com\/\?q=/);
  await expect(
    page.getByRole('menuitem', { name: 'Open in Claude' }),
  ).toHaveAttribute(
    'href',
    new RegExp(
      `^https://claude\\.ai/new\\?q=.*${encodeURIComponent(
        'https://ndop.dev/docs/components/dialog.md',
      ).replace(/[.]/g, '\\.')}`,
    ),
  );
});

test('"Copy page" copies the Markdown twin', async ({ page }) => {
  // Records what the page writes, since browsers don't let every test
  // read the system clipboard.
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.assign(window, { copied });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: async (items: ClipboardItem[]) => {
          for (const item of items) {
            copied.push(await (await item.getType('text/plain')).text());
          }
        },
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
  });
  await open(page, '/docs/getting-started/theming');
  await page.getByRole('button', { name: 'Copy page', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { copied: string[] }).copied.join(''),
      ),
    )
    .toMatch(/^# Theming\n\n> /);
});

test('the page menu follows the WAI-ARIA menu button pattern', async ({
  page,
}) => {
  await open(page, '/docs/components/dialog');
  const trigger = page.getByRole('button', { name: 'More page actions' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(
    menu.getByRole('menuitem', { name: 'Open in Claude' }),
  ).toBeFocused();
  await expect(
    menu.getByRole('menuitem', { name: 'View source' }),
  ).toHaveAttribute('href', /github\.com\/ndop-ui\/ui/);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
