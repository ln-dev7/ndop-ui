import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const day = (page: Page, label: string) =>
  page.locator(`button[aria-label$="${label}"]:not([data-outside])`);

async function focusChosen(page: Page) {
  await gotoHydrated(page, '/primitives/calendar');
  await day(page, 'October 14, 2026').focus();
}

keyboardContract('calendar', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari moves Tab only between fields');
    await gotoHydrated(page, '/primitives/calendar');
    await page.getByRole('button', { name: 'Next month' }).focus();
    await page.keyboard.press('Tab');
    await expect(day(page, 'October 14, 2026')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Next', exact: true }),
    ).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowRight');
    await expect(day(page, 'October 15, 2026')).toBeFocused();
  },
  ArrowLeft: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowLeft');
    await expect(day(page, 'October 13, 2026')).toBeFocused();
  },
  ArrowDown: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowDown');
    await expect(day(page, 'October 21, 2026')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowUp');
    await expect(day(page, 'October 7, 2026')).toBeFocused();
  },
  Home: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('Home');
    await expect(day(page, 'October 12, 2026')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('End');
    await expect(day(page, 'October 18, 2026')).toBeFocused();
  },
  PageDown: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('PageDown');
    await expect(
      page.getByRole('grid', { name: 'November 2026' }),
    ).toBeVisible();
    await expect(day(page, 'November 14, 2026')).toBeFocused();
  },
  PageUp: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('PageUp');
    await expect(day(page, 'September 14, 2026')).toBeFocused();
  },
  'Shift+PageDown': async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('Shift+PageDown');
    await expect(day(page, 'October 14, 2027')).toBeFocused();
  },
  'Shift+PageUp': async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('Shift+PageUp');
    await expect(day(page, 'October 14, 2025')).toBeFocused();
  },
  Enter: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('value')).toHaveText('Thu Oct 15 2026');
  },
  Space: async ({ page }) => {
    await focusChosen(page);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await expect(page.getByTestId('value')).toHaveText('Tue Oct 13 2026');
  },
});

test.describe('Calendar', () => {
  test('keeps disabled days unchoosable', async ({ page }) => {
    await gotoHydrated(page, '/primitives/calendar');
    await day(page, 'October 18, 2026').click({ force: true });
    await expect(page.getByTestId('value')).toHaveText('Wed Oct 14 2026');
  });

  test('renders the chosen month on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/calendar')).text();
    expect(html).toContain('October 2026');
    expect(html).toContain('aria-label="Wednesday, October 14, 2026"');
  });
});
