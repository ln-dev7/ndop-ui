import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const option = (page: Page, name: string) =>
  page.getByRole('option', { name: new RegExp(`^${name}`) });

async function focusTrigger(page: Page) {
  await gotoHydrated(page, '/primitives/select');
  const trigger = page.getByRole('combobox', { name: 'Fruit' });
  await trigger.focus();
  return trigger;
}

keyboardContract('select', {
  Enter: async ({ page }) => {
    const trigger = await focusTrigger(page);
    await page.keyboard.press('Enter');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('value')).toHaveText('blueberry');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Blueberry');
  },
  Space: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Space');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('value')).toHaveText('apple');
  },
  ArrowDown: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Blueberry')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowUp');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await expect(option(page, 'Apple')).toBeFocused();
  },
  Home: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('End');
    await expect(option(page, 'Tomato')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(option(page, 'Apple')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('End');
    await expect(option(page, 'Tomato')).toBeFocused();
  },
  a: async ({ page }) => {
    const trigger = await focusTrigger(page);
    await page.keyboard.press('c');
    await expect(trigger).toHaveText('Cherry');
    await expect(page.getByRole('listbox')).toBeHidden();
  },
  Escape: async ({ page }) => {
    const trigger = await focusTrigger(page);
    await page.keyboard.press('Enter');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(trigger).toBeFocused();
  },
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari moves Tab only between fields');
    await focusTrigger(page);
    await page.keyboard.press('Enter');
    await expect(option(page, 'Apple')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();
  },
});

test.describe('Select', () => {
  test('opens below the trigger, at least as wide, and closes on an outside click', async ({
    page,
  }) => {
    const trigger = await focusTrigger(page);
    await trigger.click();
    const listbox = page.getByRole('listbox', { name: 'Fruit' });
    await expect(listbox).toBeVisible();
    const triggerBox = (await trigger.boundingBox())!;
    const listBox = (await listbox.boundingBox())!;
    expect(listBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    expect(listBox.width).toBeGreaterThanOrEqual(triggerBox.width - 1);
    await page.getByRole('heading', { name: 'Select' }).click();
    await expect(listbox).toBeHidden();
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await focusTrigger(page);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    // `region` (best practice, not WCAG): overlays sit at the end of <body>.
    const result = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
