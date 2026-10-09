import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function newsletter(page: Page) {
  await gotoHydrated(page, '/primitives/checkbox');
  const box = page.getByRole('checkbox', { name: 'Newsletter' });
  await box.focus();
  return box;
}

keyboardContract('checkbox', {
  Space: async ({ page }) => {
    const box = await newsletter(page);
    await page.keyboard.press('Space');
    await expect(box).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Newsletter: yes')).toBeVisible();
    await expect(box).toBeFocused();
    const all = page.getByRole('checkbox', { name: 'Select all' });
    await expect(all).toHaveAttribute('aria-checked', 'mixed');
    await all.focus();
    await page.keyboard.press('Space');
    await expect(all).toHaveAttribute('aria-checked', 'true');
  },
  Enter: async ({ page }) => {
    const box = await newsletter(page);
    await page.keyboard.press('Enter');
    await expect(box).toHaveAttribute('aria-checked', 'false');
  },
});

test.describe('Checkbox', () => {
  test('its label toggles it', async ({ page }) => {
    await gotoHydrated(page, '/primitives/checkbox');
    await page.getByText('Newsletter', { exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Newsletter' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('a disabled checkbox stays as it is', async ({ page }) => {
    await gotoHydrated(page, '/primitives/checkbox');
    const locked = page.getByRole('checkbox', { name: 'Locked' });
    await expect(locked).toBeDisabled();
    await expect(locked).toHaveAttribute('aria-checked', 'true');
  });

  test('a required field shows its error once touched, and is described by it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/checkbox');
    const terms = page.getByRole('checkbox', { name: 'Accept the terms' });
    const error = page.getByText('Accept the terms to continue.');
    await expect(error).toBeHidden();
    await terms.focus();
    await terms.blur();
    await expect(terms).toHaveAttribute('aria-invalid', 'true');
    await expect(error).toBeVisible();
    await expect(terms).toHaveAccessibleDescription(
      'Required to create an account. Accept the terms to continue.',
    );
    await terms.click();
    await expect(error).toBeHidden();
  });
});
