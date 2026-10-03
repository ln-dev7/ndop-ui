import { expect, test, type Page } from '@playwright/test';

/**
 * Opens a page and waits until Angular has hydrated it, so clicks reach
 * the app rather than the prerendered markup.
 *
 * @param page - A Playwright page.
 * @param url - Route to open.
 */
async function open(page: Page, url: string): Promise<void> {
  const hydrated = page.waitForEvent('console', (message) =>
    message.text().startsWith('Angular hydrated'),
  );
  await page.goto(url);
  await hydrated;
}

/**
 * Where a heading's top edge is in the viewport.
 *
 * @param page - A Playwright page.
 * @param id - The heading's id.
 * @returns Pixels from the top of the viewport.
 */
async function headingTop(page: Page, id: string): Promise<number> {
  return page
    .locator(`#${id}`)
    .evaluate((element) => element.getBoundingClientRect().top);
}

/**
 * Where the sticky header ends in the viewport.
 *
 * @param page - A Playwright page.
 * @returns Pixels from the top of the viewport.
 */
async function headerBottom(page: Page): Promise<number> {
  return page
    .locator('header')
    .evaluate((element) => element.getBoundingClientRect().bottom);
}

test('a link to a section lands below the header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/docs/getting-started/theming#changing-the-theme');
  await expect
    .poll(
      async () =>
        (await headingTop(page, 'changing-the-theme')) -
        (await headerBottom(page)),
    )
    .toBeGreaterThan(8);
});

test('headings with apostrophes read naturally in the rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/docs/getting-started/introduction');
  await expect(
    page.getByRole('navigation', { name: 'On this page' }).getByRole('link', {
      name: "What it's built on",
    }),
  ).toHaveAttribute(
    'href',
    '/docs/getting-started/introduction#what-its-built-on',
  );
});

test('the home page introduces Ndop UI and links to the guides', async ({
  page,
}) => {
  await open(page, '/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ndop UI');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started\/introduction$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Introduction',
  );
});

test('a guide renders its content, code frames and page links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/docs/getting-started/theming');
  await expect(page).toHaveTitle('Theming · Ndop UI');
  await expect(
    page.getByRole('navigation', { name: 'On this page' }),
  ).toContainText('Where the tokens live');
  await expect(
    page
      .locator('figure.code-frame')
      .first()
      .getByRole('button', { name: 'Copy code' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Docs' })
      .getByRole('link', { name: 'Theming' }),
  ).toHaveAttribute('aria-current', 'page');
  await page
    .getByRole('navigation', { name: 'Pages' })
    .getByRole('link', { name: 'Dark mode' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dark mode');
});

test('the theme and direction are remembered across reloads', async ({
  page,
}) => {
  await open(page, '/docs/getting-started/introduction');
  await page.getByRole('button', { name: /switch theme/ }).click();
  await page.getByRole('button', { name: /switch theme/ }).click();
  await page.getByRole('button', { name: 'Right-to-left' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await open(page, '/docs/getting-started/introduction');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('button', { name: 'Right-to-left' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('command blocks follow the chosen package manager everywhere', async ({
  page,
}) => {
  await open(page, '/docs/getting-started/installation');
  const blocks = page.locator('figure.code-frame-commands');
  await blocks.first().getByRole('tab', { name: 'pnpm' }).click();
  await expect(blocks.nth(1).getByRole('tabpanel')).toHaveText(
    'pnpm dlx ndop init',
  );
  await blocks.first().getByRole('tab', { name: 'pnpm' }).press('ArrowRight');
  await expect(blocks.first().getByRole('tab', { name: 'yarn' })).toBeFocused();

  await open(page, '/docs/getting-started/installation');
  await expect(blocks.nth(2).getByRole('tabpanel')).toHaveText(
    'yarn dlx ndop add dialog',
  );
});

test('guides write numbered steps with :::steps', async ({ page }) => {
  await open(page, '/docs/getting-started/installation');
  const steps = page.locator('ol.steps > li');
  await expect(steps).toHaveCount(4);
  await expect(steps.first().locator('.step-title')).toHaveText(
    'Write ndop.json',
  );
  // Code inside a step is highlighted like any other block.
  await expect(steps.first().locator('figure.code-frame')).toBeVisible();
});
