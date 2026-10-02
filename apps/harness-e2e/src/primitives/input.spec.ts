import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('input', {});
keyboardContract('label', {});

test.describe('Input and Label', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/primitives/input');
  });

  test('a label names and focuses its input', async ({ page }) => {
    await page.getByText('Email (Signal Forms)').click();
    await expect(page.getByLabel('Email (Signal Forms)')).toBeFocused();
  });

  test('a required field shows invalid only after it is touched', async ({
    page,
  }) => {
    const email = page.getByLabel('Email (Signal Forms)');
    const label = page.locator('label[for="signal-email"]');
    await expect(email).not.toHaveAttribute('aria-invalid');

    await email.focus();
    await email.blur();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(label).toHaveAttribute('data-invalid', '');

    await email.fill('ada@example.com');
    await expect(email).not.toHaveAttribute('aria-invalid');
  });

  test('reactive forms state is reflected the same way', async ({ page }) => {
    const name = page.getByLabel('Name (reactive forms)');
    await name.focus();
    await name.blur();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  test('a disabled input and its label expose data-disabled', async ({
    page,
  }) => {
    await expect(page.getByLabel('Disabled')).toHaveAttribute(
      'data-disabled',
      '',
    );
    await expect(page.locator('label[for="disabled-field"]')).toHaveAttribute(
      'data-disabled',
      '',
    );
  });
});
