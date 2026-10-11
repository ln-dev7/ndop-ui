import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

async function focusDocs(page: Page) {
  await gotoHydrated(page, '/primitives/navigation-menu');
  await button(page, 'Docs').focus();
}

keyboardContract('navigation-menu', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab');
    await focusDocs(page);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('link', { name: 'Installation' }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Installation' }),
    ).toBeFocused();
  },
  Enter: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('Enter');
    await expect(button(page, 'Docs')).toHaveAttribute('aria-expanded', 'true');
    await expect(button(page, 'Docs')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(button(page, 'Docs')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
  Space: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('link', { name: 'Installation' }),
    ).toBeVisible();
  },
  ArrowDown: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('link', { name: 'Installation' }),
    ).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('ArrowRight');
    await expect(button(page, 'Components')).toBeFocused();
  },
  ArrowLeft: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('link', { name: 'Blog' })).toBeFocused();
  },
  Home: async ({ page }) => {
    await gotoHydrated(page, '/primitives/navigation-menu');
    await page.getByRole('link', { name: 'Blog' }).focus();
    await page.keyboard.press('Home');
    await expect(button(page, 'Docs')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('End');
    await expect(page.getByRole('link', { name: 'Blog' })).toBeFocused();
  },
  Escape: async ({ page }) => {
    await focusDocs(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Installation' })).toBeHidden();
    await expect(button(page, 'Docs')).toBeFocused();
  },
});

test.describe('Navigation Menu', () => {
  test('opens on hover and closes on an outside click', async ({ page }) => {
    await gotoHydrated(page, '/primitives/navigation-menu');
    await button(page, 'Components').hover();
    await expect(page.getByRole('link', { name: 'Dialog' })).toBeVisible();
    await page.getByRole('heading', { name: 'Navigation Menu' }).click();
    await expect(page.getByRole('link', { name: 'Dialog' })).toBeHidden();
  });

  test('renders every link on the server', async ({ request }) => {
    const html = await (
      await request.get('/primitives/navigation-menu')
    ).text();
    expect(html).toContain('href="#theming"');
    expect(html).toContain('aria-current="page"');
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await focusDocs(page);
    await page.keyboard.press('Enter');
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
