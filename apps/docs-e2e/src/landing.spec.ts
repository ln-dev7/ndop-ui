import { expect, test, type Locator } from '@playwright/test';
import { open } from './support/open';

/**
 * A custom property's value on an element.
 *
 * @param element - The element.
 * @param name - The property, such as `--primary`.
 * @returns Its computed value.
 */
function cssVar(element: Locator, name: string): Promise<string> {
  return element.evaluate(
    (node, property) =>
      getComputedStyle(node).getPropertyValue(property).trim(),
    name,
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('the hero links to the guides and the components', async ({ page }) => {
  await open(page, '/');
  const main = page.getByRole('main');
  await expect(
    main.getByRole('link', { name: 'Get started' }).first(),
  ).toHaveAttribute('href', '/docs/getting-started/introduction');
  await expect(
    main.getByRole('link', { name: 'Browse components' }),
  ).toHaveAttribute('href', /^\/docs\/components\/[a-z-]+$/);
  await expect(
    main.getByRole('button', { name: 'Copy npx ndop init' }).first(),
  ).toBeVisible();
});

test('the theme picker restyles the showcase alone, by keyboard', async ({
  page,
}) => {
  await open(page, '/');
  const showcase = page.getByTestId('showcase');
  const picker = page.getByRole('radiogroup', { name: 'Theme' });
  const site = await cssVar(page.locator('html'), '--primary');
  const initial = picker.getByRole('radio', { name: 'Default' });
  await expect(initial).toHaveAttribute('aria-checked', 'true');
  const before = await cssVar(showcase, '--primary');

  await initial.focus();
  await page.keyboard.press('ArrowRight');

  const next = picker.getByRole('radio', { checked: true });
  await expect(next).not.toHaveAccessibleName('Default');
  await expect(next).toBeFocused();
  await expect(showcase).toHaveAttribute(
    'data-theme',
    (await next.getAttribute('aria-label'))?.toLowerCase() ?? '',
  );
  await expect.poll(() => cssVar(showcase, '--primary')).not.toBe(before);
  expect(await cssVar(page.locator('html'), '--primary')).toBe(site);
});

test('the showcase works by keyboard without leaving the page', async ({
  page,
}) => {
  await open(page, '/');
  const showcase = page.getByTestId('showcase');
  await showcase.scrollIntoViewIfNeeded();
  const tabs = showcase.getByRole('tablist', { name: 'Metric' });
  await tabs.getByRole('tab', { name: 'Visitors' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Sign-ups' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const mentions = showcase.getByRole('switch', { name: 'Mentions' });
  await mentions.click();
  await expect(mentions).toHaveAttribute('aria-checked', 'false');
  await expect(page).toHaveURL(/\/$/);
});

test('the update demo shows the merged file, without motion too', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/');
  const steps = page.getByRole('tablist', { name: 'Update steps' });
  await steps.scrollIntoViewIfNeeded();
  await expect(steps.getByRole('tab', { name: /Merged/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const merged = page.getByRole('tabpanel', { name: /Merged/ });
  await expect(merged).toContainText("xl: 'h-12 px-8 text-base'");
  await expect(merged).toContainText("xs: 'h-7 px-2 text-xs'");
  await steps.getByRole('tab', { name: /Your edit/ }).click();
  await expect(page.getByRole('tabpanel', { name: /Your edit/ })).toBeVisible();
});

test('the update demo plays its steps and ends merged', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, '/');
  const steps = page.getByRole('tablist', { name: 'Update steps' });
  await steps.scrollIntoViewIfNeeded();
  await expect(
    steps.getByRole('tab', { name: /Upstream fix/ }),
  ).toHaveAttribute('aria-selected', 'true', { timeout: 6000 });
  await expect(steps.getByRole('tab', { name: /Merged/ })).toHaveAttribute(
    'aria-selected',
    'true',
    { timeout: 6000 },
  );
});

test('the keyboard table marks the keys pressed on live tabs', async ({
  page,
}) => {
  await open(page, '/');
  const tabs = page.getByRole('tablist', { name: 'Project' });
  await tabs.scrollIntoViewIfNeeded();
  const toggle = page.getByRole('button', { name: 'Try the keyboard' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await tabs.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Activity' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Activity' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('kbd[data-active]')).toHaveText('ArrowRight');
});

test('block thumbnails load and link to their blocks', async ({ page }) => {
  await open(page, '/');
  const blocks = page.getByRole('region', {
    name: 'Start from a whole screen.',
  });
  const first = blocks.getByRole('link').first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute('href', /^\/blocks\/[a-z0-9-]+$/);
  await expect
    .poll(() =>
      first
        .locator('img:visible')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
});
