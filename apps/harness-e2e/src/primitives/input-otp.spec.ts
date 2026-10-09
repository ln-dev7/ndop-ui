import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('input-otp', {
  Backspace: async ({ page }) => {
    await gotoHydrated(page, '/primitives/input-otp');
    const input = page.getByRole('textbox', { name: 'Verification code' });
    await input.pressSequentially('123');
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('12');
    await expect(page.getByText('Code: 12', { exact: true })).toBeVisible();
  },
});

test.describe('Input OTP', () => {
  test('typing keeps digits, fills slots and completes the code', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/input-otp');
    const input = page.getByRole('textbox', { name: 'Verification code' });
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await input.pressSequentially('12a3456');
    await expect(input).toHaveValue('123456');
    await expect(page.locator('[ndInputOtpSlot]').nth(2)).toHaveText('3');
    await expect(page.getByText('Completed: 123456')).toBeVisible();
  });

  test('clicking a slot focuses the input', async ({ page }) => {
    await gotoHydrated(page, '/primitives/input-otp');
    // The transparent input covers the slots, so the click lands on it.
    const box = await page.locator('[ndInputOtpSlot]').nth(4).boundingBox();
    if (!box) throw new Error('The slot has no box.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(
      page.getByRole('textbox', { name: 'Verification code' }),
    ).toBeFocused();
    await expect(page.locator('[ndInputOtpSlot]').first()).toHaveAttribute(
      'data-caret',
      '',
    );
  });
});
