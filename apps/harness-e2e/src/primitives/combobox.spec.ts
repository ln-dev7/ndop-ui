import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function focusField(page: Page, name = 'Framework') {
  await gotoHydrated(page, '/primitives/combobox');
  const field = page.getByRole('combobox', { name });
  await field.focus();
  return field;
}

const highlighted = (page: Page) => page.locator('[data-highlighted]');

keyboardContract('combobox', {
  a: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('an');
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { name: /^Angular/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Svelte/ })).toBeHidden();
  },
  ArrowDown: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.press('ArrowDown');
    await expect(highlighted(page)).toHaveText(/Angular/);
    await page.keyboard.press('ArrowDown');
    await expect(highlighted(page)).toHaveText(/Analog/);
    await expect(field).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusField(page);
    await page.keyboard.press('ArrowUp');
    await expect(highlighted(page)).toHaveText(/Solid/);
  },
  'Alt+ArrowDown': async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.press('Alt+ArrowDown');
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    await expect(highlighted(page)).toHaveCount(0);
  },
  Enter: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(field).toHaveValue('Angular');
    await expect(page.getByTestId('value')).toHaveText('angular');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
  },
  Escape: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('sv');
    await expect(page.getByRole('option', { name: /^Svelte/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(field).toHaveValue('sv');
    await page.keyboard.press('Escape');
    await expect(field).toHaveValue('');
  },
  Backspace: async ({ page }) => {
    const field = await focusField(page, 'Stack');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('values')).toHaveText('angular');
    await expect(field).toHaveValue('');
    await page.keyboard.press('Backspace');
    await expect(page.getByTestId('values')).toHaveText('');
  },
  Home: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('vue');
    // The key is the text field's own: the list doesn't move, and the
    // field keeps focus and its text.
    await page.keyboard.press('Home');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('vue');
    await expect(field).not.toHaveAttribute('aria-activedescendant');
  },
  End: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.type('vue');
    // The key is the text field's own: the list doesn't move, and the
    // field keeps focus and its text.
    await page.keyboard.press('End');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('vue');
    await expect(field).not.toHaveAttribute('aria-activedescendant');
  },
  Tab: async ({ page }) => {
    const field = await focusField(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('combobox', { name: 'Stack' })).toBeFocused();
  },
});

test.describe('Combobox', () => {
  test('keeps focus in the field when an option is clicked', async ({
    page,
  }) => {
    const field = await focusField(page);
    await page.keyboard.type('sol');
    await page.getByRole('option', { name: /^Solid/ }).click();
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Solid');
  });

  test('passes axe while open, with chips', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await focusField(page, 'Stack');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('values')).toHaveText('angular');
    // `region` (best practice, not WCAG): overlays sit at the end of <body>.
    const result = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
