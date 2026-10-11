import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function focusField(page: Page) {
  await gotoHydrated(page, '/primitives/command');
  const field = page.getByRole('combobox', { name: 'Commands' });
  await field.focus();
  return field;
}

const selected = (page: Page) => page.locator('[data-selected=true]');

keyboardContract('command', {
  ArrowDown: async ({ page }) => {
    const field = await focusField(page);
    await expect(selected(page)).toHaveText(/Calendar/);
    await page.keyboard.press('ArrowDown');
    await expect(selected(page)).toHaveText(/Search emoji/);
    await page.keyboard.press('ArrowDown');
    await expect(selected(page)).toHaveText(/Profile/);
    await expect(field).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusField(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await expect(selected(page)).toHaveText(/Calendar/);
  },
  Home: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('cal');
    const highlighted = await field.getAttribute('aria-activedescendant');
    // The key is the text field's own: the list doesn't move, and the
    // field keeps focus and its text.
    await page.keyboard.press('Home');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('cal');
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      highlighted ?? '',
    );
  },
  End: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('cal');
    const highlighted = await field.getAttribute('aria-activedescendant');
    // The key is the text field's own: the list doesn't move, and the
    // field keeps focus and its text.
    await page.keyboard.press('End');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('cal');
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      highlighted ?? '',
    );
  },
  Enter: async ({ page }) => {
    await focusField(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('last')).toHaveText('Search emoji');
  },
  a: async ({ page }) => {
    await focusField(page);
    await page.keyboard.type('smiley');
    await expect(selected(page)).toHaveText(/Search emoji/);
    await expect(page.getByText('Calendar')).toBeHidden();
    await page.keyboard.type('zz');
    await expect(page.getByText('No results.')).toBeVisible();
  },
});

test.describe('Command', () => {
  test('runs a command on click', async ({ page }) => {
    await focusField(page);
    await page.getByText('Profile').click();
    await expect(page.getByTestId('last')).toHaveText('Profile');
  });
});
