import { expect, test } from '@playwright/test';
import { open } from './support/open';

test('⌘K finds a prop and opens its API reference', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, '/docs/getting-started/introduction');
  await page.keyboard.press('ControlOrMeta+k');
  const combobox = page.getByRole('combobox', { name: 'Search the docs' });
  await expect(combobox).toBeFocused();
  await combobox.fill('closeonesc');
  const listbox = page.getByRole('listbox', { name: 'Results' });
  await expect(listbox.getByRole('option').first()).toContainText(
    'closeOnEscape',
  );
  await expect(combobox).toHaveAttribute(
    'aria-activedescendant',
    (await listbox.getByRole('option').first().getAttribute('id')) ?? '',
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/components\/dialog#api-NdDialog$/);
  await expect(combobox).toHaveCount(0);
});

test('arrow keys move the highlight while focus stays in the field', async ({
  page,
}) => {
  await open(page, '/docs/getting-started/introduction');
  await page.getByRole('button', { name: 'Search the docs' }).click();
  const combobox = page.getByRole('combobox', { name: 'Search the docs' });
  await combobox.fill('escape');
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(combobox).toBeFocused();
  await expect(combobox).toHaveAttribute(
    'aria-activedescendant',
    (await options.nth(1).getAttribute('id')) ?? '',
  );
});

test('the palette runs actions', async ({ page }) => {
  await open(page, '/docs/getting-started/introduction');
  await page.getByRole('button', { name: 'Search the docs' }).click();
  await page.getByRole('combobox').fill('toggle dark');
  await page.getByRole('option', { name: /Toggle dark theme/ }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});

test('Escape closes the palette and returns focus to its button', async ({
  page,
}) => {
  await open(page, '/docs/getting-started/introduction');
  const button = page.getByRole('button', { name: 'Search the docs' });
  // From the keyboard: WebKit doesn't focus a button on click, so after a
  // click there would be no focus to return.
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(button).toBeFocused();
});
