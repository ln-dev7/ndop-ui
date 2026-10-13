import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { open } from './support/open';

/** Every theme in the registry. */
const THEMES = (
  JSON.parse(
    readFileSync(join(__dirname, '../../../registry/registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string; title: string }[] }
).items.filter((item) => item.type === 'registry:theme');

/**
 * A custom property's value on the site's root element.
 *
 * @param page - The page.
 * @param name - The property, such as `--primary`.
 * @returns Its computed value.
 */
function rootVar(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (property) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(property)
        .trim(),
    name,
  );
}

/**
 * Types a color into a token's hex field and commits it.
 *
 * @param page - The studio.
 * @param token - The token.
 * @param hex - The color.
 */
async function setHex(page: Page, token: string, hex: string): Promise<void> {
  const field = page.getByRole('textbox', {
    name: `${token} hex`,
    exact: true,
  });
  await field.fill(hex);
  await field.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
});

test('the gallery shows every theme in light and dark', async ({ page }) => {
  await open(page, '/themes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Themes');
  await expect(page.locator('main article')).toHaveCount(THEMES.length);
  for (const theme of THEMES) {
    const card = page.locator(`article#${theme.name}`);
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(
      theme.title,
    );
    await expect(card.locator('docs-theme-sample')).toHaveCount(2);
    await expect(
      card.locator('docs-theme-sample[data-mode="dark"]'),
    ).toHaveClass(/\bdark\b/);
    await expect(card).toContainText(`npx ndop add ${theme.name}`);
    await expect(
      card.getByRole('link', { name: /in the studio/ }),
    ).toHaveAttribute('href', `/themes/studio?from=${theme.name}`);
  }
});

test('the header and the palette lead to the themes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, '/');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Themes' })
    .click();
  await expect(page).toHaveURL(/\/themes$/);
  await page.getByRole('button', { name: 'Search the docs' }).click();
  await page.getByRole('combobox').fill('theme studio');
  await page.getByRole('option', { name: /Open theme studio/ }).click();
  await expect(page).toHaveURL(/\/themes\/studio$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Theme studio',
  );
});

test('an edit applies to the site and the dashboard, and the URL keeps it', async ({
  page,
}) => {
  await open(page, '/themes');
  const site = await rootVar(page, '--primary');
  await open(page, '/themes/studio');
  const before = await rootVar(page, '--primary');
  await setHex(page, 'primary', '#2563eb');

  await expect.poll(() => rootVar(page, '--primary')).not.toBe(before);
  const after = await rootVar(page, '--primary');
  expect(after).toMatch(/^oklch\(/);
  const frame = page.locator('iframe[title="Sample dashboard in your theme"]');
  await expect
    .poll(() =>
      frame.evaluate((element: HTMLIFrameElement) =>
        element.contentWindow
          ? element.contentWindow
              .getComputedStyle(element.contentWindow.document.documentElement)
              .getPropertyValue('--primary')
              .trim()
          : '',
      ),
    )
    .toBe(after);

  await expect
    .poll(() => new URL(page.url()).searchParams.get('t'))
    .toBeTruthy();
  await open(page, page.url());
  await expect(
    page.getByRole('textbox', { name: 'primary hex', exact: true }),
  ).toHaveValue('#2563eb');
  await expect.poll(() => rootVar(page, '--primary')).toBe(after);

  // Leaving the studio restores the site's own theme.
  await page.getByRole('link', { name: 'Themes', exact: true }).first().click();
  await expect(page).toHaveURL(/\/themes$/);
  await expect(page.locator('#ndop-studio-theme')).toHaveCount(0);
  await expect.poll(() => rootVar(page, '--primary')).toBe(site);
});

test('a gallery theme opens in the studio', async ({ page }) => {
  const last = THEMES.at(-1);
  test.skip(!last, 'no themes');
  await open(page, `/themes/studio?from=${last?.name}`);
  await expect(page.getByLabel('Start from')).toHaveValue(last?.name ?? '');
});

test('a pair under its minimum contrast is flagged', async ({ page }) => {
  await open(page, '/themes/studio');
  const pair = page.locator('[data-pair="foreground:background"]');
  await expect(pair).toHaveAttribute('data-ok', 'true');
  const background = await page
    .getByRole('textbox', { name: 'background hex', exact: true })
    .inputValue();
  await setHex(page, 'foreground', background);
  await expect(pair).toHaveAttribute('data-ok', 'false');
  await expect(pair).toContainText('Needs 4.5:1');
  await expect(pair).toContainText('1.00:1');
});

test('the studio passes axe and logs nothing in both modes', async ({
  page,
}) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error}`));
  for (const mode of ['Light', 'Dark']) {
    await open(page, '/themes/studio');
    await page
      .getByRole('group', { name: 'Mode' })
      .getByRole('button', { name: mode })
      .click();
    await expect(page.locator('html')).toHaveClass(
      mode === 'Dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/,
    );
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    // Switching modes fades the colors; axe would measure them halfway.
    // An animation the switch cancels rejects instead of finishing, and is
    // just as done.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.map((violation) => `${mode} ${violation.id}`),
    ).toEqual([]);
  }
  expect(problems).toEqual([]);
});

test('the gallery passes axe in both schemes', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await open(page, '/themes');
    await expect(page.getByRole('main')).toHaveCount(1);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.map((violation) => `${colorScheme} ${violation.id}`),
    ).toEqual([]);
  }
});

test('the exports hold the theme, and its URL installs it', async ({
  page,
  request,
}) => {
  await open(page, '/themes/studio');
  await setHex(page, 'primary', '#2563eb');
  // #2563eb in OKLCH.
  await expect.poll(() => rootVar(page, '--primary')).toMatch(/^oklch\(0\.54/);
  const primary = await rootVar(page, '--primary');

  await expect(page.locator('pre[data-export="css"]')).toContainText(
    `--primary: ${primary};`,
  );
  await expect(page.locator('pre[data-export="css"]')).toContainText('.dark {');
  await expect(page.locator('pre[data-export="json"]')).toContainText(
    '"colorSpace": "oklch"',
  );
  const url = await page
    .getByRole('textbox', { name: 'Theme URL' })
    .inputValue();
  expect(url).toMatch(/\/r\/themes\/custom\.json\?t=[\w-]+$/);
  await expect(page.getByRole('textbox', { name: 'CLI command' })).toHaveValue(
    `npx ndop add "${url}"`,
  );

  const response = await request.get(url);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/json');
  expect(response.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
  const item = (await response.json()) as {
    type: string;
    cssVars: { light: Record<string, string> };
  };
  expect(item.type).toBe('registry:theme');
  expect(item.cssVars.light['primary']).toBe(primary);

  const bad = await request.get('/r/themes/custom.json?t=not-a-theme');
  expect(bad.status()).toBe(400);
  expect(await bad.text()).not.toBe('');
});
